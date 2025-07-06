
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Validate API key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    // Verify API key exists and is active
    const { data: keyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('user_id, rate_limit, usage_count, is_active')
      .eq('key_hash', await hashApiKey(apiKey))
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    if (keyData.usage_count >= keyData.rate_limit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: 3600 }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment usage count
    await supabaseClient
      .from('api_keys')
      .update({ 
        usage_count: keyData.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('key_hash', await hashApiKey(apiKey))

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(part => part)
    
    // Remove 'functions', 'v1', 'api-posts' from path
    const apiPath = pathParts.slice(3)
    
    if (apiPath.length === 0) {
      // GET /api/posts - Get all published posts
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const tags = url.searchParams.get('tags')
      const author = url.searchParams.get('author')

      let query = supabaseClient
        .from('posts')
        .select(`
          id, title, slug, excerpt, markdown_content, html_content,
          cover_image, tags, view_count, like_count, created_at, updated_at,
          profiles!posts_user_id_fkey (
            username, display_name, avatar_url, bio
          )
        `)
        .eq('status', 'published')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim())
        query = query.overlaps('tags', tagArray)
      }

      if (author) {
        query = query.eq('profiles.username', author)
      }

      const { data: posts, error, count } = await query

      if (error) throw error

      // Transform data
      const transformedPosts = posts?.map(post => ({
        ...post,
        author: post.profiles
      })).map(({ profiles, ...post }) => post) || []

      return new Response(
        JSON.stringify({
          data: transformedPosts,
          pagination: {
            total: count || 0,
            limit,
            offset,
            has_more: (count || 0) > offset + limit
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': keyData.rate_limit.toString(),
            'X-RateLimit-Remaining': (keyData.rate_limit - keyData.usage_count - 1).toString(),
            'X-RateLimit-Used': (keyData.usage_count + 1).toString()
          } 
        }
      )
    }

    if (apiPath.length === 1) {
      // GET /api/posts/:username - Get posts by author
      const username = apiPath[0]
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
          id, title, slug, excerpt, markdown_content, html_content,
          cover_image, tags, view_count, like_count, created_at, updated_at,
          profiles!posts_user_id_fkey (
            username, display_name, avatar_url, bio
          )
        `)
        .eq('status', 'published')
        .eq('profiles.username', username)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedPosts = posts?.map(post => ({
        ...post,
        author: post.profiles
      })).map(({ profiles, ...post }) => post) || []

      return new Response(
        JSON.stringify({
          data: transformedPosts,
          pagination: {
            total: posts?.length || 0,
            limit,
            offset,
            has_more: (posts?.length || 0) === limit
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': keyData.rate_limit.toString(),
            'X-RateLimit-Remaining': (keyData.rate_limit - keyData.usage_count - 1).toString(),
            'X-RateLimit-Used': (keyData.usage_count + 1).toString()
          } 
        }
      )
    }

    if (apiPath.length === 2) {
      // GET /api/posts/:username/:slug - Get specific post
      const [username, slug] = apiPath

      const { data: post, error } = await supabaseClient
        .from('posts')
        .select(`
          id, title, slug, excerpt, markdown_content, html_content,
          cover_image, tags, view_count, like_count, created_at, updated_at,
          profiles!posts_user_id_fkey (
            username, display_name, avatar_url, bio
          )
        `)
        .eq('status', 'published')
        .eq('profiles.username', username)
        .eq('slug', slug)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Post not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const transformedPost = {
        ...post,
        author: post.profiles
      }
      delete transformedPost.profiles

      return new Response(
        JSON.stringify({ data: transformedPost }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': keyData.rate_limit.toString(),
            'X-RateLimit-Remaining': (keyData.rate_limit - keyData.usage_count - 1).toString(),
            'X-RateLimit-Used': (keyData.usage_count + 1).toString()
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
