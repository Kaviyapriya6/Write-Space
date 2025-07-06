import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { 
  Eye, 
  TrendingUp, 
  MessageCircle, 
  Calendar, 
  FileText, 
  ArrowLeft,
  BarChart3,
  Users,
  Clock,
  ExternalLink,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';

const Analytics = () => {
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalPosts: 0,
    totalComments: 0,
    apiCalls: 0,
    viewsData: [],
    topPosts: [],
    commentsData: [],
    dailyViews: [],
    engagementRate: 0,
    avgReadTime: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchAnalytics(session.user.id);
      } else {
        navigate('/auth');
      }
    };
    getUser();
  }, [navigate]);

  const fetchAnalytics = async (userId: string) => {
    try {
      setRefreshing(true);
      
      // Fetch user posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, view_count, like_count, created_at, slug, markdown_content')
        .eq('user_id', userId)
        .eq('status', 'published');

      if (postsError) throw postsError;

      // Fetch comments on user's posts
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, created_at, post_id, content')
        .in('post_id', posts?.map(p => p.id) || []);

      if (commentsError) throw commentsError;

      // Fetch post views for the selected period
      const daysBack = selectedPeriod === '30days' ? 30 : 7;
      const periodStart = subDays(new Date(), daysBack);
      const { data: postViews, error: viewsError } = await supabase
        .from('post_views')
        .select('created_at, post_id')
        .in('post_id', posts?.map(p => p.id) || [])
        .gte('created_at', periodStart.toISOString());

      if (viewsError) throw viewsError;

      // Fetch API key usage
      const { data: apiKeys, error: apiError } = await supabase
        .from('api_keys')
        .select('usage_count, name')
        .eq('user_id', userId);

      if (apiError) throw apiError;

      // Process data
      const totalViews = posts?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
      const totalPosts = posts?.length || 0;
      const totalComments = comments?.length || 0;
      const apiCalls = apiKeys?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0;

      // Calculate engagement rate
      const engagementRate = totalViews > 0 ? ((totalComments / totalViews) * 100) : 0;

      // Calculate average read time (estimated 200 words per minute)
      const avgWordsPerPost = posts?.reduce((sum, post) => {
        const wordCount = (post.markdown_content || '').split(/\s+/).length;
        return sum + wordCount;
      }, 0) / (totalPosts || 1);
      const avgReadTime = Math.ceil(avgWordsPerPost / 200);

      // Top posts by views
      const topPosts = posts
        ?.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map(post => ({
          title: post.title,
          views: post.view_count || 0,
          likes: post.like_count || 0,
          slug: post.slug,
          created_at: post.created_at,
          engagement: ((comments?.filter(c => c.post_id === post.id).length || 0) / (post.view_count || 1) * 100).toFixed(1)
        })) || [];

      // Daily views for the selected period
      const dailyViews = Array.from({ length: daysBack }, (_, i) => {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const viewsForDay = postViews?.filter(view => {
          const viewDate = new Date(view.created_at);
          return viewDate >= dayStart && viewDate < dayEnd;
        }).length || 0;

        return {
          date: format(date, 'MMM dd'),
          views: viewsForDay,
          fullDate: format(date, 'yyyy-MM-dd')
        };
      }).reverse();

      // Comments per post
      const commentsData = posts?.map(post => ({
        title: post.title.length > 15 ? post.title.substring(0, 15) + '...' : post.title,
        comments: comments?.filter(comment => comment.post_id === post.id).length || 0,
        views: post.view_count || 0
      })).slice(0, 6) || [];

      // Recent activity
      const recentActivity = [
        ...comments?.map(comment => ({
          type: 'comment',
          description: `New comment on "${posts?.find(p => p.id === comment.post_id)?.title || 'Unknown post'}"`,
          time: comment.created_at,
          icon: MessageCircle
        })) || [],
        ...posts?.map(post => ({
          type: 'post',
          description: `Published "${post.title}"`,
          time: post.created_at,
          icon: FileText
        })) || []
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);

      setAnalytics({
        totalViews,
        totalPosts,
        totalComments,
        apiCalls,
        viewsData: [],
        topPosts,
        commentsData,
        dailyViews,
        engagementRate,
        avgReadTime,
        recentActivity
      });

    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      fetchAnalytics(user.id);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    if (user) {
      fetchAnalytics(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const chartConfig = {
    views: {
      label: "Views",
      color: "#0f172a",
    },
    comments: {
      label: "Comments",
      color: "#64748b",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
                <p className="text-slate-600">Insights into your content performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-slate-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="border-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <Tabs value={selectedPeriod} onValueChange={handlePeriodChange} className="w-auto">
              <TabsList className="bg-white border border-slate-200">
                <TabsTrigger value="7days" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Last 7 days
                </TabsTrigger>
                <TabsTrigger value="30days" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Last 30 days
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Overview Stats */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Views</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.totalViews.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Across all your posts
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Published Posts</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.totalPosts}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Total content created
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Engagement Rate</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.engagementRate.toFixed(1)}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  Comments per view
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Avg. Read Time</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.avgReadTime} min</div>
                <p className="text-xs text-slate-500 mt-1">
                  Estimated reading time
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Daily Views Chart */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Daily Views</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">Track your content views over time</p>
                  </div>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    {selectedPeriod === '7days' ? 'Last 7 days' : 'Last 30 days'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyViews}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                                            <Area 
                                              type="monotone" 
                                              dataKey="views"
                                              stroke="#0f172a"
                                              fill="#0f172a"
                                              fillOpacity={0.1}
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      </ChartContainer>
                                    </CardContent>
                                  </Card>
                      
                                  {/* Top Posts */}
                                  <Card className="border-0 shadow-lg bg-white">
                                    <CardHeader>
                                      <CardTitle className="text-lg font-semibold text-slate-900">Top Posts</CardTitle>
                                      <p className="text-sm text-slate-500 mt-1">Your most viewed content</p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {analytics.topPosts.length > 0 ? (
                                        analytics.topPosts.map((post, index) => (
                                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                            <div className="flex-1 min-w-0">
                                              <Link 
                                                to={`/post/${post.slug}`}
                                                className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate block"
                                              >
                                                {post.title}
                                              </Link>
                                              <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-xs text-slate-500">{post.views} views</span>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-500">{post.engagement}% engagement</span>
                                              </div>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-slate-400 ml-2" />
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">No posts published yet</p>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                      
                                {/* Comments and Activity */}
                                <div className="grid lg:grid-cols-2 gap-6">
                                  {/* Comments per Post */}
                                  <Card className="border-0 shadow-lg bg-white">
                                    <CardHeader>
                                      <CardTitle className="text-lg font-semibold text-slate-900">Comments by Post</CardTitle>
                                      <p className="text-sm text-slate-500 mt-1">Engagement across your content</p>
                                    </CardHeader>
                                    <CardContent>
                                      <ChartContainer config={chartConfig} className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <BarChart data={analytics.commentsData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis 
                                              dataKey="title" 
                                              stroke="#64748b" 
                                              fontSize={12}
                                              tickLine={false}
                                              axisLine={false}
                                              angle={-45}
                                              textAnchor="end"
                                              height={60}
                                            />
                                            <YAxis 
                                              stroke="#64748b" 
                                              fontSize={12}
                                              tickLine={false}
                                              axisLine={false}
                                            />
                                            <Tooltip 
                                              contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                              }}
                                            />
                                            <Bar dataKey="comments" fill="#0f172a" radius={[4, 4, 0, 0]} />
                                          </BarChart>
                                        </ResponsiveContainer>
                                      </ChartContainer>
                                    </CardContent>
                                  </Card>
                      
                                  {/* Recent Activity */}
                                  <Card className="border-0 shadow-lg bg-white">
                                    <CardHeader>
                                      <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
                                      <p className="text-sm text-slate-500 mt-1">Latest updates on your content</p>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        {analytics.recentActivity.length > 0 ? (
                                          analytics.recentActivity.map((activity, index) => {
                                            const IconComponent = activity.icon;
                                            return (
                                              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50">
                                                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                                                  <IconComponent className="h-4 w-4 text-slate-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm text-slate-900">{activity.description}</p>
                                                  <p className="text-xs text-slate-500 mt-1">
                                                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                                                  </p>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      };
                      
                      export default Analytics;
   