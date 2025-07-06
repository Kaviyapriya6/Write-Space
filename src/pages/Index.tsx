import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Github, 
  Code, 
  Users, 
  BookOpen, 
  Zap, 
  Globe, 
  ArrowRight, 
  Check, 
  Star, 
  Shield, 
  Rocket, 
  Database, 
  TrendingUp,
  Edit3,
  Terminal,
  FileText,
  Activity,
  BarChart3,
  Clock,
  User,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalViews: 0,
    apiRequests: 0
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchStats();
    fetchRecentPosts();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch total posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total views
      const { data: viewsData } = await supabase
        .from('posts')
        .select('view_count')
        .eq('status', 'published');

      const totalViews = viewsData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;

      // Fetch API usage
      const { data: apiData } = await supabase
        .from('api_keys')
        .select('usage_count');

      const apiRequests = apiData?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0;

      setStats({
        totalPosts: postsCount || 0,
        totalUsers: usersCount || 0,
        totalViews,
        apiRequests
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          excerpt,
          created_at,
          view_count,
          slug,
          profiles!posts_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentPosts(data || []);
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">WriteSpace</span>
              </Link>
              <Badge variant="outline" className="ml-2 border-emerald-200 text-emerald-700 bg-emerald-50">
                Open Source
              </Badge>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/explore" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Explore
              </Link>
              <Link to="/developers" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                API
              </Link>
              <a 
                href="https://github.com/your-org/writespace" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center"
              >
                GitHub
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://github.com/your-org/writespace" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  Star
                </a>
              </Button>
              {user ? (
                <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-slate-900 hover:bg-slate-800 text-white">
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-slate-200">
              <div className="flex flex-col space-y-4">
                <Link to="/explore" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Explore
                </Link>
                <Link to="/developers" className="text-slate-600 hover:text-slate-900 transition-colors">
                  API
                </Link>
                <a 
                  href="https://github.com/your-org/writespace" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-slate-900 transition-colors flex items-center"
                >
                  GitHub
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
                <div className="flex flex-col space-y-2 pt-4 border-t border-slate-200">
                  {user ? (
                    <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-slate-900 hover:bg-slate-800 text-white">
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Link to="/auth">
                        <Button variant="outline" size="sm" className="w-full">Sign In</Button>
                      </Link>
                      <Link to="/auth">
                        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white w-full">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50/50"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-5xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                <Star className="h-3 w-3 mr-1" />
                Trusted by {formatNumber(stats.totalUsers)} developers
              </Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-slate-900 tracking-tight">
              Developer-First
              <br />
              <span className="text-blue-600">Blogging Platform</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Write in Markdown, publish instantly, and access everything through our powerful API. 
              The modern blogging platform built for developers who value simplicity and control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/auth">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white text-lg px-8 py-6 rounded-xl">
                  Start Writing Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/developers">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-slate-300">
                  <Code className="mr-2 h-5 w-5" />
                  Explore API
                </Button>
              </Link>
            </div>
            
            {/* API Preview Card */}
            <Card className="max-w-3xl mx-auto shadow-2xl border-0 overflow-hidden">
              <CardHeader className="bg-slate-900 text-white pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    Live API
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="bg-slate-900 text-left p-6">
                <pre className="text-emerald-400 text-sm overflow-x-auto">
                  <code>{`GET ${window.location.origin}/api/posts/username/post-slug
Authorization: Bearer YOUR_API_KEY

{
  "data": {
    "title": "Building Modern APIs",
    "content": "# Getting Started\\n\\nIn this post...",
    "published_at": "${new Date().toISOString()}",
    "tags": ["api", "development"],
    "views": ${stats.totalViews > 0 ? Math.floor(stats.totalViews / stats.totalPosts) || 150 : 150},
    "author": {
      "username": "developer",
      "display_name": "John Developer"
    }
  },
  "meta": {
    "status": "published",
    "last_modified": "${new Date().toISOString()}"
  }
}`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Real Stats Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{formatNumber(stats.totalUsers)}+</div>
                <div className="text-slate-600">Active Writers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{formatNumber(stats.apiRequests)}+</div>
                <div className="text-slate-600">API Requests</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{formatNumber(stats.totalPosts)}+</div>
                <div className="text-slate-600">Published Posts</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{formatNumber(stats.totalViews)}+</div>
                <div className="text-slate-600">Total Views</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Posts Section */}
      {recentPosts.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-slate-900">Latest from the Community</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Discover the latest insights and stories from our developer community
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {recentPosts.map((post) => (
                <Card key={post.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white group">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-500 mb-3">
                      <User className="h-4 w-4" />
                      <span>{post.profiles?.display_name || post.profiles?.username || 'Anonymous'}</span>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600 line-clamp-3">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <Eye className="h-4 w-4" />
                        <span>{post.view_count || 0} views</span>
                      </div>
                      <Link 
                        to={`/${post.profiles?.username}/${post.slug}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                      >
                        Read more
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link to="/explore">
                <Button variant="outline" size="lg" className="border-slate-300">
                  <FileText className="mr-2 h-5 w-5" />
                  Explore All Posts
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-slate-900">Built for Modern Development</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to create, manage, and distribute content like a professional developer
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <Edit3 className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Markdown Editor</CardTitle>
                <CardDescription className="text-slate-600">
                  Advanced Markdown editor with live preview, syntax highlighting, and custom components support.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">RESTful API</CardTitle>
                <CardDescription className="text-slate-600">
                  Complete REST API with authentication, rate limiting, and comprehensive documentation.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                  <Rocket className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Edge Performance</CardTitle>
                <CardDescription className="text-slate-600">
                  Global CDN with edge caching for lightning-fast content delivery worldwide.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Enterprise Security</CardTitle>
                <CardDescription className="text-slate-600">
                  Advanced security features with authentication, authorization, and secure API access.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                  <Github className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Open Source</CardTitle>
                <CardDescription className="text-slate-600">
                  Fully open source with MIT license. Self-host, contribute, or build your own features.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Analytics Dashboard</CardTitle>
                <CardDescription className="text-slate-600">
                  Real-time analytics with detailed insights into content performance and API usage.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-slate-900">Integrate with Your Stack</h2>
            <p className="text-xl text-slate-600">Works seamlessly with your existing tools and workflows</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-2 border-slate-100 hover:border-blue-200 transition-colors bg-white">
              <CardHeader>
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Code className="h-8 w-8 text-slate-700" />
                </div>
                <CardTitle>Frontend Frameworks</CardTitle>
                <CardDescription>
                  React, Vue, Angular, Svelte, or vanilla JavaScript. Use our SDK or direct API calls.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 border-slate-100 hover:border-blue-200 transition-colors bg-white">
              <CardHeader>
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Terminal className="h-8 w-8 text-slate-700" />
                </div>
                <CardTitle>Headless CMS</CardTitle>
                <CardDescription>
                  Perfect for JAMstack sites, mobile apps, and custom implementations.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="text-center border-2 border-slate-100 hover:border-blue-200 transition-colors bg-white">
              <CardHeader>
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-slate-700" />
                </div>
                <CardTitle>Webhooks & Events</CardTitle>
                <CardDescription>
                  Real-time notifications for content updates, comments, and user interactions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Content Strategy?</h2>
            <p className="text-xl text-slate-300 mb-10">
              Join {formatNumber(stats.totalUsers)} developers and companies who trust WriteSpace for their content needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-6 rounded-xl">
                  Start Writing Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/developers">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-slate-600 text-white hover:bg-slate-800">
                  Explore API
                </Button>
              </Link>
            </div>
            <p className="text-slate-400 text-sm mt-6">
              Free to start • Open source • Full API access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">WriteSpace</span>
              </div>
              <p className="text-slate-600 mb-6 max-w-md">
                The professional blogging platform for developers. Open source, API-first, and built for scale.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://github.com/your-org/writespace" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Github className="h-5 w-5" />
                </a>
                <a 
                  href="https://github.com/your-org/writespace" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Star className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Platform</h4>
              <ul className="space-y-3 text-slate-600">
                <li><Link to="/explore" className="hover:text-slate-900 transition-colors">Explore</Link></li>
                <li><Link to="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link></li>
                <li><Link to="/new" className="hover:text-slate-900 transition-colors">Write</Link></li>
                <li><Link to="/analytics" className="hover:text-slate-900 transition-colors">Analytics</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Developers</h4>
              <ul className="space-y-3 text-slate-600">
                <li><Link to="/developers" className="hover:text-slate-900 transition-colors">API Documentation</Link></li>
                <li><Link to="/dashboard/api-keys" className="hover:text-slate-900 transition-colors">API Keys</Link></li>
                <li>
                  <a 
                    href="https://github.com/your-org/writespace" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 transition-colors flex items-center"
                  >
                    GitHub
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </li>
                <li>
                  <a 
                    href="https://status.writespace.dev" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 transition-colors flex items-center"
                  >
                    Status
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-slate-600">
                <li><Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link></li>
                <li><Link to="/contact" className="hover:text-slate-900 transition-colors">Contact</Link></li>
                <li>
                  <a 
                    href="mailto:support@writespace.dev"
                    className="hover:text-slate-900 transition-colors"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-slate-600">
            <p>&copy; {new Date().getFullYear()} WriteSpace. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-sm">Made with ❤️ for developers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
