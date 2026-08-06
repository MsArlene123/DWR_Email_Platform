import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// AI Email Writer API
// Calls Claude (via OpenRouter) to generate email content based on a prompt.
// The user describes what they want, Claude generates a full email with
// subject line + HTML body + plain text fallback.

const OPENROUTER_API_KEY = process.env.LLM_API_KEY;
const OPENROUTER_BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';

interface WriteEmailRequest {
  prompt: string;
  context?: {
    brand?: string;
    audience?: string;
    tone?: string;
    emailType?: 'welcome' | 'newsletter' | 'promotional' | 'drip' | 'follow-up' | 'announcement';
    existingSubject?: string;
  };
}

interface GeneratedEmail {
  subject: string;
  htmlContent: string;
  plainText: string;
}

export async function POST(req: Request) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if AI is configured
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI is not configured. Set LLM_API_KEY in .env' },
        { status: 503 }
      );
    }

    const body = (await req.json()) as WriteEmailRequest;
    const { prompt, context } = body;

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please describe what you want the email to be about' },
        { status: 400 }
      );
    }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(context);
    const userPrompt = buildUserPrompt(prompt, context);

    // Call OpenRouter (Claude API)
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://dwremail.online',
        'X-Title': 'DWR Email Platform',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai/write-email] OpenRouter error:', response.status, errorText);
      return NextResponse.json(
        { error: `AI service error (${response.status}). Please try again.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      return NextResponse.json(
        { error: 'AI returned no content. Please try again.' },
        { status: 502 }
      );
    }

    // Parse the AI response into structured email
    const email = parseAIResponse(aiContent);

    if (!email.subject || !email.htmlContent) {
      console.error('[ai/write-email] Failed to parse AI response:', aiContent.substring(0, 200));
      return NextResponse.json(
        { error: 'AI response was not in the expected format. Please try rephrasing your request.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
    });
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

  return `You are an expert email copywriter for ${brand}. You write engaging, conversion-focused emails that people actually want to read.

Your tone is ${tone}. You write clearly, avoid jargon, and always include a clear call-to-action.

You will be asked to write an email. You MUST respond in this exact format:

---SUBJECT---
The email subject line (keep under 60 characters for mobile)
---HTML---
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;">
  <!-- Your email HTML here. Use inline styles for email client compatibility. -->
  <!-- Include a clear call-to-action button. -->
  <!-- Include an unsubscribe placeholder: {{UNSUBSCRIBE_LINK}} -->
</body>
</html>
---PLAINTEXT---
The plain text version of the email (strip all HTML, keep the content readable)
---END---

Rules:
1. Always include the three sections: SUBJECT, HTML, PLAINTEXT
2. Use inline CSS styles in the HTML (email clients don't support external CSS)
3. Make the email mobile-responsive (max-width: 600px)
4. Include a clear call-to-action button
5. Include {{UNSUBSCRIBE_LINK}} placeholder at the bottom
6. Include {{FIRST_NAME}} placeholder where you'd personalize with the recipient's name
7. Keep the subject line under 60 characters
8. Don't use spam trigger words (FREE, ACT NOW, LIMITED TIME, etc.)
9. Write for a ${context?.audience || 'general'} audience`;
}

function buildUserPrompt(prompt: string, context?: WriteEmailRequest['context']): string {
  let userPrompt = `Write an email with the following requirements:\n\n${prompt}`;

  if (context?.emailType) {
    const typeDescriptions: Record<string, string> = {
      welcome: 'This is a welcome email for new subscribers.',
      newsletter: 'This is a newsletter email with updates and news.',
      promotional: 'This is a promotional email highlighting a product or service.',
      drip: 'This is part of a drip campaign — a sequence of emails sent over time.',
      'follow-up': 'This is a follow-up email after a previous interaction.',
      announcement: 'This is an announcement email about a new feature, event, or change.',
    };
    userPrompt += `\n\nEmail type: ${typeDescriptions[context.emailType] || context.emailType}`;
  }

  if (context?.audience) {
    userPrompt += `\nTarget audience: ${context.audience}`;
  }

  if (context?.existingSubject) {
    userPrompt += `\nExisting subject line (improve or replace): "${context.existingSubject}"`;
  }

  return userPrompt;
}

function parseAIResponse(content: string): GeneratedEmail {
  // Extract the three sections from the AI response
  const subjectMatch = content.match(/---SUBJECT---\s*(.*?)\s*---HTML---/s);
  const htmlMatch = content.match(/---HTML---\s*(.*?)\s*---PLAINTEXT---/s);
  const plainTextMatch = content.match(/---PLAINTEXT---\s*(.*?)\s*---END---/s);

  return {
    subject: subjectMatch?.[1]?.trim() || '',
    htmlContent: htmlMatch?.[1]?.trim() || '',
    plainText: plainTextMatch?.[1]?.trim() || '',
  };
}
