import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Github, 
  Twitter, 
  Eye, 
  MessageCircle, 
  Heart,
  ArrowLeft,
  Settings,
  Share2,
  BookOpen,
  TrendingUp,
  Clock,
  Hash,
  ExternalLink,
  Mail,
  Globe,
  Edit,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    avgViewsPerPost: 0,
    mostPopularPost: null as any
  });
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUserProfile(userProfile);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch published posts with comments count
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            slug,
            excerpt,
            tags,
            view_count,
            like_count,
            created_at,
            updated_at,
            cover_image,
            markdown_content,
            profiles (username, display_name, avatar_url),
            comments (id)
          `)
          .eq('user_id', profileData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        setPosts(postsData || []);

        // Calculate stats
        const totalPosts = postsData?.length || 0;
        const totalViews = postsData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
        const totalLikes = postsData?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;
        const totalComments = postsData?.reduce((sum, post) => sum + (post.comments?.length || 0), 0) || 0;
        const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
        const mostPopularPost = postsData?.reduce((prev, current) => 
          (current.view_count || 0) > (prev?.view_count || 0) ? current : prev, null);

        setStats({
          totalPosts,
          totalViews,
          totalLikes,
          totalComments,
          avgViewsPerPost,
          mostPopularPost
        });

      } catch (error: any) {
        console.error('Profile fetch error:', error);
        toast({
          title: "Error loading profile",
          description: error.message,
          variant: "destructive",
        });
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, toast, navigate]);

  const copyProfileUrl = async () => {
    const url = `${window.location.origin}/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Profile URL copied",
        description: "Profile link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Unable to copy profile URL",
        variant: "destructive",
      });
    }
  };

  const shareProfile = async () => {
    const url = `${window.location.origin}/${username}`;
    const text = `Check out ${profile.display_name || profile.username}'s profile on WriteSpace`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (error) {
        copyProfileUrl();
      }
    } else {
      copyProfileUrl();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profile not found</h1>
          <p className="text-slate-600 mb-6">The user you're looking for doesn't exist.</p>
          <Link to="/explore">
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Explore Authors
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = profile.social_links || {};
  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
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
              <Separator orientation="vertical" className="h-6" />
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">WriteSpace</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={shareProfile}
                className="border-slate-300"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied' : 'Share'}
              </Button>
              
              {currentUser && (
                <Link to="/dashboard">
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                    Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Profile Header */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
                
                {/* Avatar and Basic Info */}
                <div className="flex flex-col items-center lg:items-start space-y-4">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-slate-900 text-white text-4xl">
                      {profile.display_name?.charAt(0) || profile.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isOwnProfile && (
                    <Link to="/settings">
                      <Button variant="outline" size="sm" className="border-slate-300">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  )}
                </div>
                
                {/* Profile Details */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">
                      {profile.display_name || profile.username}
                    </h1>
                    <p className="text-xl text-slate-600">@{profile.username}</p>
                  </div>
                  
                  {profile.bio && (
                    <p className="text-lg text-slate-700 leading-relaxed max-w-2xl">
                      {profile.bio}
                    </p>
                  )}
                  
                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-6 text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                    </div>
                    
                    {profile.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    
                    {profile.role !== 'user' && (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {profile.role}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Social Links */}
                  {Object.keys(socialLinks).length > 0 && (
                    <div className="flex items-center space-x-4">
                      {socialLinks.github && (
                        <a
                          href={socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.twitter && (
                        <a
                          href={socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.website && (
                        <a
                          href={socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Globe className="h-5 w-5" />
                        </a>
                      )}
                      {socialLinks.email && (
                        <a
                          href={`mailto:${socialLinks.email}`}
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Mail className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalPosts}</div>
                <div className="text-sm text-slate-600">Posts Published</div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {stats.totalViews.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Total Views</div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalLikes}</div>
                <div className="text-sm text-slate-600">Total Likes</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalComments}</div>
                <div className="text-sm text-slate-600">Comments</div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger 
                value="posts" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Posts ({stats.totalPosts})
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                About
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Published Posts</CardTitle>
                    {posts.length > 0 && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {stats.avgViewsPerPost} avg views per post
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {posts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No posts yet</h3>
                      <p className="text-slate-600 mb-6">
                        {isOwnProfile 
                          ? "Start sharing your thoughts with the world!" 
                          : `${profile.display_name || profile.username} hasn't published any posts yet.`
                        }
                      </p>
                      {isOwnProfile && (
                        <Link to="/new">
                          <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            <Edit className="h-4 w-4 mr-2" />
                            Write your first post
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {posts.map((post) => (
                        <article key={post.id} className="group">
                          <div className="flex space-x-6">
                            
                            {/* Cover Image */}
                            {post.cover_image && (
                              <div className="flex-shrink-0">
                                <img
                                  src={post.cover_image}
                                  alt={post.title}
                                  className="w-32 h-24 object-cover rounded-lg border border-slate-200 group-hover:shadow-md transition-shadow"
                                />
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <Link
                                  to={`/${profile.username}/${post.slug}`}
                                  className="block group-hover:text-blue-600 transition-colors"
                                >
                                  <h2 className="text-2xl font-bold text-slate-900 mb-2 line-clamp-2">
                                    {post.title}
                                  </h2>
                                </Link>
                                
                                {stats.mostPopularPost?.id === post.id && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-4 flex-shrink-0">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Most Popular
                                  </Badge>
                                )}
                              </div>
                              
                              {post.excerpt && (
                                <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                                  {post.excerpt}
                                </p>
                              )}
                              
                              {/* Meta Info */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6 text-sm text-slate-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Eye className="h-4 w-4" />
                                    <span>{post.view_count || 0} views</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Heart className="h-4 w-4" />
                                    <span>{post.like_count || 0} likes</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{post.comments?.length || 0} comments</span>
                                  </div>
                                </div>
                                
                                <Link 
                                  to={`/${profile.username}/${post.slug}`}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                                >
                                  Read more
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </div>
                              
                              {/* Tags */}
                              {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {post.tags.slice(0, 5).map((tag: string) => (
                                    <Badge 
                                      key={tag} 
                                      variant="outline" 
                                      className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
                                    >
                                      <Hash className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Separator className="mt-8" />
                        </article>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* About Section */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle>About {profile.display_name || profile.username}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.bio ? (
                      <p className="text-slate-700 leading-relaxed">{profile.bio}</p>
                    ) : (
                      <p className="text-slate-500 italic">
                        {isOwnProfile 
                          ? "Add a bio to tell people about yourself."
                          : "This user hasn't added a bio yet."
                        }
                      </p>
                    )}
                    
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">
                          Member since {format(new Date(profile.created_at), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                      
                      {profile.location && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-600">{profile.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Stats */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Total posts published</span>
                      <span className="font-semibold text-slate-900">{stats.totalPosts}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Total views received</span>
                      <span className="font-semibold text-slate-900">{stats.totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Total likes received</span>
                      <span className="font-semibold text-slate-900">{stats.totalLikes}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Comments received</span>
                      <span className="font-semibold text-slate-900">{stats.totalComments}</span>
                    </div>
                    
                    {stats.mostPopularPost && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-600 mb-2">Most popular post:</p>
                        <Link 
                          to={`/${profile.username}/${stats.mostPopularPost.slug}`}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm block truncate"
                        >
                          {stats.mostPopularPost.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">
                          {stats.mostPopularPost.view_count} views
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
