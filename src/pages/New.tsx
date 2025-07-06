import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Save, 
  Eye, 
  Upload, 
  Calendar as CalendarIcon, 
  X, 
  Plus, 
  ArrowLeft,
  Settings,
  FileText,
  Clock,
  BarChart3,
  Image as ImageIcon,
  Hash,
  BookOpen,
  User,
  AlertCircle,
  Check,
  Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

const New = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState<Date>();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          
          // Check if profile exists, create if not
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const username = session.user.email?.split('@')[0] || 'user';
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                username: username,
                display_name: username
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              toast({
                title: "Profile creation failed",
                description: "Please try refreshing the page.",
                variant: "destructive",
              });
              navigate('/auth');
              return;
            }
            setProfile(newProfile);
          } else if (profileError) {
            console.error('Error fetching profile:', profileError);
            toast({
              title: "Error loading profile",
              description: "Please try refreshing the page.",
              variant: "destructive",
            });
            navigate('/auth');
            return;
          } else {
            setProfile(profileData);
          }
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in getUser:', error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, [navigate, toast]);

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [title, content, excerpt, tags, coverImage, status]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!autoSaveEnabled || !title.trim() || !content.trim() || !profile || saving || publishing) return;

    try {
      const draftData = {
        user_id: profile.id,
        title,
        slug,
        excerpt,
        markdown_content: content,
        cover_image: coverImage || null,
        tags,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem(`draft_${profile.id}`, JSON.stringify(draftData));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, [autoSaveEnabled, title, content, excerpt, tags, coverImage, profile, slug, saving, publishing]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges) {
      const timer = setTimeout(autoSave, 30000);
      return () => clearTimeout(timer);
    }
  }, [autoSave, autoSaveEnabled, hasUnsavedChanges]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setCoverImage(publicUrl);
      toast({
        title: "Image uploaded successfully",
        description: "Cover image has been uploaded.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const validatePost = () => {
    const errors: string[] = [];
    
    if (!title.trim()) errors.push('Title is required');
    if (!content.trim()) errors.push('Content is required');
    if (!excerpt.trim()) errors.push('Excerpt is required for SEO');
    if (tags.length === 0) errors.push('At least one tag is required');
    
    return errors;
  };

  const saveAsDraft = async () => {
    const errors = validatePost();
    if (errors.length > 0) {
      toast({
        title: "Validation errors",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Profile not found",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          title,
          slug,
          excerpt,
          markdown_content: content,
          cover_image: coverImage || null,
          tags,
          status: 'draft',
          scheduled_at: scheduledAt?.toISOString() || null,
        });

      if (error) throw error;

      // Remove from localStorage
      localStorage.removeItem(`draft_${profile.id}`);
      
      toast({
        title: "Draft saved",
        description: "Your post has been saved as a draft.",
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Save draft error:', error);
      toast({
        title: "Error saving draft",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const publishPost = async () => {
    const errors = validatePost();
    if (errors.length > 0) {
      toast({
        title: "Validation errors",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Profile not found",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    setPublishing(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          title,
          slug,
          excerpt,
          markdown_content: content,
          cover_image: coverImage || null,
          tags,
          status: scheduledAt ? 'scheduled' : 'published',
          scheduled_at: scheduledAt?.toISOString() || null,
        });

      if (error) throw error;

      // Remove from localStorage
      localStorage.removeItem(`draft_${profile.id}`);

      toast({
        title: scheduledAt ? "Post scheduled" : "Post published",
        description: scheduledAt 
          ? `Your post will be published on ${format(scheduledAt, 'PPP')}.`
          : "Your post has been published successfully.",
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: "Error publishing post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const readTime = Math.ceil(wordCount / 200);
  const completionScore = Math.round(
    ((title ? 25 : 0) + 
     (content ? 25 : 0) + 
     (excerpt ? 25 : 0) + 
     (tags.length > 0 ? 15 : 0) + 
     (coverImage ? 10 : 0)) 
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">New Post</h1>
                  <div className="flex items-center space-x-3 text-sm text-slate-500">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{readTime} min read</span>
                    {lastSaved && (
                      <>
                        <span>•</span>
                        <span className="flex items-center">
                          <Check className="h-3 w-3 mr-1 text-emerald-600" />
                          Saved {format(lastSaved, 'HH:mm')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Progress value={completionScore} className="w-16 h-2" />
                <span className="text-xs text-slate-500">{completionScore}%</span>
              </div>
              <Button 
                variant="outline" 
                onClick={saveAsDraft}
                disabled={saving}
                className="border-slate-300"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button 
                onClick={publishPost}
                disabled={publishing}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                {publishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="editor" className="space-y-6">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="editor" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Editor Tab */}
            <TabsContent value="editor">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Editor */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Content
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-slate-700">Title</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter your post title..."
                          className="text-xl font-semibold border-slate-300 mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="slug" className="text-sm font-medium text-slate-700">URL Slug</Label>
                        <Input
                          id="slug"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          placeholder="post-url-slug"
                          className="font-mono text-sm border-slate-300 mt-2"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Preview: /{profile?.username}/{slug}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="excerpt" className="text-sm font-medium text-slate-700">
                          Excerpt
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Textarea
                          id="excerpt"
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value.slice(0, 160))}
                          placeholder="Brief description for SEO and social sharing..."
                          rows={3}
                          className="border-slate-300 mt-2"
                        />
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-500">Used for SEO meta description</span>
                          <span className="text-xs text-slate-500">{excerpt.length}/160</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="content" className="text-sm font-medium text-slate-700">
                          Content (Markdown)
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="# Your Post Title

Start writing your amazing content here...

## Features
- Support for **Markdown**
- Code syntax highlighting
- Tables and more

```javascript
console.log('Hello, World!');
```"
                          rows={25}
                          className="font-mono text-sm border-slate-300 mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Publication Status */}
                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-lg">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Completion
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Overall Progress</span>
                          <span className="text-sm font-medium">{completionScore}%</span>
                        </div>
                        <Progress value={completionScore} className="h-2" />
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className={title ? 'text-emerald-600' : 'text-slate-500'}>
                              {title ? '✓' : '○'} Title
                            </span>
                            <span className="text-slate-400">25%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={content ? 'text-emerald-600' : 'text-slate-500'}>
                              {content ? '✓' : '○'} Content
                            </span>
                            <span className="text-slate-400">25%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={excerpt ? 'text-emerald-600' : 'text-slate-500'}>
                              {excerpt ? '✓' : '○'} Excerpt
                            </span>
                            <span className="text-slate-400">25%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={tags.length > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                              {tags.length > 0 ? '✓' : '○'} Tags
                            </span>
                            <span className="text-slate-400">15%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={coverImage ? 'text-emerald-600' : 'text-slate-500'}>
                              {coverImage ? '✓' : '○'} Cover Image
                            </span>
                            <span className="text-slate-400">10%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cover Image */}
                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-lg">
                        <ImageIcon className="h-5 w-5 mr-2" />
                        Cover Image
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {coverImage ? (
                          <div className="relative">
                            <img 
                              src={coverImage} 
                              alt="Cover" 
                              className="w-full h-32 object-cover rounded-lg border border-slate-200" 
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCoverImage('')}
                              className="absolute top-2 right-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-600 mb-3">Add a cover image to make your post stand out</p>
                          </div>
                        )}
                        
                        <label className="cursor-pointer">
                          <Button 
                            variant="outline" 
                            disabled={uploadingImage}
                            className="w-full border-slate-300"
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingImage ? 'Uploading...' : 'Upload Image'}
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        
                        <p className="text-xs text-slate-500">
                          Recommended: 1200x630px, max 5MB
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  <Card className="border-0 shadow-lg bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-lg">
                        <Hash className="h-5 w-5 mr-2" />
                        Tags
                        <span className="text-red-500 ml-1">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="Add a tag..."
                            onKeyPress={(e) => e.key === 'Enter' && addTag()}
                            className="border-slate-300"
                            disabled={tags.length >= 5}
                          />
                          <Button 
                            onClick={addTag} 
                            size="sm"
                            disabled={!tagInput.trim() || tags.length >= 5}
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="flex items-center space-x-1 bg-slate-100 text-slate-700"
                              >
                                <span>{tag}</span>
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-red-600" 
                                  onClick={() => removeTag(tag)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-500">
                          {tags.length}/5 tags • Help readers discover your content
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <p className="text-slate-600">How your post will appear to readers</p>
                </CardHeader>
                <CardContent>
                  <article className="prose prose-slate max-w-none">
                    {coverImage && (
                      <img 
                        src={coverImage} 
                        alt="Cover" 
                        className="w-full h-64 object-cover rounded-xl mb-8" 
                      />
                    )}
                    
                    <header className="mb-8">
                      <h1 className="text-4xl font-bold mb-4">
                        {title || 'Your Post Title'}
                      </h1>
                      
                      {excerpt && (
                        <p className="text-xl text-slate-600 italic mb-6">{excerpt}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-slate-500 mb-6">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{profile?.display_name || profile?.username}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{readTime} min read</span>
                        </div>
                        <span>•</span>
                        <span>{format(new Date(), 'MMM d, yyyy')}</span>
                      </div>
                      
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="border-slate-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </header>
                    
                    <div className="prose-content">
                      <ReactMarkdown>
                        {content || 'Start writing your content to see the preview...'}
                      </ReactMarkdown>
                    </div>
                  </article>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle>Publication Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Publication Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="border-slate-300 mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {status === 'scheduled' && (
                      <div>
                        <Label>Schedule Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-start border-slate-300 mt-2"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduledAt ? format(scheduledAt, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={scheduledAt}
                              onSelect={setScheduledAt}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader>
                    <CardTitle>Editor Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-save</Label>
                        <p className="text-sm text-slate-500">Automatically save your work</p>
                      </div>
                      <Button
                        variant={autoSaveEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                        className={autoSaveEnabled ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-300"}
                      >
                        {autoSaveEnabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    {hasUnsavedChanges && (
                      <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Unsaved Changes</p>
                          <p className="text-sm text-amber-700">
                            You have unsaved changes. Don't forget to save your work.
                          </p>
                        </div>
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

export default New;
