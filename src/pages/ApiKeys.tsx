import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  Key, 
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Shield,
  Activity,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import crypto from 'crypto-js';

const ApiKeys = () => {
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState('read');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [generatedKey, setGeneratedKey] = useState('');
  const [showGeneratedKeyDialog, setShowGeneratedKeyDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchApiKeys(session.user.id);
      } else {
        navigate('/auth');
      }
    };
    getUser();
  }, [navigate]);

  const fetchApiKeys = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading API keys",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.lib.WordArray.random(32).toString();
    return `ws_${timestamp}_${randomBytes}`;
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your API key.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const apiKey = generateApiKey();
      const keyHash = crypto.SHA256(apiKey).toString();
      const keyPreview = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || null,
          key_hash: keyHash,
          key_preview: keyPreview,
          permissions: newKeyPermissions,
        });

      if (error) throw error;

      setGeneratedKey(apiKey);
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyPermissions('read');
      setShowCreateDialog(false);
      setShowGeneratedKeyDialog(true);
      await fetchApiKeys(user.id);
      
      toast({
        title: "API key created successfully",
        description: "Your new API key has been generated securely.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete "${keyName}"? This action cannot be undone and will immediately revoke access.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      await fetchApiKeys(user.id);
      toast({
        title: "API key deleted",
        description: "The API key has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The API key has been copied to your clipboard.",
    });
  };

  const regenerateKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to regenerate "${keyName}"? The current key will stop working immediately.`)) {
      return;
    }

    try {
      const newApiKey = generateApiKey();
      const keyHash = crypto.SHA256(newApiKey).toString();
      const keyPreview = `${newApiKey.substring(0, 8)}...${newApiKey.substring(newApiKey.length - 4)}`;

      const { error } = await supabase
        .from('api_keys')
        .update({
          key_hash: keyHash,
          key_preview: keyPreview,
          usage_count: 0,
          last_used_at: null,
        })
        .eq('id', keyId);

      if (error) throw error;

      setGeneratedKey(newApiKey);
      setShowGeneratedKeyDialog(true);
      await fetchApiKeys(user.id);
      
      toast({
        title: "API key regenerated",
        description: "Your API key has been regenerated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error regenerating API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);

      if (error) throw error;

      await fetchApiKeys(user.id);
      toast({
        title: `API key ${!currentStatus ? 'activated' : 'deactivated'}`,
        description: `The API key has been ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating API key",
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
          <p className="text-slate-600">Loading API keys...</p>
        </div>
      </div>
    );
  }

  const totalUsage = apiKeys.reduce((sum, key) => sum + (key.usage_count || 0), 0);
  const activeKeys = apiKeys.filter(key => key.is_active).length;
  const usagePercentage = Math.round((totalUsage / 1000) * 100);

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
                <h1 className="text-2xl font-bold text-slate-900">API Key Management</h1>
                <p className="text-slate-600">Secure access tokens for your applications</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="border-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Export Usage
              </Button>
              <Button variant="outline" size="sm" asChild className="border-slate-300">
                <Link to="/developers">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  API Docs
                </Link>
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="keyName">Name *</Label>
                      <Input
                        id="keyName"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Mobile App, Website Integration"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="keyDescription">Description</Label>
                      <Textarea
                        id="keyDescription"
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                        placeholder="Optional description of what this key is used for"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permissions">Permissions</Label>
                      <Select value={newKeyPermissions} onValueChange={setNewKeyPermissions}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="admin">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-start space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Security Notice</p>
                        <p>API keys provide access to your account. Store them securely and never share them publicly.</p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createApiKey} disabled={creating}>
                      {creating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Key'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Overview Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Keys</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Key className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{activeKeys}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {apiKeys.length} total keys
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Monthly Usage</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{totalUsage.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {usagePercentage}% of 1,000 limit
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Rate Limit</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">1,000</div>
                <p className="text-xs text-slate-500 mt-1">
                  requests per month
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Last Activity</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {apiKeys.length > 0 && apiKeys.some(key => key.last_used_at) ? (
                    formatDistanceToNow(new Date(Math.max(...apiKeys.filter(key => key.last_used_at).map(key => new Date(key.last_used_at).getTime()))), { addSuffix: true }).split(' ')[0]
                  ) : (
                    'Never'
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  API request made
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Progress */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Monthly Usage Overview</CardTitle>
              <p className="text-sm text-slate-500">Track your API consumption and remaining quota</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Current Usage</span>
                  <span className="font-medium text-slate-900">{totalUsage} / 1,000 requests</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      usagePercentage >= 90 ? 'bg-red-500' : 
                      usagePercentage >= 75 ? 'bg-amber-500' : 
                      'bg-slate-900'
                    }`}
                    style={{ width: `${Math.min(100, usagePercentage)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0</span>
                  <span>1,000</span>
                </div>
                {usagePercentage >= 75 && (
                  <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      You're approaching your monthly limit. Consider upgrading your plan for higher limits.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Keys Table */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">Your API Keys</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage access tokens and monitor their usage</p>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                  {apiKeys.length} keys
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <Key className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No API keys yet</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Create your first API key to start accessing your blog data programmatically.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First API Key
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="text-slate-600">Name & Description</TableHead>
                        <TableHead className="text-slate-600">Key</TableHead>
                        <TableHead className="text-slate-600">Usage</TableHead>
                        <TableHead className="text-slate-600">Last Used</TableHead>
                        <TableHead className="text-slate-600">Status</TableHead>
                        <TableHead className="text-slate-600">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((apiKey) => (
                        <TableRow key={apiKey.id} className="border-slate-200">
                          <TableCell>
                            <div>
                              <div className="font-medium text-slate-900">{apiKey.name}</div>
                              {apiKey.description && (
                                <div className="text-sm text-slate-500 mt-1">{apiKey.description}</div>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {apiKey.permissions || 'read'}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  Created {format(new Date(apiKey.created_at), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">
                                {visibleKeys.has(apiKey.id) ? '●●●●●●●●●●●●●●●●' : apiKey.key_preview}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                {visibleKeys.has(apiKey.id) ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(apiKey.key_preview)}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900">
                                {(apiKey.usage_count || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-500">
                                {Math.round(((apiKey.usage_count || 0) / 1000) * 100)}% of limit
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {apiKey.last_used_at ? (
                              <div>
                                <div className="text-sm text-slate-900">
                                  {format(new Date(apiKey.last_used_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">Never used</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {apiKey.is_active ? (
                                <div className="flex items-center space-x-1">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                                    Active
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <XCircle className="h-4 w-4 text-slate-400" />
                                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                                    Inactive
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeyStatus(apiKey.id, apiKey.is_active)}
                                className="text-slate-500 hover:text-slate-700"
                                title={apiKey.is_active ? 'Deactivate key' : 'Activate key'}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => regenerateKey(apiKey.id, apiKey.name)}
                                className="text-slate-500 hover:text-slate-700"
                                title="Regenerate key"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete key"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Best Practices */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Security Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Keep Your Keys Secure</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Store API keys in environment variables</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Never commit keys to version control</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Rotate keys regularly</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Monitor Usage</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Review API key usage regularly</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Deactivate unused keys</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Use descriptive names and permissions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Generated Key Dialog */}
      <Dialog open={showGeneratedKeyDialog} onOpenChange={setShowGeneratedKeyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>API Key Generated Successfully</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-800">Your API Key</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey)}
                  className="text-emerald-700 hover:text-emerald-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="block w-full p-3 bg-white border border-emerald-200 rounded font-mono text-sm break-all">
                {generatedKey}
              </code>
            </div>
            <div className="flex items-start space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important Security Notice</p>
                <p>This is the only time you'll see this key. Copy and store it securely before closing this dialog.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGeneratedKeyDialog(false)}
            >
              I've stored it safely
            </Button>
            <Button 
              onClick={() => copyToClipboard(generatedKey)}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeys;
