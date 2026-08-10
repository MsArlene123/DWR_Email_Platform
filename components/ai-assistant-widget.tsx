'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User, Save, FileText, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  templateDraft?: {
    name: string;
    category: string;
    subject: string;
    body: string;
  };
  contactsDraft?: {
    listName: string;
    contacts: Array<{ email: string; firstName?: string; lastName?: string; companyName?: string }>;
  };
}

interface AssistantContext {
  templateCount: number;
  listCount: number;
  accountCount: number;
  llmConfigured: boolean;
}

const QUICK_PROMPTS = [
  'What should I send next?',
  'List my templates',
  'How many contacts do I have?',
  'Check account health',
];

const CATEGORIES = [
  'CUSTOM', 'NONPROFIT', 'ATTORNEY_LEGAL', 'BOOKSTORE_MEDIA', 'GENERAL_BUSINESS',
  'PRESS_MEDIA', 'LAWYERS', 'WOMEN_OWNED_BUSINESS', 'SHELTER_HOUSING', 'CHILDCARE',
  'HEALTHCARE_CLINIC', 'SPIRITUAL_HEALING', 'WOMEN_MONEY',
  'SUPPORTIVE_GROWTH_COUNSELORS', 'LEGAL_RESOURCES', 'EMPLOYMENT', 'EDUCATION',
  'AFFILIATES', 'LEGAL_AID', 'CREDIT_COUNSELING', 'HUD_COUNSELORS',
];

/**
 * Parse an AI response for a template draft.
 * The AI is instructed to use this format:
 *   ---TEMPLATE START---
 *   Name: ...
 *   Category: ...
 *   Subject: ...
 *   ---BODY START---
 *   ...email body...
 *   ---BODY END---
 *   ---TEMPLATE END---
 *
 * If found, returns the parsed template. Otherwise returns null.
 */
function parseTemplateDraft(content: string): Message['templateDraft'] | null {
  const templateMatch = content.match(
    /---TEMPLATE START---\s*\n([\s\S]*?)---TEMPLATE END---/
  );
  if (!templateMatch) return null;

  const block = templateMatch[1];
  const nameMatch = block.match(/Name:\s*(.+)/);
  const categoryMatch = block.match(/Category:\s*(.+)/);
  const subjectMatch = block.match(/Subject:\s*(.+)/);
  const bodyMatch = block.match(/---BODY START---\s*\n([\s\S]*?)---BODY END---/);

  if (!subjectMatch || !bodyMatch) return null;

  return {
    name: nameMatch?.[1]?.trim() || 'Untitled Template',
    category: categoryMatch?.[1]?.trim() || 'CUSTOM',
    subject: subjectMatch[1].trim(),
    body: bodyMatch[1].trim(),
  };
}

/**
 * Parse an AI response for a contacts block.
 * Format:
 *   ---CONTACTS START---
 *   List: [list name]
 *   ---CONTACTS DATA---
 *   email,firstName,lastName,companyName
 *   ...
 *   ---CONTACTS END---
 */
function parseContactsDraft(content: string): Message['contactsDraft'] | null {
  const match = content.match(
    /---CONTACTS START---\s*\n([\s\S]*?)---CONTACTS END---/
  );
  if (!match) return null;

  const block = match[1];
  const listMatch = block.match(/List:\s*(.+)/);
  const dataMatch = block.match(/---CONTACTS DATA---\s*\n([\s\S]*?)$/);

  if (!listMatch || !dataMatch) return null;

  const listName = listMatch[1].trim();
  const lines = dataMatch[1].trim().split('\n').filter((l) => l.trim());

  const contacts = lines.map((line) => {
    const parts = line.split(',').map((p) => p.trim());
    return {
      email: parts[0] || '',
      firstName: parts[1] || undefined,
      lastName: parts[2] || undefined,
      companyName: parts[3] || undefined,
    };
  }).filter((c) => c.email && c.email.includes('@'));

  if (contacts.length === 0) return null;

  return { listName, contacts };
}

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<AssistantContext | null>(null);
  const [saveDialog, setSaveDialog] = useState<Message['templateDraft'] | null>(null);
  const [contactsDialog, setContactsDialog] = useState<Message['contactsDraft'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingContacts, setAddingContacts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/ai-assistant')
      .then((res) => res.json())
      .then((data) => {
        setContext({
          templateCount: data.templates?.length || 0,
          listCount: data.contactLists?.length || 0,
          accountCount: data.emailAccounts?.length || 0,
          llmConfigured: data.llmConfigured ?? false,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const responseText = data.response || 'Sorry, I could not process that.';

      // Check if the response contains a template draft or contacts draft
      const templateDraft = parseTemplateDraft(responseText);
      const contactsDraft = parseContactsDraft(responseText);

      const aiMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        templateDraft: templateDraft || undefined,
        contactsDraft: contactsDraft || undefined,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.', timestamp: Date.now() },
      ]);
    }
    setLoading(false);
  }, [messages, loading]);

  const handleSaveTemplate = async () => {
    if (!saveDialog) return;
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveDialog.name,
          category: saveDialog.category,
          subject: saveDialog.subject,
          htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">${saveDialog.body.replace(/\n/g, '<br>')}</div>`,
          plainText: saveDialog.body,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Template "${saveDialog.name}" saved!`);
        setSaveDialog(null);
      } else {
        toast.error(data.error || 'Failed to save template');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  };

  const handleAddContacts = async () => {
    if (!contactsDialog) return;
    setAddingContacts(true);
    try {
      // Find the list ID by name from context
      const ctxRes = await fetch('/api/ai-assistant');
      const ctxData = await ctxRes.json();
      const list = ctxData.contactLists?.find(
        (l: any) => l.name === contactsDialog.listName || l.name.includes(contactsDialog.listName.split('(')[0].trim())
      );

      if (!list) {
        toast.error(`List "${contactsDialog.listName}" not found`);
        setAddingContacts(false);
        return;
      }

      const res = await fetch('/api/contacts/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: list.id,
          contacts: contactsDialog.contacts,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Added ${data.created} contacts to "${data.listName}" (${data.skipped} duplicates skipped)`);
        setContactsDialog(null);
      } else {
        toast.error(data.error || 'Failed to add contacts');
      }
    } catch {
      toast.error('Network error');
    }
    setAddingContacts(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center transition-all hover:scale-105 group"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-6 h-6 text-white" />
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
          {context && !context.llmConfigured && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] h-[620px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-xs text-blue-100">
                  {context
                    ? `${context.templateCount} templates · ${context.listCount} lists · ${context.accountCount} accounts`
                    : 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  How can I help you with your email campaigns?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ask me to draft templates, recommend sends, or plan campaigns.
                </p>
                <div className="mt-4 space-y-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  {/* Save as Template button */}
                  {msg.templateDraft && (
                    <div className="flex gap-2 ml-9">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs"
                        onClick={() => setSaveDialog(msg.templateDraft)}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        Save as Template
                      </Button>
                    </div>
                  )}
                  {/* Add Contacts button */}
                  {msg.contactsDraft && (
                    <div className="flex gap-2 ml-9">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-xs"
                        onClick={() => setContactsDialog(msg.contactsDraft)}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Add {msg.contactsDraft.contacts.length} Contacts
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me to draft, recommend, or plan..."
                rows={1}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
                disabled={loading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                size="icon"
                className="flex-shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={!!saveDialog} onOpenChange={(open) => !open && setSaveDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Save as Template
            </DialogTitle>
          </DialogHeader>
          {saveDialog && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input
                  id="tpl-name"
                  value={saveDialog.name}
                  onChange={(e) => setSaveDialog({ ...saveDialog, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={saveDialog.category}
                  onValueChange={(v) => setSaveDialog({ ...saveDialog, category: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tpl-subject">Subject Line</Label>
                <Input
                  id="tpl-subject"
                  value={saveDialog.subject}
                  onChange={(e) => setSaveDialog({ ...saveDialog, subject: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tpl-body">Email Body</Label>
                <Textarea
                  id="tpl-body"
                  value={saveDialog.body}
                  onChange={(e) => setSaveDialog({ ...saveDialog, body: e.target.value })}
                  rows={12}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contacts Dialog */}
      <Dialog open={!!contactsDialog} onOpenChange={(open) => !open && setContactsDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Add Contacts to List
            </DialogTitle>
          </DialogHeader>
          {contactsDialog && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Target List:</strong> {contactsDialog.listName}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {contactsDialog.contacts.length} contacts will be added. Duplicates will be skipped automatically.
                </p>
              </div>
              <div>
                <Label>Contacts Preview (first 20)</Label>
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Email</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">First</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Last</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contactsDialog.contacts.slice(0, 20).map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-900 font-mono text-xs">{c.email}</td>
                          <td className="px-3 py-1.5 text-gray-600">{c.firstName || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{c.lastName || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{c.companyName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {contactsDialog.contacts.length > 20 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ... and {contactsDialog.contacts.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContactsDialog(null)}>Cancel</Button>
            <Button onClick={handleAddContacts} disabled={addingContacts}>
              {addingContacts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {addingContacts ? 'Adding...' : `Add ${contactsDialog?.contacts.length || 0} Contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
