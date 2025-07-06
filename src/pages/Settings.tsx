import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User,
  Mail,
  Globe,
  Github,
  Twitter,
  Linkedin,
  MapPin,
  Camera,
  Save,
  ArrowLeft,
  Shield,
  Key,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Bell,
  Palette,
  Monitor,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  RefreshCw,
  LogOut,
  UserX,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    joinDate: null as Date | null
  });

  // Form states
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    avatar_url: '',
    social_links: {
      github: '',
      twitter: '',
      linkedin: '',
      email: ''
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    comment_notifications: true,
    like_notifications: true,
    follow_notifications: true,
    newsletter: false
  });

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Get current user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session?.user) {
          navigate('/auth');
          return;
        }

        setCurrentUser(session.user);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);
          setFormData({
            display_name: profileData.display_name || '',
            username: profileData.username || '',
            bio: profileData.bio || '',
            location: (profileData as any).location || '',
            website: (profileData as any).website || '',
            avatar_url: profileData.avatar_url || '',
            social_links: (profileData.social_links as any) || {
              github: '',
              twitter: '',
              linkedin: '',
              email: ''
            }
          });

          // Get user statistics
          await fetchUserStats(session.user.id);
        }

      } catch (error: any) {
        console.error('Error initializing settings:', error);
        toast({
          title: "Error loading settings",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeSettings();
  }, [navigate, toast]);

  const fetchUserStats = async (userId: string) => {
    try {
      // Get user posts and stats
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, view_count, like_count, created_at')
        .eq('user_id', userId)
        .eq('status', 'published');

      if (postsError) throw postsError;

      const totalPosts = postsData?.length || 0;
      const totalViews = postsData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
      const totalLikes = postsData?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;

      setStats({
        totalPosts,
        totalViews,
        totalLikes,
        joinDate: profile?.created_at ? new Date(profile.created_at) : null
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      // Validate username uniqueness if changed
      if (formData.username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username)
          .neq('id', currentUser.id)
          .single();

        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          username: formData.username.trim().toLowerCase(),
          bio: formData.bio.trim(),
          location: formData.location.trim(),
          website: formData.website.trim(),
          avatar_url: formData.avatar_url.trim(),
          social_links: formData.social_links,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local state
      const updatedProfile = {
        ...profile,
        ...formData,
        updated_at: new Date().toISOString()
      };
      setProfile(updatedProfile);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update form data
      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been uploaded. Don't forget to save your changes.",
      });

    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;

    try {
      // Fetch all user data
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.id);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', currentUser.id);

      const exportData = {
        profile: profile,
        posts: postsData || [],
        comments: commentsData || [],
        exportDate: new Date().toISOString()
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `writespace-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file.",
      });

    } catch (error: any) {
      toast({
        title: "Error exporting data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !showDeleteConfirm) return;

    try {
      // Delete user data (cascading deletes should handle related records)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(currentUser.id);
      
      if (authError) throw authError;

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/');

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

    } catch (error: any) {
      toast({
        title: "Error deleting account",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/');
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

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
              <Separator orientation="vertical" className="h-6" />
              <Link to="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">WriteSpace</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="border-slate-300">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-slate-300 text-slate-600 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Page Header */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
                <p className="text-slate-600">Manage your account preferences and data</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.totalPosts}</div>
                  <div className="text-sm text-slate-600">Posts</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Views</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.totalLikes}</div>
                  <div className="text-sm text-slate-600">Likes</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.joinDate ? format(stats.joinDate, 'yyyy') : '—'}
                  </div>
                  <div className="text-sm text-slate-600">Member Since</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="data" 
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                <Database className="h-4 w-4 mr-2" />
                Data & Privacy
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center space-x-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="bg-slate-900 text-white text-2xl">
                        {formData.display_name?.charAt(0) || formData.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button variant="outline" asChild className="border-slate-300">
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            Change Avatar
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <p className="text-sm text-slate-500">JPG, PNG or GIF. Max size 5MB.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Your display name"
                        className="border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                        placeholder="your-username"
                        className="border-slate-300"
                      />
                      <p className="text-sm text-slate-500">Your profile will be available at /{formData.username}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="border-slate-300 resize-none"
                    />
                    <p className="text-sm text-slate-500">{formData.bio.length}/500 characters</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                          className="pl-10 border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://yourwebsite.com"
                          className="pl-10 border-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Social Links</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="github">GitHub</Label>
                        <div className="relative">
                          <Github className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="github"
                            value={formData.social_links.github}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              social_links: { ...prev.social_links, github: e.target.value }
                            }))}
                            placeholder="https://github.com/username"
                            className="pl-10 border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="twitter"
                            value={formData.social_links.twitter}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              social_links: { ...prev.social_links, twitter: e.target.value }
                            }))}
                            placeholder="https://twitter.com/username"
                            className="pl-10 border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="linkedin"
                            value={formData.social_links.linkedin}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              social_links: { ...prev.social_links, linkedin: e.target.value }
                            }))}
                            placeholder="https://linkedin.com/in/username"
                            className="pl-10 border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Contact Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="email"
                            value={formData.social_links.email}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              social_links: { ...prev.social_links, email: e.target.value }
                            }))}
                            placeholder="contact@email.com"
                            className="pl-10 border-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleProfileUpdate}
                      disabled={saving}
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <div className="space-y-6">
                {/* Change Password */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                          className="pr-10 border-slate-300"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="border-slate-300"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handlePasswordChange}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {saving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Information */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-slate-700">Email Address</Label>
                        <p className="text-slate-900 font-medium">{currentUser?.email}</p>
                        <p className="text-sm text-slate-500">This is your login email</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700">Account Created</Label>
                        <p className="text-slate-900 font-medium">
                          {stats.joinDate ? format(stats.joinDate, 'MMMM dd, yyyy') : 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-500">Member since</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Email Notifications</Label>
                        <p className="text-sm text-slate-500">Receive notifications via email</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, email_notifications: !prev.email_notifications }))}
                        className={notificationSettings.email_notifications ? 'bg-slate-900 text-white' : 'border-slate-300'}
                      >
                        {notificationSettings.email_notifications ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Comment Notifications</Label>
                        <p className="text-sm text-slate-500">When someone comments on your posts</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, comment_notifications: !prev.comment_notifications }))}
                        className={notificationSettings.comment_notifications ? 'bg-slate-900 text-white' : 'border-slate-300'}
                      >
                        {notificationSettings.comment_notifications ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Like Notifications</Label>
                        <p className="text-sm text-slate-500">When someone likes your posts</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, like_notifications: !prev.like_notifications }))}
                        className={notificationSettings.like_notifications ? 'bg-slate-900 text-white' : 'border-slate-300'}
                      >
                        {notificationSettings.like_notifications ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Newsletter</Label>
                        <p className="text-sm text-slate-500">Weekly digest of popular content</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationSettings(prev => ({ ...prev, newsletter: !prev.newsletter }))}
                        className={notificationSettings.newsletter ? 'bg-slate-900 text-white' : 'border-slate-300'}
                      >
                        {notificationSettings.newsletter ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data & Privacy Tab */}
            <TabsContent value="data">
              <div className="space-y-6">
                {/* Export Data */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Download className="h-5 w-5 mr-2" />
                      Export Your Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">
                      Download a copy of all your data including posts, comments, and profile information.
                    </p>
                    <Button onClick={handleExportData} variant="outline" className="border-slate-300">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </CardContent>
                </Card>

                {/* Delete Account */}
                <Card className="border-0 shadow-lg bg-white border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                      <p className="text-red-700 text-sm mb-4">
                        This action cannot be undone. This will permanently delete your account and all associated data.
                      </p>
                      
                      {!showDeleteConfirm ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-red-900 font-medium">Are you absolutely sure?</p>
                          <div className="flex space-x-3">
                            <Button
                              onClick={handleDeleteAccount}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Yes, Delete My Account
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="border-slate-300"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
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

export default Settings;