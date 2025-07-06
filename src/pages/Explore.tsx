import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search,
  Filter,
  TrendingUp,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  BookOpen,
  User,
  Hash,
  Calendar,
  ArrowLeft,
  Sparkles,
  Users,
  Globe,
  Star,
  ChevronDown,
  X,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Bookmark
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [posts, setPosts] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'posts' | 'authors' | 'tags'>('posts');
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    hasMore: true
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };
    getCurrentUser();
  }, []);

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const from = reset ? 0 : (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;

      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          cover_image,
          tags,
          view_count,
          like_count,
          created_at,
          updated_at,
          profiles!posts_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('status', 'published')
        .range(from, to);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,excerpt.ilike.%${debouncedSearch}%`);
      }

      // Apply tag filters
      if (selectedTags.length > 0) {
        query = query.overlaps('tags', selectedTags);
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        case 'trending':
          query = query.order('like_count', { ascending: false });
          break;
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (reset) {
        setPosts(data || []);
        setPagination(prev => ({
          ...prev,
          page: 1,
          total: count || 0,
          hasMore: (count || 0) > pagination.limit
        }));
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
        setPagination(prev => ({
          ...prev,
          total: count || 0,
          hasMore: (from + (data?.length || 0)) < (count || 0)
        }));
      }
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error loading posts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTags, sortBy, pagination.limit, pagination.page, toast]);

  const fetchAuthors = useCallback(async () => {
    try {
      // Get authors with their post counts and latest activity
      const { data: authorsData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          created_at,
          posts!posts_user_id_fkey (
            id,
            status,
            view_count,
            like_count
          )
        `)
        .not('posts', 'is', null);

      if (error) throw error;

      // Process authors data to add stats
      const processedAuthors = (authorsData || [])
        .map(author => {
          const publishedPosts = author.posts?.filter((post: any) => post.status === 'published') || [];
          const totalViews = publishedPosts.reduce((sum: number, post: any) => sum + (post.view_count || 0), 0);
          const totalLikes = publishedPosts.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0);
          
          return {
            ...author,
            posts_count: publishedPosts.length,
            total_views: totalViews,
            total_likes: totalLikes,
            posts: undefined // Remove posts array to clean up data
          };
        })
        .filter(author => author.posts_count > 0) // Only show authors with published posts
        .sort((a, b) => b.total_views - a.total_views)
        .slice(0, 20); // Limit to top 20 authors

      setAuthors(processedAuthors);
    } catch (error: any) {
      console.error('Error fetching authors:', error);
      toast({
        title: "Error loading authors",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTags = useCallback(async () => {
    try {
      // Get all unique tags from published posts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('tags')
        .eq('status', 'published')
        .not('tags', 'is', null);

      if (error) throw error;

      // Extract and count tags
      const tagCounts: Record<string, number> = {};
      postsData?.forEach(post => {
        post.tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Sort tags by usage count and take top 50
      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([tag]) => tag);

      setTags(sortedTags);
    } catch (error: any) {
      console.error('Error fetching tags:', error);
      toast({
        title: "Error loading tags",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts(true);
  }, [debouncedSearch, selectedTags, sortBy]);

  useEffect(() => {
    if (activeTab === 'authors') {
      fetchAuthors();
    } else if (activeTab === 'tags') {
      fetchTags();
    }
  }, [activeTab, fetchAuthors, fetchTags]);

  useEffect(() => {
    // Update URL params when search changes
    if (debouncedSearch) {
      setSearchParams({ search: debouncedSearch });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearch, setSearchParams]);

  const loadMorePosts = () => {
    if (pagination.hasMore && !loading) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
      fetchPosts(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
    setSortBy('newest');
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'newest':
      case 'trending':
        return <SortDesc className="h-4 w-4" />;
      case 'oldest':
        return <SortAsc className="h-4 w-4" />;
      case 'popular':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <SortDesc className="h-4 w-4" />;
    }
  };

  const PostCard = ({ post }: { post: any }) => (
    <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-0">
        {post.cover_image && (
          <div className="relative overflow-hidden">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm">
                <Eye className="h-3 w-3 mr-1" />
                {post.view_count || 0}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Link to={`/${post.profiles.username}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.profiles.avatar_url} />
                <AvatarFallback className="bg-slate-900 text-white text-sm">
                  {post.profiles.display_name?.charAt(0) || post.profiles.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/${post.profiles.username}`} className="text-sm font-medium hover:text-blue-600 transition-colors truncate block">
                {post.profiles.display_name || post.profiles.username}
              </Link>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <Link to={`/${post.profiles.username}/${post.slug}`} className="block group-hover:text-blue-600 transition-colors">
            <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">
              {post.title}
            </h3>
          </Link>
          
          {post.excerpt && (
            <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 3).map((tag: string) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                  +{post.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{post.like_count || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span>0</span>
              </div>
            </div>
            <Link 
              to={`/${post.profiles.username}/${post.slug}`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Read more
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PostListItem = ({ post }: { post: any }) => (
    <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex space-x-6">
          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-3">
              <Link to={`/${post.profiles.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.profiles.avatar_url} />
                  <AvatarFallback className="bg-slate-900 text-white text-sm">
                    {post.profiles.display_name?.charAt(0) || post.profiles.username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link to={`/${post.profiles.username}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
                  {post.profiles.display_name || post.profiles.username}
                </Link>
                <p className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <Link to={`/${post.profiles.username}/${post.slug}`} className="block hover:text-blue-600 transition-colors">
              <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2">
                {post.title}
              </h3>
            </Link>
            
            {post.excerpt && (
              <p className="text-slate-600 mb-3 line-clamp-2">
                {post.excerpt}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.view_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{post.like_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>0</span>
                </div>
              </div>
              
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 2).map((tag: string) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="text-xs border-slate-300 text-slate-600"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-slate-300"></div>
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">WriteSpace</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentUser && (
                <>
                  <Link to="/new">
                    <Button variant="outline" size="sm" className="border-slate-300">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Write
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                      Dashboard
                    </Button>
                  </Link>
                </>
              )}
              {!currentUser && (
                <Link to="/auth">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              Explore <span className="text-blue-600">Stories</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Discover amazing content from our community of writers and thinkers
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search posts, authors, or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 text-lg border-slate-300"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="border-slate-300"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {selectedTags.length > 0 && (
                        <Badge className="ml-2 bg-blue-600 text-white">
                          {selectedTags.length}
                        </Badge>
                      )}
                    </Button>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-600">Sort by:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const sortOptions = ['newest', 'popular', 'trending', 'oldest'] as const;
                          const currentIndex = sortOptions.indexOf(sortBy);
                          const nextIndex = (currentIndex + 1) % sortOptions.length;
                          setSortBy(sortOptions[nextIndex]);
                        }}
                        className="border-slate-300"
                      >
                        {getSortIcon()}
                        <span className="ml-2 capitalize">{sortBy}</span>
                      </Button>
                    </div>

                    {(selectedTags.length > 0 || searchQuery) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-slate-900 text-white' : 'border-slate-300'}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-slate-900 text-white' : 'border-slate-300'}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Tag Filters */}
                {showFilters && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-900">Filter by tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 20).map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                            className={`cursor-pointer transition-colors ${
                              selectedTags.includes(tag) 
                                ? 'bg-slate-900 text-white' 
                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                            onClick={() => toggleTag(tag)}
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger 
                value="posts" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Posts ({pagination.total})
              </TabsTrigger>
              <TabsTrigger 
                value="authors" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                Authors
              </TabsTrigger>
              <TabsTrigger 
                value="tags" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Hash className="h-4 w-4 mr-2" />
                Tags
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-6">
              {loading && posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No posts found</h3>
                  <p className="text-slate-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostListItem key={post.id} post={post} />
                      ))}
                    </div>
                  )}

                  {pagination.hasMore && (
                    <div className="text-center">
                      <Button
                        onClick={loadMorePosts}
                        disabled={loading}
                        variant="outline"
                        size="lg"
                        className="border-slate-300"
                      >
                        {loading ? 'Loading...' : 'Load More Posts'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Authors Tab */}
            <TabsContent value="authors" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authors.map((author) => (
                  <Card key={author.id} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6 text-center">
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
                      
                      <p className="text-slate-600 text-sm mb-4">@{author.username}</p>
                      
                      {author.bio && (
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                          {author.bio}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-slate-900">{author.posts_count}</div>
                          <div className="text-xs text-slate-500">Posts</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-900">{author.total_views.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">Views</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-900">{author.total_likes}</div>
                          <div className="text-xs text-slate-500">Likes</div>
                        </div>
                      </div>
                      
                      <Link to={`/${author.username}`}>
                        <Button variant="outline" size="sm" className="border-slate-300">
                          View Profile
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tags.map((tag) => (
                  <Card key={tag} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <CardContent className="p-6 text-center" onClick={() => {
                      setActiveTab('posts');
                      toggleTag(tag);
                    }}>
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Hash className="h-6 w-6 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">#{tag}</h3>
                      <p className="text-sm text-slate-600">Explore posts</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Explore;
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
