import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// AI Email Writer API
// Uses OpenRouter (LLM_API_KEY) with fallback to z-ai-web-dev-sdk (GLM 5.2).
// Default model: meta-llama/llama-3.1-70b-instruct (works on OpenRouter free tier).

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'meta-llama/llama-3.1-70b-instruct';

interface WriteEmailRequest {
  prompt: string;
  context?: {
    brand?: string;
    audience?: string;
    tone?: string;
    emailType?: 'welcome' | 'newsletter' | 'promotional' | 'drip' | 'follow-up' | 'announcement';
    existingSubject?: string;
    contactList?: string;
    senderEmail?: string;
    senderName?: string;
  };
}

interface GeneratedEmail {
  subject: string;
  htmlContent: string;
  plainText: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as WriteEmailRequest;
    const { prompt, context } = body;

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please describe what you want the email to be about' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(prompt, context);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let aiContent: string | null = null;

    // Try OpenRouter first
    if (LLM_API_KEY) {
      try {
        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LLM_API_KEY}`,
            'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://dwremail.online',
            'X-Title': 'DWR Email Platform',
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiContent = data.choices?.[0]?.message?.content;
        } else {
          console.error('[ai/write-email] OpenRouter error:', response.status);
        }
      } catch (error) {
        console.error('[ai/write-email] OpenRouter fetch error:', error);
      }
    }

    // Fallback: z-ai-web-dev-sdk (GLM 5.2)
    if (!aiContent) {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zaiClient = await ZAI.create();
        const completion = await zaiClient.chat.completions.create({
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        });
        aiContent = completion.choices?.[0]?.message?.content;
      } catch (error) {
        console.error('[ai/write-email] z-ai-sdk error:', error);
      }
    }

    if (!aiContent) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const email = parseAIResponse(aiContent);

    if (!email.subject || !email.htmlContent) {
      console.error('[ai/write-email] Failed to parse AI response:', aiContent.substring(0, 200));
      return NextResponse.json(
        { error: 'AI response was not in the expected format. Please try rephrasing your request.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    console.error('[ai/write-email] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate email' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context?: WriteEmailRequest['context']): string {
  const brand = context?.brand || 'DocWriteReview';
  const tone = context?.tone || 'professional but warm';

  let senderContext = '';
  if (context?.senderEmail) {
    senderContext = `\n\nThis email will be sent from: ${context.senderName || ''} <${context.senderEmail}>.
Match the sender's brand voice. If the sender email is from bankruptcy.forum, the tone should be legal-professional. If from womenshield.help, the tone should be protective and supportive. If from docwritereview.work, the tone should be business-professional.`;
  }

  let listContext = '';
  if (context?.contactList) {
    listContext = `\n\nThis email will be sent to the "${context.contactList}" contact list. Consider the list name when personalizing the content.`;
  }

  return `You are an expert email copywriter for ${brand}. You write engaging, conversion-focused emails.

Your tone is ${tone}.${senderContext}${listContext}

You MUST respond in this exact format:

---SUBJECT---
The email subject line (keep under 60 characters)
---HTML---
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
  <!-- Email content with inline styles -->
  <!-- Include {{FIRST_NAME}} for personalization -->
  <!-- Include {{UNSUBSCRIBE_LINK}} at the bottom -->
</body>
</html>
---PLAINTEXT---
Plain text version
---END---

Rules:
1. Always include all sections: SUBJECT, HTML, PLAINTEXT
2. Use inline CSS in HTML (email clients don't support external CSS)
3. Mobile-responsive (max-width: 600px)
4. Include a clear call-to-action
5. Include {{UNSUBSCRIBE_LINK}} and {{FIRST_NAME}} placeholders
6. Subject line under 60 characters
7. No spam trigger words (FREE, ACT NOW, LIMITED TIME)`;
}

function buildUserPrompt(prompt: string, context?: WriteEmailRequest['context']): string {
  let userPrompt = `Write an email with the following requirements:\n\n${prompt}`;

  if (context?.emailType) {
    userPrompt += `\n\nEmail type: ${context.emailType}`;
  }
  if (context?.audience) {
    userPrompt += `\nTarget audience: ${context.audience}`;
  }
  if (context?.existingSubject) {
    userPrompt += `\nExisting subject (improve or replace): "${context.existingSubject}"`;
  }

  return userPrompt;
}

function parseAIResponse(content: string): GeneratedEmail {
  const subjectMatch = content.match(/---SUBJECT---\s*(.*?)\s*---HTML---/s);
  const htmlMatch = content.match(/---HTML---\s*(.*?)\s*---PLAINTEXT---/s);
  const plainTextMatch = content.match(/---PLAINTEXT---\s*(.*?)\s*---END---/s);

  return {
    subject: subjectMatch?.[1]?.trim() || '',
    htmlContent: htmlMatch?.[1]?.trim() || '',
    plainText: plainTextMatch?.[1]?.trim() || '',
  };
}
