'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AIWriterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (email: { subject: string; htmlContent: string; plainText: string }) => void;
  existingSubject?: string;
}

const EMAIL_TYPES = [
  { value: 'welcome', label: '👋 Welcome Email' },
  { value: 'newsletter', label: '📰 Newsletter' },
  { value: 'promotional', label: '💰 Promotional' },
  { value: 'drip', label: '💧 Drip Campaign' },
  { value: 'follow-up', label: '🔄 Follow-up' },
  { value: 'announcement', label: '📢 Announcement' },
] as const;

const TONES = [
  { value: 'professional but warm', label: 'Professional & Warm' },
  { value: 'friendly and casual', label: 'Friendly & Casual' },
  { value: 'urgent and direct', label: 'Urgent & Direct' },
  { value: 'empathetic and supportive', label: 'Empathetic & Supportive' },
  { value: 'authoritative and informative', label: 'Authoritative' },
] as const;

const PROMPT_EXAMPLES = [
  'Welcome email for new Bankruptcy.Forum subscribers — introduce the platform and encourage them to start their bankruptcy journey',
  'Email announcing the "Hold On, Don\'t Panic" live seminar on August 29 — include the Eventbrite link and urgency',
  'Follow-up email for someone who started but didn\'t complete their bankruptcy questionnaire',
  'Newsletter about recent changes to bankruptcy law and how it affects filers',
  'Promotional email for the Chapter 7 Complete package at 20% off this week only',
];

export function AIWriterDialog({
  open,
  onOpenChange,
  onInsert,
  existingSubject,
}: AIWriterDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [emailType, setEmailType] = useState<string>('welcome');
  const [tone, setTone] = useState<string>('professional but warm');
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim() || prompt.trim().length < 5) {
      toast.error('Please describe what you want the email to be about');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/write-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          context: {
            emailType: emailType as any,
            tone,
            audience: audience.trim() || undefined,
            existingSubject: existingSubject || undefined,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate email');
      }

      toast.success('Email generated! Review and edit below.');
      onInsert(data.email);
      onOpenChange(false);
      setPrompt('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Write with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email type */}
          <div>
            <Label className="text-sm font-medium">Email Type</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMAIL_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEmailType(type.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    emailType === type.value
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <Label className="text-sm font-medium">Tone</Label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audience (optional) */}
          <div>
            <Label className="text-sm font-medium">
              Target Audience <span className="text-gray-400">(optional)</span>
            </Label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., people facing bankruptcy, parents of school-age children"
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Prompt */}
          <div>
            <Label className="text-sm font-medium">What should the email be about?</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the email to say..."
              rows={4}
              className="mt-1"
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Quick examples:</p>
              <div className="flex flex-wrap gap-1">
                {PROMPT_EXAMPLES.slice(0, 3).map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                  >
                    {example.substring(0, 50)}...
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
