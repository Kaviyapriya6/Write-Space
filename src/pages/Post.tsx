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
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Post not found</h1>
          <p className="text-slate-600 mb-6">The post you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.user_id;
  const readTime = Math.ceil(post.markdown_content.split(/\s+/).length / 200);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">WriteSpace</span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              {isAuthor && (
                <>
                  <Link to={`/edit/${post.id}`}>
                    <Button variant="outline" size="sm" className="border-slate-300">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={deletePost} className="border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              <Link to="/dashboard">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Post Header */}
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-8">
                  {post.cover_image && (
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-80 object-cover rounded-xl mb-8"
                    />
                  )}
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <Link to={`/${author.username}`}>
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={author.avatar_url} />
                          <AvatarFallback className="bg-slate-900 text-white text-lg">
                            {author.display_name?.charAt(0) || author.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link to={`/${author.username}`} className="text-lg font-semibold hover:text-blue-600 transition-colors">
                          {author.display_name || author.username}
                        </Link>
                        <div className="flex items-center space-x-3 text-sm text-slate-600">
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
                            <span>{viewCount} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {post.status === 'draft' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Draft
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                    {post.title}
                  </h1>
                  
                  {post.excerpt && (
                    <p className="text-xl text-slate-600 mb-8 leading-relaxed">{post.excerpt}</p>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {post.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          <Hash className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Engagement Actions */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                    <div className="flex items-center space-x-4">
                      <Button 
                        variant={isLiked ? "default" : "outline"} 
                        size="sm"
                        onClick={toggleLike}
                        className={isLiked ? "bg-red-600 hover:bg-red-700 text-white" : "border-slate-300"}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                        {likeCount}
                      </Button>
                      <Button variant="outline" size="sm" className="border-slate-300">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {comments.length}
                      </Button>
                      <Button 
                        variant={isBookmarked ? "default" : "outline"} 
                        size="sm"
                        onClick={toggleBookmark}
                        className={isBookmarked ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-slate-300"}
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
                        className="border-slate-300"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      
                      {shareDialogOpen && (
                        <Card className="absolute right-0 top-12 w-64 border-0 shadow-xl z-50">
                          <CardContent className="p-4">
                            <div className="space-y-3">
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
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Post Content */}
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-8">
                  <article className="prose prose-slate max-w-none prose-lg">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                        blockquote({ children }) {
                          return (
                            <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-6 rounded-r-lg">
                              {children}
                            </blockquote>
                          );
                        },
                        table({ children }) {
                          return (
                            <div className="overflow-x-auto my-6">
                              <table className="w-full border-collapse border border-slate-300">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({ children }) {
                          return (
                            <th className="border border-slate-300 bg-slate-50 px-4 py-2 text-left font-semibold">
                              {children}
                            </th>
                          );
                        },
                        td({ children }) {
                          return (
                            <td className="border border-slate-300 px-4 py-2">
                              {children}
                            </td>
                          );
                        }
                      }}
                    >
                      {post.markdown_content}
                    </ReactMarkdown>
                  </article>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-2xl">
                      <MessageSquare className="h-6 w-6 mr-3" />
                      Comments ({comments.length})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">Sort by:</span>
                      <Button
                        variant={sortComments === 'newest' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSortComments('newest')}
                        className={sortComments === 'newest' ? 'bg-slate-900 text-white' : ''}
                      >
                        Newest
                      </Button>
                      <Button
                        variant={sortComments === 'oldest' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSortComments('oldest')}
                        className={sortComments === 'oldest' ? 'bg-slate-900 text-white' : ''}
                      >
                        Oldest
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Comment Form */}
                  {currentUser ? (
                    <div className="mb-8 p-6 bg-slate-50 rounded-xl">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={currentUserProfile?.avatar_url} />
                          <AvatarFallback className="bg-slate-900 text-white">
                            {currentUserProfile?.display_name?.charAt(0) || currentUser.email?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-4">
                          {replyingTo && (
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <span className="text-sm text-blue-700">Replying to comment</span>
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
                            className="border-slate-300 resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {newComment.length}/1000 characters
                            </span>
                            <Button 
                              onClick={submitComment}
                              disabled={submittingComment || !newComment.trim() || newComment.length > 1000}
                              className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {submittingComment ? 'Posting...' : 'Post Comment'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 p-6 bg-slate-50 rounded-xl text-center">
                      <MessageCircle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 mb-4">Join the conversation</p>
                      <Link to="/auth">
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                          Sign In to Comment
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Comments List */}
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-l-2 border-slate-100 pl-6">
                        <div className="flex items-start space-x-4">
                          <Link to={`/${comment.profiles.username}`}>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={comment.profiles.avatar_url} />
                              <AvatarFallback className="bg-slate-900 text-white">
                                {comment.profiles.display_name?.charAt(0) || comment.profiles.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Link to={`/${comment.profiles.username}`} className="font-medium hover:text-blue-600 transition-colors">
                                {comment.profiles.display_name || comment.profiles.username}
                              </Link>
                              <span className="text-sm text-slate-500">
                                {format(new Date(comment.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <p className="text-slate-700 mb-3 leading-relaxed">{comment.content}</p>
                            <div className="flex items-center space-x-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setReplyingTo(comment.id)}
                                className="text-slate-500 hover:text-slate-700 h-8 px-3"
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-slate-500 hover:text-slate-700 h-8 px-3"
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
                      <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No comments yet</h3>
                        <p className="text-slate-600">Be the first to share your thoughts!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Author Card */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    About the Author
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Link to={`/${author.username}`}>
                      <Avatar className="h-20 w-20 mx-auto mb-4">
                        <AvatarImage src={author.avatar_url} />
                        <AvatarFallback className="bg-slate-900 text-white text-2xl">
                          {author.display_name?.charAt(0) || author.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <Link to={`/${author.username}`} className="text-xl font-semibold hover:text-blue-600 transition-colors block mb-2">
                      {author.display_name || author.username}
                    </Link>
                    {author.bio && (
                      <p className="text-slate-600 text-sm mb-4">{author.bio}</p>
                    )}
                    <Link to={`/${author.username}`}>
                      <Button variant="outline" size="sm" className="border-slate-300">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Related Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {relatedPosts.map((relatedPost) => (
                        <Link
                          key={relatedPost.id}
                          to={`/${relatedPost.profiles.username}/${relatedPost.slug}`}
                          className="block p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                        >
                          <h4 className="font-medium text-slate-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                            {relatedPost.title}
                          </h4>
                          {relatedPost.excerpt && (
                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {relatedPost.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{relatedPost.profiles.display_name || relatedPost.profiles.username}</span>
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{relatedPost.view_count || 0}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Table of Contents (if post is long) */}
              {post.markdown_content.length > 2000 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Table of Contents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600">
                      <p>Navigate through this post using the headings in the content.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Post;
