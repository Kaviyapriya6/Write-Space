import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Code, 
  Key, 
  Globe, 
  Shield, 
  Zap, 
  Copy, 
  ExternalLink,
  BookOpen,
  Terminal,
  Database,
  FileText,
  MessageCircle,
  Eye,
  User,
  ArrowLeft,
  Search,
  CheckCircle,
  Play,
  Download,
  Github,
  Activity,
  Clock,
  Server,
  AlertCircle,
  Home,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Developers = () => {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiStats, setApiStats] = useState({
    totalRequests: 0,
    remainingRequests: 1000,
    lastReset: null,
    activeKeys: 0
  });
  const [systemStatus, setSystemStatus] = useState({
    operational: true,
    responseTime: 0,
    uptime: '99.9%'
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        await Promise.all([
          fetchApiKeys(session.user.id),
          fetchApiStats(session.user.id)
        ]);
      }
    };
    getUser();
    checkSystemStatus();
  }, []);

  const fetchApiKeys = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
      
      setApiStats(prev => ({
        ...prev,
        activeKeys: data?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchApiStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('usage_count, last_used_at')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      const totalUsage = data?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0;
      const remaining = Math.max(1000 - totalUsage, 0);

      setApiStats(prev => ({
        ...prev,
        totalRequests: totalUsage,
        remainingRequests: remaining,
        lastReset: data?.[0]?.last_used_at || null
      }));
    } catch (error) {
      console.error('Error fetching API stats:', error);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health');
      const endTime = Date.now();
      
      setSystemStatus({
        operational: response.ok,
        responseTime: endTime - startTime,
        uptime: '99.9%'
      });
    } catch (error) {
      setSystemStatus({
        operational: false,
        responseTime: 0,
        uptime: '99.9%'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code snippet has been copied to your clipboard.",
    });
  };

  const baseUrl = window.location.origin;

  const endpoints = [
    {
      id: 'posts',
      method: 'GET',
      endpoint: '/api/posts',
      description: 'Get all published posts with pagination and filtering',
      category: 'Posts',
      params: [
        { name: 'limit', type: 'number', description: 'Number of posts to return (max 100)', default: '10' },
        { name: 'offset', type: 'number', description: 'Number of posts to skip', default: '0' },
        { name: 'tags', type: 'string', description: 'Filter by tags (comma-separated)' },
        { name: 'author', type: 'string', description: 'Filter by author username' },
        { name: 'search', type: 'string', description: 'Search in title and content' }
      ]
    },
    {
      id: 'user-posts',
      method: 'GET',
      endpoint: '/api/posts/:username',
      description: 'Get posts by specific author',
      category: 'Posts',
      params: [
        { name: 'limit', type: 'number', description: 'Number of posts to return', default: '10' },
        { name: 'offset', type: 'number', description: 'Number of posts to skip', default: '0' }
      ]
    },
    {
      id: 'single-post',
      method: 'GET',
      endpoint: '/api/posts/:username/:slug',
      description: 'Get specific post by author and slug',
      category: 'Posts',
      params: []
    },
    {
      id: 'comments',
      method: 'GET',
      endpoint: '/api/comments/:postId',
      description: 'Get comments for a specific post',
      category: 'Comments',
      params: [
        { name: 'limit', type: 'number', description: 'Number of comments to return', default: '20' },
        { name: 'offset', type: 'number', description: 'Number of comments to skip', default: '0' }
      ]
    },
    {
      id: 'user-profile',
      method: 'GET',
      endpoint: '/api/users/:username',
      description: 'Get user profile information',
      category: 'Users',
      params: []
    },
    {
      id: 'tags',
      method: 'GET',
      endpoint: '/api/tags',
      description: 'Get all available tags',
      category: 'Content',
      params: [
        { name: 'popular', type: 'boolean', description: 'Only return popular tags' }
      ]
    }
  ];

  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <span className="text-slate-900 font-medium">API Documentation</span>
              </nav>
            </div>
            
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
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border-0">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">API Documentation</h1>
                    <p className="text-slate-600">Access your blog content programmatically</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700">RESTful API with JSON responses</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700">Bearer token authentication</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700">Rate limiting with clear headers</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mt-6">
                  {user ? (
                    apiKeys.length > 0 ? (
                      <Link to="/dashboard/api-keys">
                        <Button className="bg-slate-900 hover:bg-slate-800">
                          <Key className="h-4 w-4 mr-2" />
                          Manage API Keys
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/dashboard/api-keys">
                        <Button className="bg-slate-900 hover:bg-slate-800">
                          <Key className="h-4 w-4 mr-2" />
                          Create API Key
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Link to="/auth">
                      <Button className="bg-slate-900 hover:bg-slate-800">
                        <User className="h-4 w-4 mr-2" />
                        Sign In to Get Started
                      </Button>
                    </Link>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => copyToClipboard(`curl -H "Authorization: Bearer YOUR_API_KEY" ${baseUrl}/api/posts`)}
                    className="border-slate-300"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Try Example
                  </Button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-6 text-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Quick Example</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`curl -X GET \\
  "${baseUrl}/api/posts" \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-sm">
                  <span className="text-blue-400">curl</span> <span className="text-amber-400">-X GET</span> \<br />
                  &nbsp;&nbsp;<span className="text-emerald-400">"{baseUrl}/api/posts"</span> \<br />
                  &nbsp;&nbsp;<span className="text-amber-400">-H</span> <span className="text-emerald-400">"Authorization: Bearer YOUR_API_KEY"</span>
                </code>
              </div>
            </div>
          </div>

          {/* Real-time Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">API Status</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${systemStatus.operational ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-lg font-bold text-slate-900">
                    {systemStatus.operational ? 'Operational' : 'Down'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {systemStatus.responseTime}ms response
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Keys</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Key className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{apiStats.activeKeys}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {user ? 'Your active keys' : 'Sign in to view'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Usage This Month</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{apiStats.totalRequests}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {apiStats.remainingRequests} remaining
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Endpoints</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Server className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{endpoints.length}</div>
                <p className="text-xs text-slate-500 mt-1">Available endpoints</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="endpoints" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-white border border-slate-200">
                <TabsTrigger value="endpoints" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Endpoints
                </TabsTrigger>
                <TabsTrigger value="authentication" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="examples" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Code Examples
                </TabsTrigger>
                <TabsTrigger value="rate-limits" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Rate Limits
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search endpoints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 border-slate-300"
                  />
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                  Base: {baseUrl}/api
                </Badge>
              </div>
            </div>

            {/* Endpoints Tab */}
            <TabsContent value="endpoints">
              <div className="space-y-6">
                {filteredEndpoints.length === 0 ? (
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="text-center py-12">
                      <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No endpoints found</h3>
                      <p className="text-slate-600">Try adjusting your search query</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredEndpoints.map((endpoint) => (
                    <Card key={endpoint.id} className="border-0 shadow-lg bg-white">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Badge 
                              variant="default"
                              className="bg-emerald-100 text-emerald-700 border-emerald-200"
                            >
                              {endpoint.method}
                            </Badge>
                            <code className="text-lg font-mono text-slate-900">{endpoint.endpoint}</code>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {endpoint.category}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${baseUrl}/api${endpoint.endpoint}`)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-slate-600">{endpoint.description}</p>
                      </CardHeader>
                      {endpoint.params.length > 0 && (
                        <CardContent>
                          <h4 className="font-semibold mb-4 text-slate-900">Query Parameters</h4>
                          <div className="space-y-3">
                            {endpoint.params.map((param, paramIndex) => (
                              <div key={paramIndex} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <code className="font-mono text-sm bg-white px-2 py-1 rounded border">{param.name}</code>
                                    <Badge variant="outline" className="text-xs bg-slate-100">
                                      {param.type}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600">{param.description}</p>
                                </div>
                                {param.default && (
                                  <Badge variant="secondary" className="text-xs ml-4">
                                    Default: {param.default}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Shield className="h-6 w-6 mr-3" />
                    Authentication
                  </CardTitle>
                  <p className="text-slate-600">Secure your API requests with bearer token authentication</p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">API Key Authentication</h3>
                    <p className="text-slate-600 mb-4">
                      All API requests must include your API key in the Authorization header:
                    </p>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                        onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <code>Authorization: Bearer YOUR_API_KEY</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-900">Getting Your API Key</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">1</div>
                          <span className="text-slate-700">Sign in to your account</span>
                        </div>
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">2</div>
                          <span className="text-slate-700">Navigate to API Keys in Dashboard</span>
                        </div>
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">3</div>
                          <span className="text-slate-700">Click "Create New API Key"</span>
                        </div>
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">4</div>
                          <span className="text-slate-700">Copy and store securely</span>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                          <Shield className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-amber-800 mb-3">Security Best Practices</h4>
                            <ul className="space-y-2 text-sm text-amber-700">
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Store keys as environment variables</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Never commit keys to version control</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Rotate keys regularly</span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Use separate keys per environment</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Examples Tab */}
            <TabsContent value="examples">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Code Examples</h2>
                  <Button variant="outline" size="sm" asChild className="border-slate-300">
                    <a href="https://github.com/writeSpace/api-examples" target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      View on GitHub
                    </a>
                  </Button>
                </div>

                <Tabs defaultValue="curl" className="space-y-4">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="php">PHP</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl">
                    <div className="space-y-6">
                      <Card className="border-0 shadow-lg bg-white">
                        <CardHeader>
                          <CardTitle className="text-lg">Get All Posts</CardTitle>
                          <p className="text-slate-600">Fetch published posts with pagination</p>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                              onClick={() => copyToClipboard(`curl -X GET \\
  "${baseUrl}/api/posts?limit=10&offset=0" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <code className="text-sm">
                              <span className="text-blue-400">curl</span> <span className="text-amber-400">-X GET</span> \<br />
                              &nbsp;&nbsp;<span className="text-emerald-400">"{baseUrl}/api/posts?limit=10"</span> \<br />
                              &nbsp;&nbsp;<span className="text-amber-400">-H</span> <span className="text-emerald-400">"Authorization: Bearer YOUR_API_KEY"</span>
                            </code>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg bg-white">
                        <CardHeader>
                          <CardTitle className="text-lg">Get Post by Author and Slug</CardTitle>
                          <p className="text-slate-600">Fetch a specific post</p>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                              onClick={() => copyToClipboard(`curl -X GET \\
  "${baseUrl}/api/posts/username/post-slug" \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <code className="text-sm">
                              <span className="text-blue-400">curl</span> <span className="text-amber-400">-X GET</span> \<br />
                              &nbsp;&nbsp;<span className="text-emerald-400">"{baseUrl}/api/posts/username/post-slug"</span> \<br />
                              &nbsp;&nbsp;<span className="text-amber-400">-H</span> <span className="text-emerald-400">"Authorization: Bearer YOUR_API_KEY"</span>
                            </code>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="javascript">
                    <Card className="border-0 shadow-lg bg-white">
                      <CardHeader>
                        <CardTitle className="text-lg">JavaScript Fetch Example</CardTitle>
                        <p className="text-slate-600">Using modern JavaScript fetch API</p>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={() => copyToClipboard(`const API_KEY = process.env.WRITESPACE_API_KEY;
const BASE_URL = '${baseUrl}/api';

async function fetchPosts(limit = 10, offset = 0) {
  try {
    const response = await fetch(\`\${BASE_URL}/posts?limit=\${limit}&offset=\${offset}\`, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    throw error;
  }
}

// Usage
fetchPosts(5, 0)
  .then(data => console.log(data))
  .catch(error => console.error(error));`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <code className="text-sm whitespace-pre">
{`const API_KEY = process.env.WRITESPACE_API_KEY;
const BASE_URL = '${baseUrl}/api';

async function fetchPosts(limit = 10, offset = 0) {
  try {
    const response = await fetch(\`\${BASE_URL}/posts?limit=\${limit}&offset=\${offset}\`, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    throw error;
  }
}

// Usage
fetchPosts(5, 0)
  .then(data => console.log(data))
  .catch(error => console.error(error));`}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="python">
                    <Card className="border-0 shadow-lg bg-white">
                      <CardHeader>
                        <CardTitle className="text-lg">Python Requests Example</CardTitle>
                        <p className="text-slate-600">Using the requests library</p>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={() => copyToClipboard(`import requests
import os
import json

API_KEY = os.getenv('WRITESPACE_API_KEY')
BASE_URL = '${baseUrl}/api'

def fetch_posts(limit=10, offset=0):
    """Fetch posts from WriteSpace API"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    params = {
        'limit': limit,
        'offset': offset
    }
    
    try:
        response = requests.get(
            f'{BASE_URL}/posts',
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f'API request failed: {e}')
        raise

# Usage
if __name__ == '__main__':
    try:
        posts = fetch_posts(limit=5)
        print(json.dumps(posts, indent=2))
    except Exception as e:
        print(f'Error: {e}')`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <code className="text-sm whitespace-pre">
{`import requests
import os
import json

API_KEY = os.getenv('WRITESPACE_API_KEY')
BASE_URL = '${baseUrl}/api'

def fetch_posts(limit=10, offset=0):
    """Fetch posts from WriteSpace API"""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    
    params = {
        'limit': limit,
        'offset': offset
    }
    
    try:
        response = requests.get(
            f'{BASE_URL}/posts',
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f'API request failed: {e}')
        raise

# Usage
if __name__ == '__main__':
    try:
        posts = fetch_posts(limit=5)
        print(json.dumps(posts, indent=2))
    except Exception as e:
        print(f'Error: {e}')`}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="php">
                    <Card className="border-0 shadow-lg bg-white">
                      <CardHeader>
                        <CardTitle className="text-lg">PHP cURL Example</CardTitle>
                        <p className="text-slate-600">Using cURL with error handling</p>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={() => copyToClipboard(`<?php

class WriteSpaceAPI {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl = '${baseUrl}/api') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function fetchPosts($limit = 10, $offset = 0) {
        $url = $this->baseUrl . '/posts?' . http_build_query([
            'limit' => $limit,
            'offset' => $offset
        ]);
        
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'User-Agent: WriteSpace-PHP-Client/1.0'
        ];
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        if ($error) {
            throw new Exception("cURL Error: " . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP Error: " . $httpCode);
        }
        
        return json_decode($response, true);
    }
}

// Usage
try {
    $api = new WriteSpaceAPI($_ENV['WRITESPACE_API_KEY']);
    $posts = $api->fetchPosts(5, 0);
    echo json_encode($posts, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage();
}

?>`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <code className="text-sm whitespace-pre">
{`<?php

class WriteSpaceAPI {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl = '${baseUrl}/api') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function fetchPosts($limit = 10, $offset = 0) {
        $url = $this->baseUrl . '/posts?' . http_build_query([
            'limit' => $limit,
            'offset' => $offset
        ]);
        
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'User-Agent: WriteSpace-PHP-Client/1.0'
        ];
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        if ($error) {
            throw new Exception("cURL Error: " . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP Error: " . $httpCode);
        }
        
        return json_decode($response, true);
    }
}

// Usage
try {
    $api = new WriteSpaceAPI($_ENV['WRITESPACE_API_KEY']);
    $posts = $api->fetchPosts(5, 0);
    echo json_encode($posts, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage();
}

?>`}
                          </code>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* Rate Limits Tab */}
            <TabsContent value="rate-limits">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Rate Limits & Usage</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2" />
                        Current Plan Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Requests per month</span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">1,000</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Requests per minute</span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">30</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Active API keys</span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">3</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Rate limit headers</span>
                        <Badge className="bg-emerald-100 text-emerald-700">Included</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Database className="h-5 w-5 mr-2" />
                        Rate Limit Headers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <code className="text-slate-800">X-RateLimit-Limit</code>
                          <span className="text-slate-600">Total allowed</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <code className="text-slate-800">X-RateLimit-Remaining</code>
                          <span className="text-slate-600">Remaining requests</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <code className="text-slate-800">X-RateLimit-Reset</code>
                          <span className="text-slate-600">Reset timestamp</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                          <code className="text-slate-800">X-RateLimit-Used</code>
                          <span className="text-slate-600">Requests used</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle>Best Practices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Handling Rate Limits</h4>
                        <ul className="space-y-2 text-slate-600">
                          <li className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>Check headers before making requests</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>Implement exponential backoff</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>Cache responses when possible</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>Use pagination efficiently</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Performance Tips</h4>
                        <ul className="space-y-2 text-slate-600">
                          <li className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>Request only needed fields</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>Use appropriate page sizes</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>Implement client-side caching</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>Monitor your usage patterns</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Support Section */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Support & Resources
              </CardTitle>
              <p className="text-slate-600">Get help and connect with the community</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <Terminal className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-semibold mb-2 text-slate-900">API Testing</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Test endpoints with tools like Postman or curl
                  </p>
                  <Button variant="outline" size="sm" asChild className="border-slate-300">
                    <Link to="/dashboard/api-keys">
                      <Key className="h-4 w-4 mr-2" />
                      Get API Key
                    </Link>
                  </Button>
                </div>
                
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <Github className="h-8 w-8 mx-auto mb-3 text-slate-900" />
                  <h3 className="font-semibold mb-2 text-slate-900">Code Examples</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Complete examples in multiple languages
                  </p>
                  <Button variant="outline" size="sm" asChild className="border-slate-300">
                    <a href="https://github.com/writeSpace/api-examples" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Examples
                    </a>
                  </Button>
                </div>
                
                <div className="text-center p-6 bg-slate-50 rounded-xl">
                  <Globe className="h-8 w-8 mx-auto mb-3 text-emerald-600" />
                  <h3 className="font-semibold mb-2 text-slate-900">Status Page</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Monitor API status and incidents
                  </p>
                  <Button variant="outline" size="sm" asChild className="border-slate-300">
                    <a href="https://status.writespace.dev" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Check Status
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Developers;
