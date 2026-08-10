/**
 * /api/ai-assistant
 *
 * The AI Email Marketing Assistant.
 *
 * GET  — returns the user's context (templates, lists, accounts, campaigns)
 * POST — sends a message to the AI and returns the response
 *
 * The assistant uses the same LLM integration as the AI Email Writer
 * (LLM_API_KEY + LLM_BASE_URL + LLM_MODEL env vars, defaulting to
 * OpenRouter with Claude 3.5 Sonnet).
 *
 * If no LLM_API_KEY is configured, the assistant falls back to a
 * rule-based helper that can still list templates, recommend sends,
 * and calculate batch schedules.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gatherContext, buildSystemPrompt } from "@/lib/ai-assistant-context";

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
const LLM_MODEL = process.env.LLM_MODEL || "anthropic/claude-3.5-sonnet";

// ─── GET: Return context for the widget ────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await gatherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Failed to gather context" }, { status: 500 });
  }

  return NextResponse.json({
    ...ctx,
    llmConfigured: !!LLM_API_KEY,
  });
}

// ─── POST: Send a message to the AI ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, history } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Gather current context
  const ctx = await gatherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Failed to gather context" }, { status: 500 });
  }

  const systemPrompt = buildSystemPrompt(ctx);

  // Build the conversation
  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []).map((h: { role: string; content: string }) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  // If no LLM key, use the fallback helper
  if (!LLM_API_KEY) {
    const fallback = generateFallbackResponse(message, ctx);
    return NextResponse.json({
      response: fallback,
      llmConfigured: false,
      context: {
        templateCount: ctx.templates.length,
        listCount: ctx.contactLists.length,
        accountCount: ctx.emailAccounts.length,
      },
    });
  }

  // Call the LLM
  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("AI assistant LLM error:", response.status, errText);
      const fallback = generateFallbackResponse(message, ctx);
      return NextResponse.json({
        response: fallback + "\n\n*(Note: The AI service returned an error. Showing a basic response instead.)*",
        llmConfigured: true,
        llmError: `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    const aiResponse =
      data.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";

    return NextResponse.json({
      response: aiResponse,
      llmConfigured: true,
      context: {
        templateCount: ctx.templates.length,
        listCount: ctx.contactLists.length,
        accountCount: ctx.emailAccounts.length,
      },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    const fallback = generateFallbackResponse(message, ctx);
    return NextResponse.json({
      response: fallback + "\n\n*(Note: The AI service was unreachable. Showing a basic response instead.)*",
      llmConfigured: true,
      llmError: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ─── Fallback helper (no LLM required) ─────────────────────────────────────
function generateFallbackResponse(
  message: string,
  ctx: NonNullable<Awaited<ReturnType<typeof gatherContext>>>
): string {
  const lower = message.toLowerCase();

  // Template listing
  if (lower.includes("template") && (lower.includes("list") || lower.includes("show") || lower.includes("what"))) {
    const byCategory: Record<string, typeof ctx.templates> = {};
    ctx.templates.forEach((t) => {
      if (!byCategory[t.category]) byCategory[t.category] = [];
      byCategory[t.category].push(t);
    });

    let response = `You have **${ctx.templates.length} templates** across ${Object.keys(byCategory).length} categories:\n\n`;
    for (const [cat, templates] of Object.entries(byCategory)) {
      response += `**${cat}** (${templates.length}):\n`;
      templates.forEach((t) => {
        response += `  • ${t.name}\n    Subject: "${t.subject}"\n`;
      });
      response += "\n";
    }
    response += `Go to **Dashboard → Templates** to view or edit any of these.`;
    return response;
  }

  // Contact list info
  if (lower.includes("list") && (lower.includes("contact") || lower.includes("how many"))) {
    const totalContacts = ctx.contactLists.reduce((sum, l) => sum + l.recipientCount, 0);
    let response = `You have **${ctx.contactLists.length} contact lists** with **${totalContacts.toLocaleString()} total contacts**:\n\n`;
    ctx.contactLists.forEach((l) => {
      response += `  • ${l.name}: ${l.recipientCount.toLocaleString()} contacts\n`;
    });
    return response;
  }

  // Account health
  if (lower.includes("account") || lower.includes("quota") || lower.includes("limit") || lower.includes("health")) {
    if (ctx.emailAccounts.length === 0) {
      return `You have **no email accounts configured**. Go to **Dashboard → Email Accounts → Connect** to add your SMTP accounts (Gmail, Titan, Zoho, etc.). You need at least one sending account before you can launch campaigns.`;
    }
    let response = `You have **${ctx.emailAccounts.length} email account(s)**:\n\n`;
    ctx.emailAccounts.forEach((a) => {
      response += `  • ${a.email} (${a.type})\n`;
      response += `    Status: ${a.isActive ? "✅ Active" : "❌ Inactive"}\n`;
      response += `    Daily limit: ${a.dailyLimit} | Sent today: ${a.emailsSentToday} | Remaining: ${a.remaining}\n`;
    });
    return response;
  }

  // Campaign suggestions
  if (lower.includes("recommend") || lower.includes("suggest") || lower.includes("which") || lower.includes("should i")) {
    if (ctx.templates.length === 0) {
      return `You don't have any templates yet. Go to **Dashboard → Templates** to create one, or use the AI Writer to generate one.`;
    }
    if (ctx.contactLists.length === 0) {
      return `You don't have any contact lists yet. Go to **Dashboard → Google Sheets → Add Sheet** to import your contacts.`;
    }
    let response = `Here's what I recommend based on your current setup:\n\n`;
    response += `**Ready to send:**\n`;
    response += `  1. Pick a template from your ${ctx.templates.length} available\n`;
    response += `  2. Choose a contact list (${ctx.contactLists.length} available)\n`;
    response += `  3. Select an email account with remaining quota\n\n`;
    response += `**Quick start:**\n`;
    const firstTemplate = ctx.templates[0];
    const firstList = ctx.contactLists[0];
    const firstAccount = ctx.emailAccounts.find((a) => a.isActive && a.remaining > 0);
    if (firstTemplate && firstList) {
      response += `  • Template: "${firstTemplate.name}"\n`;
      response += `  • List: ${firstList.name} (${firstList.recipientCount} contacts)\n`;
      if (firstAccount) {
        response += `  • Account: ${firstAccount.email} (${firstAccount.remaining} sends remaining today)\n`;
        if (firstList.recipientCount > firstAccount.remaining) {
          response += `\n  ⚠️ This list has ${firstList.recipientCount} contacts but ${firstAccount.email} can only send ${firstAccount.remaining} more today. The campaign will send in batches across multiple days.\n`;
        }
      } else {
        response += `  ⚠️ No active email accounts with remaining quota. Wait for the daily reset or add another account.\n`;
      }
    }
    response += `\nGo to **Dashboard → Campaigns → New Campaign** to create it.`;
    return response;
  }

  // Default
  let response = `I can help you with:\n\n`;
  response += `  📋 **"List my templates"** — Show all available email templates\n`;
  response += `  📊 **"How many contacts do I have?"** — Show contact list summary\n`;
  response += `  🔌 **"Check account health"** — Show email account quotas\n`;
  response += `  💡 **"What should I send?"** — Get campaign recommendations\n\n`;
  response += `You have ${ctx.templates.length} templates, ${ctx.contactLists.length} contact lists, and ${ctx.emailAccounts.length} email accounts.\n\n`;
  response += `*(Note: Full AI capabilities require LLM_API_KEY to be configured. The assistant is running in basic mode.)*`;
  return response;
}
