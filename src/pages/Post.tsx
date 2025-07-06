import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2, 
  BookOpen,
  ArrowLeft,
  Home,
  User,
  Clock,
  Hash,
  ExternalLink,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  MoreHorizontal,
  Flag,
  Bookmark,
  TrendingUp,
  MessageSquare,
  Send,
  Reply,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const Post = () => {
  const { username, slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sortComments, setSortComments] = useState<'newest' | 'oldest'>('newest');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    };
    getCurrentUser();
  }, []);

  const fetchPost = useCallback(async () => {
    if (!username || !slug) return;

    try {
      // First get the author
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (authorError) throw authorError;
      setAuthor(authorData);

      // Then get the post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, display_name, avatar_url, bio)
        `)
        .eq('user_id', authorData.id)
        .eq('slug', slug)
        .single();

      if (postError) throw postError;
      
      // Check if user can view this post
      if (postData.status !== 'published' && postData.user_id !== currentUser?.id) {
        throw new Error('Post not found');
      }

      setPost(postData);
      setLikeCount(postData.like_count || 0);
      setViewCount(postData.view_count || 0);

      // Check if current user has bookmarked this post
      if (currentUser) {
        // Since post_likes table doesn't exist, set like status to false
        setIsLiked(false);

        // Since bookmarks table doesn't exist, set bookmark status to false
        setIsBookmarked(false);
      }

      // Increment view count (only once per session)
      const viewKey = `viewed_${postData.id}`;
      if (!sessionStorage.getItem(viewKey)) {
        try {
          // Try to increment view count if the RPC function exists
          await supabase.rpc('increment_post_views', {
            post_id: postData.id
          });
          sessionStorage.setItem(viewKey, 'true');
          setViewCount(prev => prev + 1);
        } catch (error) {
          // RPC function might not exist, manually update
          const { error: updateError } = await supabase
            .from('posts')
            .update({ 
              view_count: (postData.view_count || 0) + 1 
            })
            .eq('id', postData.id);
          
          if (!updateError) {
            sessionStorage.setItem(viewKey, 'true');
            setViewCount(prev => prev + 1);
          }
        }
      }

      // Fetch comments
      await fetchComments(postData.id);

      // Fetch related posts
      await fetchRelatedPosts(postData.tags, postData.id, authorData.id);

    } catch (error: any) {
      console.error('Error loading post:', error);
      toast({
        title: "Error loading post",
        description: error.message,
        variant: "destructive",
      });
      navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [username, slug, currentUser, navigate, toast]);

  const fetchComments = async (postId: string) => {
    const orderBy = sortComments === 'newest' ? { ascending: false } : { ascending: true };
    
    try {
      // Simplified comment query without comment_likes relationship
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (username, display_name, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', orderBy);

      if (commentsError) throw commentsError;
      
      // Since comment_likes table doesn't exist, set like count to 0
      const commentsWithLikes = (commentsData || []).map(comment => ({
        ...comment,
        like_count: 0
      }));

      setComments(commentsWithLikes);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const fetchRelatedPosts = async (tags: string[], currentPostId: string, authorId: string) => {
    if (!tags || tags.length === 0) {
      // If no tags, fetch other posts by the same author
      try {
        const { data: authorPosts } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            slug,
            excerpt,
            view_count,
            created_at,
            profiles!posts_user_id_fkey (
              username,
              display_name
            )
          `)
          .eq('status', 'published')
          .eq('user_id', authorId)
          .neq('id', currentPostId)
          .limit(3);

        setRelatedPosts(authorPosts || []);
      } catch (error) {
        console.error('Error fetching author posts:', error);
        setRelatedPosts([]);
      }
      return;
    }

    try {
      const { data: relatedData } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          view_count,
          created_at,
          profiles!posts_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq('status', 'published')
        .neq('id', currentPostId)
        .overlaps('tags', tags)
        .limit(3);

      if (relatedData && relatedData.length > 0) {
        setRelatedPosts(relatedData);
      } else {
        // Fallback to other posts by the same author
        const { data: authorPosts } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            slug,
            excerpt,
            view_count,
            created_at,
            profiles!posts_user_id_fkey (
              username,
              display_name
            )
          `)
          .eq('status', 'published')
          .eq('user_id', authorId)
          .neq('id', currentPostId)
          .limit(3);

        setRelatedPosts(authorPosts || []);
      }
    } catch (error: any) {
      console.error('Error fetching related posts:', error);
      setRelatedPosts([]);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    if (post) {
      fetchComments(post.id);
    }
  }, [sortComments, post]);

  const toggleLike = async () => {
    if (!currentUser || !post) {
      toast({
        title: "Authentication required",
        description: "Please log in to like posts.",
        variant: "destructive",
      });
      return;
    }

    // Since post_likes table doesn't exist, show feature not available message
    toast({
      title: "Feature not available",
      description: "Like functionality is not set up yet.",
      variant: "destructive",
    });
  };

  const toggleBookmark = async () => {
    if (!currentUser || !post) {
      toast({
        title: "Authentication required",
        description: "Please log in to bookmark posts.",
        variant: "destructive",
      });
      return;
    }

    // Since bookmarks table doesn't exist, show feature not available message
    toast({
      title: "Feature not available",
      description: "Bookmark functionality is not set up yet.",
      variant: "destructive",
    });
  };

  const submitComment = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          post_id: post.id,
          content: newComment.trim(),
          parent_id: replyingTo
        });

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });

      // Refresh comments
      await fetchComments(post.id);
    } catch (error: any) {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const deletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Post link has been copied to clipboard.",
    });
    setShareDialogOpen(false);
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post.title);
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank', 'width=600,height=400');
    setShareDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto mb-6"></div>
            <Zap className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Loading amazing content...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Post not found</h1>
            <p className="text-slate-600 mb-8 leading-relaxed">The post you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.user_id;
  const readTime = Math.ceil(post.markdown_content.split(/\s+/).length / 200);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">WriteSpace</span>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {isAuthor && (
                <>
                  <Link to={`/edit/${post.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={deletePost} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <Link to="/dashboard">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Post Header */}
          <div className="mb-12">
            {/* Cover Image */}
            {post.cover_image && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-96 object-cover"
                />
              </div>
            )}
            
            {/* Post Meta */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link to={`/${author.username}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={author.avatar_url} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {author.display_name?.charAt(0) || author.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link to={`/${author.username}`} className="text-lg font-semibold hover:text-blue-600 transition-colors block">
                    {author.display_name || author.username}
                  </Link>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(post.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{readTime} min read</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{viewCount.toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {post.status === 'draft' && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  Draft
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            
            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl">{post.excerpt}</p>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag: string) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement Actions */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div className="flex items-center space-x-3">
                <Button 
                  variant={isLiked ? "default" : "outline"} 
                  size="sm"
                  onClick={toggleLike}
                  className={isLiked ? "bg-red-600 hover:bg-red-700 text-white" : "hover:bg-red-50 hover:text-red-600"}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount.toLocaleString()}
                </Button>
                <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {comments.length}
                </Button>
                <Button 
                  variant={isBookmarked ? "default" : "outline"} 
                  size="sm"
                  onClick={toggleBookmark}
                  className={isBookmarked ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-blue-50 hover:text-blue-600"}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? 'Saved' : 'Save'}
                </Button>
              </div>
              
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShareDialogOpen(!shareDialogOpen)}
                  className="hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                
                {shareDialogOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-lg border shadow-lg z-50 p-4">
                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={copyLink}
                        className="w-full justify-start"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => shareToSocial('twitter')}
                        className="w-full justify-start"
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        Share on Twitter
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => shareToSocial('linkedin')}
                        className="w-full justify-start"
                      >
                        <Linkedin className="h-4 w-4 mr-2" />
                        Share on LinkedIn
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="bg-white rounded-lg border mb-12">
            <div className="p-8 lg:p-12">
              <article className="prose prose-gray prose-lg max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="my-6">
                          <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-lg"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-6 my-8 rounded-r-lg">
                          <div className="text-gray-700">{children}</div>
                        </blockquote>
                      );
                    },
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-gray-900 mt-10 mb-6">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 border-b border-gray-200 pb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 mb-4 pl-6">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-2 mb-4 pl-6">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700 leading-relaxed">
                        {children}
                      </li>
                    ),
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-6 rounded-lg border">
                          <table className="w-full border-collapse bg-white">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="bg-gray-50 px-6 py-4 text-left font-semibold text-gray-900 border-b">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-6 py-4 text-gray-700 border-b border-gray-100">
                          {children}
                        </td>
                      );
                    },
                    img({ src, alt }) {
                      return (
                        <div className="my-6">
                          <img 
                            src={src} 
                            alt={alt}
                            className="w-full rounded-lg"
                          />
                          {alt && (
                            <p className="text-center text-sm text-gray-500 mt-2 italic">
                              {alt}
                            </p>
                          )}
                        </div>
                      );
                    }
                  }}
                >
                  {post.markdown_content}
                </ReactMarkdown>
              </article>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg border">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                  Comments ({comments.length})
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <Button
                    variant={sortComments === 'newest' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSortComments('newest')}
                    className={sortComments === 'newest' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    Newest
                  </Button>
                  <Button
                    variant={sortComments === 'oldest' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSortComments('oldest')}
                    className={sortComments === 'oldest' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    Oldest
                  </Button>
                </div>
              </div>

              {/* Comment Form */}
              {currentUser ? (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={currentUserProfile?.avatar_url} />
                      <AvatarFallback className="bg-gray-600 text-white">
                        {currentUserProfile?.display_name?.charAt(0) || currentUser.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      {replyingTo && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-sm text-blue-700 font-medium">Replying to comment</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setReplyingTo(null)}
                            className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      )}
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {newComment.length}/1000 characters
                        </span>
                        <Button 
                          onClick={submitComment}
                          disabled={submittingComment || !newComment.trim() || newComment.length > 1000}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {submittingComment ? 'Posting...' : 'Post Comment'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-8 bg-gray-50 rounded-lg text-center border">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Join the conversation</h3>
                  <p className="text-gray-600 mb-6">Sign in to share your thoughts and engage with the community</p>
                  <Link to="/auth">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Sign In to Comment
                    </Button>
                  </Link>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-200 pl-6 py-4 bg-gray-50 rounded-r-lg">
                    <div className="flex items-start space-x-4">
                      <Link to={`/${comment.profiles.username}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.profiles.avatar_url} />
                          <AvatarFallback className="bg-gray-600 text-white">
                            {comment.profiles.display_name?.charAt(0) || comment.profiles.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link to={`/${comment.profiles.username}`} className="font-semibold hover:text-blue-600 transition-colors">
                            {comment.profiles.display_name || comment.profiles.username}
                          </Link>
                          <span className="text-sm text-gray-500">
                            {format(new Date(comment.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3 leading-relaxed">{comment.content}</p>
                        <div className="flex items-center space-x-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-gray-500 hover:text-blue-600 h-8 px-3"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-gray-500 hover:text-green-600 h-8 px-3"
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {comment.like_count || 0}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No comments yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto">Be the first to share your thoughts and start the conversation!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
                More from {author.display_name || author.username}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    to={`/${relatedPost.profiles.username}/${relatedPost.slug}`}
                    className="group"
                  >
                    <div className="bg-white rounded-lg border hover:shadow-md transition-shadow duration-200 overflow-hidden">
                      <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {relatedPost.title}
                        </h3>
                        {relatedPost.excerpt && (
                          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                            {relatedPost.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{format(new Date(relatedPost.created_at), 'MMM dd')}</span>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{relatedPost.view_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;
