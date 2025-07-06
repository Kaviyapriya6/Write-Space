import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Search,
  ArrowLeft,
  BookOpen,
  TrendingUp,
  FileText,
  User,
  Clock,
  Eye,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [popularPosts, setPopularPosts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [suggestedRoutes, setSuggestedRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Log 404 error with additional context
    console.error("404 Error Details:", {
      pathname: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });

    // Generate route suggestions based on the attempted path
    generateRouteSuggestions(location.pathname);

    // Fetch helpful content
    fetchHelpfulContent();
  }, [location.pathname]);

  const generateRouteSuggestions = (pathname: string) => {
    const suggestions: string[] = [];
    const pathParts = pathname.split("/").filter(Boolean);

    // Common route patterns
    const commonRoutes = ["/dashboard", "/explore", "/new", "/developers", "/auth"];

    // If it looks like a username/slug pattern
    if (pathParts.length === 2) {
      suggestions.push("/explore"); // Browse all posts instead
    }

    // If it looks like a username
    if (pathParts.length === 1 && pathParts[0].length > 0) {
      suggestions.push("/explore"); // Browse users/posts
    }

    // Add common routes
    suggestions.push(...commonRoutes);

    // Remove duplicates and limit to 4
    setSuggestedRoutes([...new Set(suggestions)].slice(0, 4));
  };

  const fetchHelpfulContent = async () => {
    try {
      // Fetch popular posts
      const { data: popularData } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          slug,
          view_count,
          created_at,
          profiles!posts_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(3);

      // Fetch recent posts
      const { data: recentData } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          slug,
          excerpt,
          created_at,
          profiles!posts_user_id_fkey (
            username,
            display_name
          )
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);

      setPopularPosts(popularData || []);
      setRecentPosts(recentData || []);
    } catch (error) {
      console.error("Error fetching helpful content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getRouteDescription = (route: string) => {
    const descriptions: Record<string, string> = {
      "/dashboard": "Your personal dashboard and content management",
      "/explore": "Discover posts and authors from the community",
      "/new": "Create a new blog post",
      "/developers": "API documentation and developer resources",
      "/auth": "Sign in or create an account",
    };
    return descriptions[route] || "Navigate to this section";
  };

  const getRouteIcon = (route: string) => {
    const icons: Record<string, React.ReactNode> = {
      "/dashboard": <User className="h-4 w-4" />,
      "/explore": <TrendingUp className="h-4 w-4" />,
      "/new": <FileText className="h-4 w-4" />,
      "/developers": <BookOpen className="h-4 w-4" />,
      "/auth": <User className="h-4 w-4" />,
    };
    return icons[route] || <FileText className="h-4 w-4" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">WriteSpace</span>
            </Link>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Link to="/">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* 404 Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              <div className="h-24 w-24 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-slate-700 mb-4">Page Not Found</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
                The page you're looking for doesn't exist or has been moved.
                Let's help you find what you need.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-12">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search for posts, authors, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-slate-300 rounded-xl"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-2 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Quick Navigation */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
              {suggestedRoutes.map((route) => (
                <Link key={route} to={route}>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white group cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center mx-auto mb-4 transition-colors">
                        <div className="group-hover:text-white text-slate-600 transition-colors">
                          {getRouteIcon(route)}
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {route === "/" ? "Home" : route.slice(1).charAt(0).toUpperCase() + route.slice(2)}
                      </h3>
                      <p className="text-sm text-slate-600">{getRouteDescription(route)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Helpful Content */}
          {!loading && (popularPosts.length > 0 || recentPosts.length > 0) && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Popular Posts */}
              {popularPosts.length > 0 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Popular Posts
                    </CardTitle>
                    <p className="text-slate-600">Check out what's trending in the community</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {popularPosts.map((post) => (
                        <Link
                          key={post.id}
                          to={`/${post.profiles?.username}/${post.slug}`}
                          className="block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                        >
                          <h3 className="font-medium text-slate-900 mb-2 hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <div className="flex items-center space-x-3">
                              <span>{post.profiles?.display_name || post.profiles?.username}</span>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.view_count || 0}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Popular
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Posts */}
              {recentPosts.length > 0 && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Latest Posts
                    </CardTitle>
                    <p className="text-slate-600">Fresh content from our community</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentPosts.map((post) => (
                        <Link
                          key={post.id}
                          to={`/${post.profiles?.username}/${post.slug}`}
                          className="block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                        >
                          <h3 className="font-medium text-slate-900 mb-2 hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>{post.profiles?.display_name || post.profiles?.username}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatTimeAgo(post.created_at)}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading helpful content...</p>
            </div>
          )}

          {/* Additional Help */}
          <Card className="border-0 shadow-lg bg-slate-900 text-white mt-12">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Still need help?</h3>
              <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                If you're looking for something specific or think this might be a bug,
                we're here to help you get back on track.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800"
                  asChild
                >
                  <a href="mailto:support@writespace.dev">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Support
                  </a>
                </Button>
                <Link to="/explore">
                  <Button className="bg-white text-slate-900 hover:bg-slate-100">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Browse Content
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <Card className="border-amber-200 bg-amber-50 mt-8">
              <CardHeader>
                <CardTitle className="text-amber-800">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-amber-700 space-y-2">
                  <p>
                    <strong>Attempted Path:</strong> {location.pathname}
                  </p>
                  <p>
                    <strong>Search Parameters:</strong> {location.search || "None"}
                  </p>
                  <p>
                    <strong>Timestamp:</strong> {new Date().toISOString()}
                  </p>
                  <p>
                    <strong>Referrer:</strong> {document.referrer || "Direct access"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
