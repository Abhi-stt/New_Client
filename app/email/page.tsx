'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { HOST_URL } from '@/lib/api';
import './email-styles.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MailOpen, Paperclip, Filter, Plus, Settings, RefreshCw, AlertCircle, Trash2, Edit, Forward } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailAccount {
  connected: boolean;
  email?: string;
  isActive?: boolean;
  lastSyncAt?: string;
  syncStatus?: string;
}

interface Email {
  _id: string;
  sender: string;
  subject: string;
  bodyPreview: string;
  body?: string;
  htmlBody?: string;
  textBody?: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
  isForwarded: boolean;
}

interface ForwardingRule {
  _id: string;
  ruleName: string;
  isActive: boolean;
  conditions: {
    senderEmail?: string;
    senderDomain?: string;
    subjectKeywords?: string[];
    bodyKeywords?: string[];
    hasAttachments?: boolean;
  };
  actions: {
    forwardType: 'full';
    recipients: Array<{
      type: 'role' | 'email';
      value: string;
    }>;
    addNote?: string;
  };
  executionCount: number;
  lastExecutedAt?: string;
}

export default function EmailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [emailAccount, setEmailAccount] = useState<EmailAccount>({ connected: false });
  const [emails, setEmails] = useState<Email[]>([]);
  const [forwardingRules, setForwardingRules] = useState<ForwardingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<ForwardingRule | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [emailToForward, setEmailToForward] = useState<Email | null>(null);
  const [filters, setFilters] = useState({
    sender: '',
    subject: '',
    isRead: undefined as boolean | undefined,
    hasAttachments: undefined as boolean | undefined
  });
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Function definitions
  const loadEmailAccount = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${HOST_URL}/api/email/account/${user.id}`);
      const data = await response.json();
      setEmailAccount(data);
    } catch (error) {
      console.error('Error loading email account:', error);
    }
  };

  const loadEmails = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.sender) queryParams.append('sender', filters.sender);
      if (filters.subject) queryParams.append('subject', filters.subject);
      if (filters.isRead !== undefined) queryParams.append('isRead', filters.isRead.toString());
      if (filters.hasAttachments !== undefined) queryParams.append('hasAttachments', filters.hasAttachments.toString());

      const response = await fetch(`${HOST_URL}/api/email/emails/${user.id}?${queryParams}`);
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadForwardingRules = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${HOST_URL}/api/email/forwarding-rules/${user.id}`);
      const data = await response.json();
      setForwardingRules(data);
    } catch (error) {
      console.error('Error loading forwarding rules:', error);
    }
  };

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadEmailAccount();
      loadEmails();
      loadForwardingRules();
    }
  }, [user]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const userId = user.id;

  // Additional function definitions
  const connectGmail = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/email/gmail/auth/${userId}`);
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to connect Gmail account",
        variant: "destructive"
      });
    }
  };

  const syncEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${HOST_URL}/api/email/sync/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 50 })
      });
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Synced ${data.count} emails`,
      });
      
      loadEmails();
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast({
        title: "Error",
        description: "Failed to sync emails",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`${HOST_URL}/api/email/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      
      setEmails(emails.map(email => 
        email._id === emailId ? { ...email, isRead: true } : email
      ));
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setShowEmailModal(true);
    if (!email.isRead) {
      markAsRead(email._id);
    }
  };

  const createForwardingRule = async (ruleData: any) => {
    try {
      const response = await fetch(`${HOST_URL}/api/email/forwarding-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...ruleData
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Forwarding rule created successfully",
        });
        loadForwardingRules();
        setShowCreateRule(false);
      } else {
        throw new Error('Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating forwarding rule:', error);
      toast({
        title: "Error",
        description: "Failed to create forwarding rule",
        variant: "destructive"
      });
    }
  };

  const updateForwardingRule = async (ruleId: string, updates: any) => {
    try {
      const response = await fetch(`${HOST_URL}/api/email/forwarding-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Forwarding rule updated successfully",
        });
        loadForwardingRules();
        setEditingRule(null);
      } else {
        throw new Error('Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating forwarding rule:', error);
      toast({
        title: "Error",
        description: "Failed to update forwarding rule",
        variant: "destructive"
      });
    }
  };

  const deleteForwardingRule = async (ruleId: string) => {
    try {
      const response = await fetch(`${HOST_URL}/api/email/forwarding-rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Forwarding rule deleted successfully",
        });
        loadForwardingRules();
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting forwarding rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete forwarding rule",
        variant: "destructive"
      });
    }
  };

  const disconnectGmail = async () => {
    try {
      const response = await fetch(`${HOST_URL}/api/email/account/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Gmail account disconnected successfully",
        });
        
        // Reset email account state
        setEmailAccount({ connected: false });
        setEmails([]);
        setForwardingRules([]);
        setShowDisconnectDialog(false);
      } else {
        throw new Error('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail account",
        variant: "destructive"
      });
    }
  };

  const forwardEmail = async (forwardData: any) => {
    try {
      console.log('Attempting to forward email to:', `${HOST_URL}/api/email/forward`);
      console.log('Forward data:', forwardData);
      
      const response = await fetch(`${HOST_URL}/api/email/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: emailToForward?._id,
          userId,
          ...forwardData
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Forward result:', result);
        
        // Show detailed success message
        let successMessage = `Email forwarded successfully to ${result.forwardedTo || 0} recipients`;
        if (result.recipientDetails) {
          const roleCount = result.recipientDetails.filter((r: any) => r.type === 'role').length;
          const emailCount = result.recipientDetails.filter((r: any) => r.type === 'email').length;
          if (roleCount > 0 && emailCount > 0) {
            successMessage += ` (${roleCount} role${roleCount > 1 ? 's' : ''}, ${emailCount} email${emailCount > 1 ? 's' : ''})`;
          } else if (roleCount > 0) {
            successMessage += ` (${roleCount} role${roleCount > 1 ? 's' : ''})`;
          }
        }
        
        toast({
          title: "Success",
          description: successMessage,
        });
        setShowForwardDialog(false);
        setEmailToForward(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error forwarding email:', error);
      toast({
        title: "Error",
        description: `Failed to forward email: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleForwardEmail = (email: Email) => {
    setEmailToForward(email);
    setShowForwardDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Email Integration</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your Gmail integration and auto-forwarding rules</p>
        </div>
        <div className="flex gap-2">
          {emailAccount.connected && (
            <Button onClick={syncEmails} disabled={loading} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Emails</span>
              <span className="sm:hidden">Sync</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="rules">Forwarding Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {!emailAccount.connected ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Connect Gmail Account
                </CardTitle>
                <CardDescription>
                  Connect your Gmail account to sync emails and set up auto-forwarding rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={connectGmail} className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Connect Gmail
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Email Account Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Gmail Account
                    </span>
                    <Badge className={getStatusColor(emailAccount.syncStatus || 'active')}>
                      {emailAccount.syncStatus || 'Active'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">{emailAccount.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Sync</Label>
                      <p className="text-sm text-muted-foreground">
                        {emailAccount.lastSyncAt ? formatDate(emailAccount.lastSyncAt) : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="sender">Sender</Label>
                      <Input
                        id="sender"
                        placeholder="Filter by sender"
                        value={filters.sender}
                        onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Filter by subject"
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="isRead">Status</Label>
                      <Select
                        value={filters.isRead?.toString() || 'all'}
                        onValueChange={(value) => 
                          setFilters({ ...filters, isRead: value === 'all' ? undefined : value === 'true' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="false">Unread</SelectItem>
                          <SelectItem value="true">Read</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={loadEmails} className="w-full">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Inbox ({emails.length} emails)</span>
                    <Button 
                      onClick={loadEmails} 
                      variant="outline" 
                      size="sm"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="max-w-md mx-auto">
                        <Mail className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-70" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Your Inbox is Empty
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Click the <strong>"Sync Emails"</strong> button above to fetch your latest emails from Gmail and see them here in your inbox.
                        </p>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-blue-900 mb-1">
                                First time here?
                              </p>
                              <p className="text-xs text-blue-800">
                                You need to manually sync your emails to view them in the portal. Click the sync button at the top of this page to get started.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button 
                          onClick={syncEmails} 
                          disabled={loading}
                          size="lg"
                          className="w-full max-w-xs mx-auto"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                          Sync Emails Now
                        </Button>
                        
                        {filters.sender || filters.subject || filters.isRead !== undefined ? (
                          <p className="text-xs text-gray-500 mt-4">
                            Or try clearing your filters above to see more results
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {emails.map((email) => (
                        <div
                          key={email._id}
                          className={`group p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
                            !email.isRead 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleEmailClick(email)}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            {/* Email Status Indicator */}
                            <div className="flex-shrink-0 mt-1">
                              {!email.isRead ? (
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full" />
                              ) : (
                                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-300 rounded-full" />
                              )}
                            </div>

                            {/* Email Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                                    {email.sender}
                                  </span>
                                  {email.isForwarded && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                      Forwarded
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {email.hasAttachments && (
                                    <span className="flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" />
                                      {email.attachmentCount}
                                    </span>
                                  )}
                                  <span>{formatDate(email.receivedAt)}</span>
                                </div>
                              </div>

                              {/* Subject */}
                              <h3 className={`font-medium text-xs sm:text-sm mb-1 sm:mb-2 truncate ${
                                !email.isRead ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {email.subject || '(No Subject)'}
                              </h3>

                              {/* Preview */}
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {email.bodyPreview || 'No preview available'}
                              </p>
                            </div>

                            {/* Action Indicators */}
                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleForwardEmail(email);
                                }}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                              >
                                <Forward className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 hover:text-blue-500" />
                              </Button>
                              <MailOpen className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold">Forwarding Rules</h2>
            <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create Rule</span>
                  <span className="sm:hidden">New Rule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Forwarding Rule</DialogTitle>
                  <DialogDescription>
                    Set up automatic email forwarding based on conditions
                  </DialogDescription>
                </DialogHeader>
                <CreateRuleForm onSubmit={createForwardingRule} onCancel={() => setShowCreateRule(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {forwardingRules.map((rule) => (
              <Card key={rule._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{rule.ruleName}</CardTitle>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteForwardingRule(rule._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Conditions</Label>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {rule.conditions.senderEmail && (
                          <p>From: {rule.conditions.senderEmail}</p>
                        )}
                        {rule.conditions.senderDomain && (
                          <p>Domain: {rule.conditions.senderDomain}</p>
                        )}
                        {rule.conditions.subjectKeywords && rule.conditions.subjectKeywords.length > 0 && (
                          <p>Subject contains: {rule.conditions.subjectKeywords.join(', ')}</p>
                        )}
                        {rule.conditions.bodyKeywords && rule.conditions.bodyKeywords.length > 0 && (
                          <p>Body contains: {rule.conditions.bodyKeywords.join(', ')}</p>
                        )}
                        {rule.conditions.hasAttachments !== undefined && (
                          <p>Has attachments: {rule.conditions.hasAttachments ? 'Yes' : 'No'}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Actions</Label>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Forward type: Full Email</p>
                        <p>Recipients: {rule.actions.recipients.map(r => r.value).join(', ')}</p>
                        {rule.actions.addNote && (
                          <p>Note: {rule.actions.addNote}</p>
                        )}
                        <p>Executed: {rule.executionCount} times</p>
                        {rule.lastExecutedAt && (
                          <p>Last run: {formatDate(rule.lastExecutedAt)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Auto-sync emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync new emails every 15 minutes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when forwarding rules are executed
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDisconnectDialog(true)}
                  className="w-full"
                >
                  Disconnect Gmail Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Forwarding Rule</DialogTitle>
              <DialogDescription>
                Update your forwarding rule settings
              </DialogDescription>
            </DialogHeader>
            <CreateRuleForm 
              rule={editingRule}
              onSubmit={(updates) => updateForwardingRule(editingRule._id, updates)}
              onCancel={() => setEditingRule(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Email View Modal */}
      {selectedEmail && (
        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Details
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* Email Header */}
                <div className="border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">From:</p>
                      <p className="text-sm text-gray-700 break-all">{selectedEmail.sender}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-medium text-gray-900">Date:</p>
                      <p className="text-sm text-gray-700">{formatDate(selectedEmail.receivedAt)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900">Subject:</p>
                    <p className="text-sm text-gray-700 font-medium break-words">{selectedEmail.subject || '(No Subject)'}</p>
                  </div>
                  {selectedEmail.hasAttachments && (
                    <div className="mt-2 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {selectedEmail.attachmentCount} attachment{selectedEmail.attachmentCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="border-b pb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Message:</p>
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.htmlBody ? (
                      <div 
                        className="email-content"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.htmlBody 
                        }}
                      />
                    ) : selectedEmail.textBody ? (
                      <div 
                        className="email-content whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.textBody.replace(/\n/g, '<br>') 
                        }}
                      />
                    ) : (
                      <div 
                        className="email-content whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.body?.replace(/\n/g, '<br>') || 'No content available' 
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Email Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Email ID: {selectedEmail._id}</p>
                  <p>Status: {selectedEmail.isRead ? 'Read' : 'Unread'}</p>
                  {selectedEmail.isForwarded && (
                    <p>Status: Forwarded</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEmailModal(false)} className="w-full sm:w-auto">
                Close
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedEmail.isRead) {
                    markAsRead(selectedEmail._id);
                  }
                  setShowEmailModal(false);
                }}
                className="w-full sm:w-auto"
              >
                {selectedEmail.isRead ? 'Mark as Unread' : 'Mark as Read'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Disconnect Gmail Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Gmail account? This will:
            </DialogDescription>
            <div className="mt-2">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Stop syncing emails from Gmail</li>
                <li>Remove all synced email data</li>
                <li>Disable all forwarding rules</li>
                <li>Require reconnection to use email features again</li>
              </ul>
            </div>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDisconnectDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={disconnectGmail}
            >
              Disconnect Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Email Dialog */}
      {emailToForward && (
        <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Forward className="w-5 h-5" />
                Forward Email
              </DialogTitle>
              <DialogDescription>
                Forward "{emailToForward.subject || '(No Subject)'}" to selected recipients
              </DialogDescription>
            </DialogHeader>
            <ForwardEmailForm 
              email={emailToForward}
              onSubmit={forwardEmail}
              onCancel={() => {
                setShowForwardDialog(false);
                setEmailToForward(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      </div>
    </DashboardLayout>
  );
}

// Create Rule Form Component
function CreateRuleForm({ rule, onSubmit, onCancel }: { 
  rule?: ForwardingRule; 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    ruleName: rule?.ruleName || '',
    isActive: rule?.isActive ?? true,
    conditions: {
      senderEmail: rule?.conditions.senderEmail || '',
      senderDomain: rule?.conditions.senderDomain || '',
      subjectKeywords: rule?.conditions.subjectKeywords?.join(', ') || '',
      bodyKeywords: rule?.conditions.bodyKeywords?.join(', ') || '',
      hasAttachments: rule?.conditions.hasAttachments
    },
    actions: {
      forwardType: 'full',
      recipients: rule?.actions.recipients || [{ type: 'role', value: 'manager' }],
      addNote: rule?.actions.addNote || ''
    }
  });

  const addRecipient = () => {
    setFormData({
      ...formData,
      actions: {
        ...formData.actions,
        recipients: [...formData.actions.recipients, { type: 'role', value: '' }]
      }
    });
  };

  const removeRecipient = (index: number) => {
    setFormData({
      ...formData,
      actions: {
        ...formData.actions,
        recipients: formData.actions.recipients.filter((_, i) => i !== index)
      }
    });
  };

  const updateRecipient = (index: number, field: string, value: string) => {
    const newRecipients = [...formData.actions.recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setFormData({
      ...formData,
      actions: { ...formData.actions, recipients: newRecipients }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ruleName: formData.ruleName,
      isActive: formData.isActive,
      conditions: {
        senderEmail: formData.conditions.senderEmail || undefined,
        senderDomain: formData.conditions.senderDomain || undefined,
        subjectKeywords: formData.conditions.subjectKeywords 
          ? formData.conditions.subjectKeywords.split(',').map(k => k.trim()).filter(k => k)
          : undefined,
        bodyKeywords: formData.conditions.bodyKeywords 
          ? formData.conditions.bodyKeywords.split(',').map(k => k.trim()).filter(k => k)
          : undefined,
        hasAttachments: formData.conditions.hasAttachments
      },
      actions: {
        forwardType: formData.actions.forwardType,
        recipients: formData.actions.recipients.filter(r => r.value),
        addNote: formData.actions.addNote || undefined
      }
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="ruleName">Rule Name</Label>
        <Input
          id="ruleName"
          value={formData.ruleName}
          onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
          placeholder="e.g., GST Notifications"
          required
        />
      </div>

      <div>
        <Label>Conditions</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div>
            <Label htmlFor="senderEmail">Sender Email</Label>
            <Input
              id="senderEmail"
              value={formData.conditions.senderEmail}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, senderEmail: e.target.value }
              })}
              placeholder="exact@email.com"
            />
          </div>
          <div>
            <Label htmlFor="senderDomain">Sender Domain</Label>
            <Input
              id="senderDomain"
              value={formData.conditions.senderDomain}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, senderDomain: e.target.value }
              })}
              placeholder="@gst.gov.in"
            />
          </div>
          <div>
            <Label htmlFor="subjectKeywords">Subject Keywords</Label>
            <Input
              id="subjectKeywords"
              value={formData.conditions.subjectKeywords}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, subjectKeywords: e.target.value }
              })}
              placeholder="GST, TDS, Return (comma separated)"
            />
          </div>
          <div>
            <Label htmlFor="bodyKeywords">Body Keywords</Label>
            <Input
              id="bodyKeywords"
              value={formData.conditions.bodyKeywords}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, bodyKeywords: e.target.value }
              })}
              placeholder="important, urgent (comma separated)"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Actions</Label>
        <div className="space-y-4 mt-2">
            <div>
              <Label>Forward Type</Label>
              <p className="text-sm text-gray-700 mt-1">Full Email</p>
            </div>

          <div>
            <Label>Recipients</Label>
            <div className="space-y-2">
              {formData.actions.recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={recipient.type}
                    onValueChange={(value) => updateRecipient(index, 'type', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={recipient.value}
                    onChange={(e) => updateRecipient(index, 'value', e.target.value)}
                    placeholder={recipient.type === 'role' ? 'manager, admin' : 'email@example.com'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRecipient(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addRecipient}>
                <Plus className="w-4 h-4 mr-2" />
                Add Recipient
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="addNote">Additional Note</Label>
            <Textarea
              id="addNote"
              value={formData.actions.addNote}
              onChange={(e) => setFormData({
                ...formData,
                actions: { ...formData.actions, addNote: e.target.value }
              })}
              placeholder="Optional note to add to forwarded emails"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {rule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  );
}

// Forward Email Form Component
function ForwardEmailForm({ email, onSubmit, onCancel }: { 
  email: Email; 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    forwardType: 'full',
    recipients: [{ type: 'role', value: 'manager' }],
    addNote: ''
  });

  const addRecipient = () => {
    setFormData({
      ...formData,
      recipients: [...formData.recipients, { type: 'role', value: '' }]
    });
  };

  const removeRecipient = (index: number) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index)
    });
  };

  const updateRecipient = (index: number, field: string, value: string) => {
    const newRecipients = [...formData.recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setFormData({
      ...formData,
      recipients: newRecipients
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      forwardType: formData.forwardType,
      recipients: formData.recipients.filter(r => r.value),
      addNote: formData.addNote || undefined
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Preview */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="text-sm">
          <p><strong>From:</strong> {email.sender}</p>
          <p><strong>Subject:</strong> {email.subject || '(No Subject)'}</p>
          <p><strong>Date:</strong> {new Date(email.receivedAt).toLocaleString()}</p>
          <p><strong>Preview:</strong> {email.bodyPreview?.substring(0, 100)}...</p>
        </div>
      </div>

        <div>
          <Label>Forward Type</Label>
          <p className="text-sm text-gray-700 mt-1">Full Email</p>
        </div>

      <div>
        <Label>Recipients</Label>
        <div className="space-y-2">
          {formData.recipients.map((recipient, index) => (
            <div key={index} className="flex gap-2">
              <Select
                value={recipient.type}
                onValueChange={(value) => updateRecipient(index, 'type', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={recipient.value}
                onChange={(e) => updateRecipient(index, 'value', e.target.value)}
                placeholder={recipient.type === 'role' ? 'manager, admin, team_member' : 'email@example.com'}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeRecipient(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRecipient}>
            <Plus className="w-4 h-4 mr-2" />
            Add Recipient
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="addNote">Additional Note (Optional)</Label>
        <Textarea
          id="addNote"
          value={formData.addNote}
          onChange={(e) => setFormData({
            ...formData,
            addNote: e.target.value
          })}
          placeholder="Add a note to the forwarded email..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Forward Email
        </Button>
      </div>
    </form>
  );
}
