
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    if (keyData.usage_count >= keyData.rate_limit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: 3600 }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await supabaseClient
      .from('api_keys')
      .update({ 
        usage_count: keyData.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('key_hash', await hashApiKey(apiKey))

    const url = new URL(req.url)
    const popular = url.searchParams.get('popular') === 'true'

    // Get all tags from published posts
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('tags')
      .eq('status', 'published')

    if (error) throw error

    // Flatten and count tags
    const tagCounts: { [key: string]: number } = {}
    posts?.forEach(post => {
      post.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    let tags = Object.entries(tagCounts).map(([name, count]) => ({
      name,
      count
    }))

    // Sort by count descending
    tags.sort((a, b) => b.count - a.count)

    // If popular is true, only return top 20
    if (popular) {
      tags = tags.slice(0, 20)
    }

    return new Response(
      JSON.stringify({ data: tags }),
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
