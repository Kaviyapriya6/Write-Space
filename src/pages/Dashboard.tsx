import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BookOpen, 
  Plus, 
  BarChart3, 
  MessageCircle, 
  Key, 
  Settings, 
  LogOut,
  FileText,
  Eye,
  Calendar,
  TrendingUp,
  ExternalLink,
  Edit,
  Trash2,
  Globe,
  Clock,
  ChevronRight,
  Activity,
  Users,
  Zap,
  Home,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalComments: 0,
    apiCalls: 0,
    drafts: 0,
    published: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await Promise.all([
          fetchProfile(session.user.id),
          fetchPosts(session.user.id),
          fetchStats(session.user.id),
          fetchRecentActivity(session.user.id)
        ]);
      } else {
        navigate('/auth');
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          navigate('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      // Fetch posts statistics
      const { data: allPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, view_count, status')
        .eq('user_id', userId);

      if (postsError) throw postsError;

      // Fetch comments count
      const postIds = allPosts?.map(p => p.id) || [];
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .in('post_id', postIds);

      if (commentsError) throw commentsError;

      // Fetch API usage
      const { data: apiKeys, error: apiError } = await supabase
        .from('api_keys')
        .select('usage_count')
        .eq('user_id', userId);

      if (apiError) throw apiError;

      const totalViews = allPosts?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
      const totalComments = comments?.length || 0;
      const apiCalls = apiKeys?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0;
      const drafts = allPosts?.filter(post => post.status === 'draft').length || 0;
      const published = allPosts?.filter(post => post.status === 'published').length || 0;

      setStats({
        totalPosts: allPosts?.length || 0,
        totalViews,
        totalComments,
        apiCalls,
        drafts,
        published
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async (userId: string) => {
    try {
      const { data: recentPosts, error } = await supabase
        .from('posts')
        .select('id, title, created_at, status, view_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      setRecentActivity(recentPosts || []);
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    }
  };

  const deletePost = async (postId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "The post has been deleted successfully.",
      });

      // Refresh data
      await Promise.all([
        fetchPosts(user.id),
        fetchStats(user.id),
        fetchRecentActivity(user.id)
      ]);
    } catch (error: any) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
  const displayName = profile?.display_name || username;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">WriteSpace</span>
              </Link>
              
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className="flex items-center space-x-2 text-slate-900 font-medium">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/dashboard/analytics" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Analytics
                </Link>
                <Link to="/dashboard/api-keys" className="text-slate-600 hover:text-slate-900 transition-colors">
                  API Keys
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/new">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </Link>
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-slate-900 text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-900 hidden sm:block">{displayName}</span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-600 hover:text-slate-900">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Welcome back, {displayName}!
                </h1>
                <p className="text-slate-600 text-lg">
                  Ready to create something amazing today?
                </p>
                <div className="flex items-center space-x-4 mt-4">
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    Member since {format(new Date(user?.created_at), 'MMM yyyy')}
                  </Badge>
                  {profile?.username && (
                    <Link to={`/${profile.username}`} className="text-slate-600 hover:text-slate-900 text-sm flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      View public profile
                    </Link>
                  )}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Activity className="h-12 w-12 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/new">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50">
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="font-semibold text-blue-700">Create New Post</p>
                    <p className="text-sm text-blue-600 mt-1">Start writing</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/analytics">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-white">
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-slate-900">Analytics</p>
                    <p className="text-sm text-slate-600 mt-1">View insights</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/api-keys">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-white">
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <Key className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="font-semibold text-slate-900">API Keys</p>
                    <p className="text-sm text-slate-600 mt-1">Manage access</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/settings">
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-white">
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Settings className="h-6 w-6 text-slate-600" />
                    </div>
                    <p className="font-semibold text-slate-900">Settings</p>
                    <p className="text-sm text-slate-600 mt-1">Preferences</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Published Posts</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.published}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.drafts} drafts in progress
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Views</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Across all posts
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Engagement</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.totalComments}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Comments received
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">API Usage</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stats.apiCalls}</div>
                <p className="text-xs text-slate-500 mt-1">
                  of 1,000 this month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts and Activity */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">Recent Posts</CardTitle>
                      <CardDescription className="mt-1">Your latest published and draft content</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-slate-300">
                      <Link to="/posts">
                        View All
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {posts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No posts yet</h3>
                      <p className="text-slate-600 mb-6">Create your first post to get started with your blog</p>
                      <Button asChild className="bg-slate-900 hover:bg-slate-800">
                        <Link to="/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Post
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <div key={post.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-slate-900 truncate">{post.title}</h4>
                              <Badge variant={post.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                                {post.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(post.created_at), 'MMM dd, yyyy')}</span>
                              </div>
                              {post.status === 'published' && (
                                <div className="flex items-center space-x-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{post.view_count || 0} views</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-700">
                              <Link to={`/edit/${post.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            {post.status === 'published' && (
                              <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-700">
                                <Link to={`/${username}/${post.slug}`}>
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deletePost(post.id, post.title)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Quick Links */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">Quick Links</CardTitle>
                  <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/developers" className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
                      <Key className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">API Documentation</p>
                      <p className="text-sm text-slate-600">Learn how to use our API</p>
                    </div>
                  </Link>
                  
                  {profile?.username && (
                    <Link to={`/${profile.username}`} className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">View Your Blog</p>
                        <p className="text-sm text-slate-600">See your public profile</p>
                      </div>
                    </Link>
                  )}
                  
                  <div className="flex items-center p-3 rounded-xl bg-slate-50">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Member since</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(user?.created_at), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
                  <CardDescription>Your latest actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 text-sm">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 font-medium truncate">
                              {activity.status === 'published' ? 'Published' : 'Created draft'}
                            </p>
                            <p className="text-sm text-slate-600 truncate">{activity.title}</p>
                            <p className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
