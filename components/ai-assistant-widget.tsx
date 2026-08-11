'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User, Save, FileText, UserPlus, Users, Rocket, Paperclip, Plus, History, Trash } from 'lucide-react';
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
  templateDrafts?: Array<{
    name: string;
    category: string;
    subject: string;
    body: string;
  }>;
  contactsDraft?: {
    listName: string;
    contacts: Array<{ email: string; firstName?: string; lastName?: string; companyName?: string }>;
  };
  campaignDrafts?: Array<{
    name: string;
    templateName: string;
    listName: string;
    accountEmail: string;
    schedule: string;
    rate: number;
  }>;
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
 * Parse ALL template drafts from an AI response.
 * The AI may return multiple templates in one response (e.g., a 3-email drip).
 * Returns an array of parsed templates, or null if none found.
 */
function parseTemplateDrafts(content: string): Message['templateDrafts'] | null {
  // Find ALL template blocks (global regex)
  const regex = /---TEMPLATE START---\s*\n([\s\S]*?)---TEMPLATE END---/g;
  const drafts: NonNullable<Message['templateDrafts']>[number][] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/Name:\s*(.+)/);
    const categoryMatch = block.match(/Category:\s*(.+)/);
    const subjectMatch = block.match(/Subject:\s*(.+)/);
    const bodyMatch = block.match(/---BODY START---\s*\n([\s\S]*?)---BODY END---/);

    if (subjectMatch && bodyMatch) {
      drafts.push({
        name: nameMatch?.[1]?.trim() || 'Untitled Template',
        category: categoryMatch?.[1]?.trim() || 'CUSTOM',
        subject: subjectMatch[1].trim(),
        body: bodyMatch[1].trim(),
      });
    }
  }

  return drafts.length > 0 ? drafts : null;
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

/**
 * Parse ALL campaign blocks from an AI response.
 * The AI may return multiple campaigns in one response (e.g., a 5-email drip).
 */
function parseCampaignDrafts(content: string): Message['campaignDrafts'] | null {
  const regex = /---CAMPAIGN START---\s*\n([\s\S]*?)---CAMPAIGN END---/g;
  const drafts: NonNullable<Message['campaignDrafts']>[number][] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/Name:\s*(.+)/);
    const templateMatch = block.match(/Template:\s*(.+)/);
    const listMatch = block.match(/List:\s*(.+)/);
    const accountMatch = block.match(/Account:\s*(.+)/);
    const scheduleMatch = block.match(/Schedule:\s*(.+)/);
    const rateMatch = block.match(/Rate:\s*(\d+)/);

    if (nameMatch && templateMatch && listMatch) {
      drafts.push({
        name: nameMatch[1].trim(),
        templateName: templateMatch[1].trim(),
        listName: listMatch[1].trim(),
        accountEmail: accountMatch?.[1]?.trim() || '',
        schedule: scheduleMatch?.[1]?.trim() || 'NOW',
        rate: rateMatch ? parseInt(rateMatch[1]) : 3,
      });
    }
  }

  return drafts.length > 0 ? drafts : null;
}

export function AIAssistantWidget() {
  // Persist chat state across page navigation using localStorage.
  // localStorage survives tab/browser close (unlike sessionStorage).
  // Chat history (last 10 conversations) is also stored in localStorage.
  const STORAGE_KEY_OPEN = 'ai-assistant-open';
  const STORAGE_KEY_CURRENT = 'ai-assistant-current';
  const STORAGE_KEY_HISTORY = 'ai-assistant-history';

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_OPEN) === 'true';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [uploadedDoc, setUploadedDoc] = useState<{ fileName: string; content: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<AssistantContext | null>(null);
  const [saveDialog, setSaveDialog] = useState<NonNullable<Message['templateDrafts']>[number] | null>(null);
  const [campaignDialog, setCampaignDialog] = useState<NonNullable<Message["campaignDrafts"]>[number] | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
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

  // Persist open/closed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_OPEN, String(isOpen));
    }
  }, [isOpen]);

  // Persist chat messages (current conversation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    // If a document was uploaded, prepend its content to the message
    let messageToSend = text;
    if (uploadedDoc) {
      messageToSend = `[UPLOADED DOCUMENT: "${uploadedDoc.fileName}"]\n\n${uploadedDoc.content}\n\n[/UPLOADED DOCUMENT]\n\n${text}`;
      setUploadedDoc(null); // consume the uploaded doc (use once)
    }

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
          message: messageToSend,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const responseText = data.response || 'Sorry, I could not process that.';

      // Check if the response contains template drafts or contacts draft
      const templateDrafts = parseTemplateDrafts(responseText);
      const contactsDraft = parseContactsDraft(responseText);
      const campaignDrafts = parseCampaignDrafts(responseText);

      const aiMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        templateDrafts: templateDrafts || undefined,
        contactsDraft: contactsDraft || undefined,
        campaignDrafts: campaignDrafts || undefined,
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

  const handleCreateCampaign = async () => {
    if (!campaignDialog) return;
    setCreatingCampaign(true);
    try {
      // Fetch context to resolve names to IDs
      const ctxRes = await fetch('/api/ai-assistant');
      const ctxData = await ctxRes.json();

      // Fuzzy match template: try exact, then startsWith, then includes
      const tplName = campaignDialog.templateName.toLowerCase();
      const template = ctxData.templates?.find((t: any) =>
        t.name.toLowerCase() === tplName ||
        t.name.toLowerCase().startsWith(tplName.split(':')[0]) ||
        t.name.toLowerCase().includes(tplName.split(':')[0].trim()) ||
        tplName.includes(t.name.toLowerCase().split(':')[0].trim())
      );

      // Fuzzy match list: try exact, then includes (both directions)
      const listName = campaignDialog.listName.toLowerCase().split('(')[0].trim();
      const list = ctxData.contactLists?.find((l: any) => {
        const ln = l.name.toLowerCase();
        return ln === campaignDialog.listName.toLowerCase() ||
          ln.includes(listName) ||
          listName.includes(ln.split('(')[0].trim()) ||
          ln.split('(')[0].trim().includes(listName);
      });

      // Fuzzy match account: try exact, then includes (both directions)
      const acctEmail = campaignDialog.accountEmail.toLowerCase();
      const account = ctxData.emailAccounts?.find((a: any) => {
        const ae = a.email.toLowerCase();
        return ae === acctEmail ||
          ae.includes(acctEmail.split('@')[0]) ||
          acctEmail.includes(ae.split('@')[0]) ||
          ae.split('@')[0] === acctEmail.split('@')[0];
      });

      // If no account specified or found, use the first active one
      const fallbackAccount = ctxData.emailAccounts?.find((a: any) => a.isActive);

      if (!template) {
        toast.error(`Template "${campaignDialog.templateName}" not found. Available: ${ctxData.templates?.slice(0, 3).map((t:any)=>t.name).join(', ')}...`);
        setCreatingCampaign(false);
        return;
      }
      if (!list) {
        toast.error(`List "${campaignDialog.listName}" not found. Available: ${ctxData.contactLists?.slice(0, 3).map((l:any)=>l.name).join(', ')}...`);
        setCreatingCampaign(false);
        return;
      }
      if (!account && !fallbackAccount) {
        toast.error(`No email account found. Add one in Dashboard → Email Accounts.`);
        setCreatingCampaign(false);
        return;
      }

      const useAccount = account || fallbackAccount;

      const res = await fetch('/api/ai-assistant/create-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignDialog.name,
          templateId: template.id,
          sheetId: list.id,
          emailAccountId: useAccount.id,
          scheduledStart: campaignDialog.schedule === 'NOW' ? null : campaignDialog.schedule,
          sendingRate: campaignDialog.rate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Campaign created!');
        setCampaignDialog(null);
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch {
      toast.error('Network error');
    }
    setCreatingCampaign(false);
  };

  // ─── File upload handler ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai-assistant/upload-document', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadedDoc({ fileName: data.fileName, content: data.content });
        toast.success(`Uploaded "${data.fileName}" — the AI will use it as context`);
      } else {
        toast.error(data.error || 'Failed to upload file');
      }
    } catch {
      toast.error('Network error');
    }
    setUploading(false);
    e.target.value = '';
  };

  // ─── New chat (save current to history, start fresh) ─────────────────────
  const handleNewChat = () => {
    if (messages.length > 0) {
      // Save current conversation to history
      try {
        const historyRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
        const history: Array<{ id: string; timestamp: number; preview: string; messages: Message[] }> =
          historyRaw ? JSON.parse(historyRaw) : [];

        // Get first user message as preview
        const firstUserMsg = messages.find((m) => m.role === 'user');
        const preview = firstUserMsg
          ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
          : 'Conversation';

        history.unshift({
          id: `chat-${Date.now()}`,
          timestamp: Date.now(),
          preview,
          messages,
        });

        // Keep only last 10
        const trimmed = history.slice(0, 10);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
      } catch {
        // ignore storage errors
      }
    }
    setMessages([]);
    setUploadedDoc(null);
    setShowHistory(false);
  };

  // ─── Load a saved conversation ────────────────────────────────────────────
  const handleLoadHistory = (chatId: string) => {
    try {
      const historyRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history: Array<{ id: string; timestamp: number; preview: string; messages: Message[] }> =
        historyRaw ? JSON.parse(historyRaw) : [];
      const chat = history.find((c) => c.id === chatId);
      if (chat) {
        setMessages(chat.messages);
        setShowHistory(false);
      }
    } catch {
      // ignore
    }
  };

  // ─── Delete a saved conversation ──────────────────────────────────────────
  const handleDeleteHistory = (chatId: string) => {
    try {
      const historyRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history: Array<{ id: string; timestamp: number; preview: string; messages: Message[] }> =
        historyRaw ? JSON.parse(historyRaw) : [];
      const filtered = history.filter((c) => c.id !== chatId);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  };

  // ─── Get history list for display ─────────────────────────────────────────
  const getHistoryList = () => {
    try {
      const historyRaw = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history: Array<{ id: string; timestamp: number; preview: string; messages: Message[] }> =
        historyRaw ? JSON.parse(historyRaw) : [];
      return history;
    } catch {
      return [];
    }
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
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="New chat"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Chat history"
                title="Chat History"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="border-b border-gray-200 bg-gray-50 max-h-[200px] overflow-y-auto">
              {getHistoryList().length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">No saved conversations yet</p>
              ) : (
                getHistoryList().map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                    onClick={() => handleLoadHistory(chat.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{chat.preview}</p>
                      <p className="text-xs text-gray-400">{new Date(chat.timestamp).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteHistory(chat.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

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
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-300 text-gray-900 rounded-bl-sm font-medium'
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
                  {/* Save as Template buttons (one per template) */}
                  {msg.templateDrafts && msg.templateDrafts.length > 0 && (
                    <div className="flex flex-col gap-2 ml-9">
                      {msg.templateDrafts.map((tpl, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-xs self-start"
                          onClick={() => setSaveDialog(tpl)}
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Save: {tpl.name.length > 35 ? tpl.name.slice(0, 35) + '...' : tpl.name}
                        </Button>
                      ))}
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
                  {/* Create Campaign buttons (one per campaign) */}
                  {msg.campaignDrafts && msg.campaignDrafts.length > 0 && (
                    <div className="flex flex-col gap-2 ml-9">
                      {msg.campaignDrafts.map((camp, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-xs self-start"
                          onClick={() => setCampaignDialog(camp)}
                        >
                          <Rocket className="w-3.5 h-3.5 mr-1" />
                          Launch: {camp.name.length > 40 ? camp.name.slice(0, 40) + '...' : camp.name}
                        </Button>
                      ))}
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
            {/* Uploaded document indicator */}
            {uploadedDoc && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs text-blue-700 truncate flex-1">{uploadedDoc.fileName}</span>
                <button
                  onClick={() => setUploadedDoc(null)}
                  className="text-blue-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.pdf,.docx,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                title="Upload document"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={uploadedDoc ? "Ask about the uploaded document..." : "Ask me to draft, recommend, or plan..."}
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
              Press Enter to send · Shift+Enter for new line · 📎 Upload docs for context
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

      {/* Create Campaign Dialog */}
      <Dialog open={!!campaignDialog} onOpenChange={(open) => !open && setCampaignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-orange-600" />
              Create Campaign
            </DialogTitle>
          </DialogHeader>
          {campaignDialog && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Campaign Name:</span>
                  <span className="font-medium text-gray-900">{campaignDialog.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Template:</span>
                  <span className="font-medium text-gray-900">{campaignDialog.templateName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Contact List:</span>
                  <span className="font-medium text-gray-900">{campaignDialog.listName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sending Account:</span>
                  <span className="font-medium text-gray-900">{campaignDialog.accountEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Schedule:</span>
                  <span className="font-medium text-gray-900">
                    {campaignDialog.schedule === 'NOW' ? 'Immediately' : campaignDialog.schedule}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Send Rate:</span>
                  <span className="font-medium text-gray-900">{campaignDialog.rate} min between emails</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                The campaign will be created and the cron job will start sending emails within 2 minutes.
                You can monitor progress in Dashboard → Campaigns.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCampaignDialog(null)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleCreateCampaign}
              disabled={creatingCampaign}
            >
              {creatingCampaign ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              {creatingCampaign ? 'Creating...' : 'Launch Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
