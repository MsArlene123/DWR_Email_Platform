/**
 * /api/ai-assistant
 *
 * The AI Email Marketing Assistant.
 *
 * Uses OpenRouter (configurable via LLM_API_KEY + LLM_MODEL env vars).
 * Falls back to z-ai-web-dev-sdk (GLM 5.2) if OpenRouter is not configured.
 * Falls back to rule-based responses if both fail.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gatherContext, buildSystemPrompt } from "@/lib/ai-assistant-context";

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
const LLM_MODEL = process.env.LLM_MODEL || "meta-llama/llama-3.1-70b-instruct";

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

  const ctx = await gatherContext();
  if (!ctx) {
    return NextResponse.json({ error: "Failed to gather context" }, { status: 500 });
  }

  const systemPrompt = buildSystemPrompt(ctx);

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []).map((h: { role: string; content: string }) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  // Try OpenRouter first
  if (LLM_API_KEY) {
    try {
      const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LLM_API_KEY}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL || "https://dwremail.online",
          "X-Title": "DWR Email Platform",
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages,
          temperature: 0.4,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;
        if (aiResponse) {
          return NextResponse.json({
            response: aiResponse,
            llmConfigured: true,
            provider: "openrouter",
            model: LLM_MODEL,
          });
        }
      }

      // OpenRouter returned an error — log it and fall through to fallback
      const errText = await response.text().catch(() => "");
      console.error("AI assistant OpenRouter error:", response.status, errText);
    } catch (error) {
      console.error("AI assistant OpenRouter fetch error:", error);
    }
  }

  // Fallback: try z-ai-web-dev-sdk (GLM 5.2)
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zaiClient = await ZAI.create();

    const completion = await zaiClient.chat.completions.create({
      messages,
      temperature: 0.4,
      max_tokens: 2000,
    });

    const aiResponse =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";

    return NextResponse.json({
      response: aiResponse,
      llmConfigured: true,
      provider: "z-ai-sdk",
    });
  } catch (error) {
    console.error("AI assistant z-ai-sdk error:", error);
  }

  // Final fallback: rule-based responses
  const fallback = generateFallbackResponse(message, ctx);
  return NextResponse.json({
    response: fallback + "\n\n*(Note: Both AI services were unreachable. Showing a basic response.)*",
    llmConfigured: !!LLM_API_KEY,
    provider: "fallback",
  });
}

// ─── Fallback helper ───────────────────────────────────────────────────────
function generateFallbackResponse(
  message: string,
  ctx: NonNullable<Awaited<ReturnType<typeof gatherContext>>>
): string {
  const lower = message.toLowerCase();

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

  if (lower.includes("list") && (lower.includes("contact") || lower.includes("how many"))) {
    const totalContacts = ctx.contactLists.reduce((sum, l) => sum + l.recipientCount, 0);
    let response = `You have **${ctx.contactLists.length} contact lists** with **${totalContacts.toLocaleString()} total contacts**:\n\n`;
    ctx.contactLists.forEach((l) => {
      response += `  • ${l.name}: ${l.recipientCount.toLocaleString()} contacts\n`;
    });
    return response;
  }

  if (lower.includes("account") || lower.includes("quota") || lower.includes("limit") || lower.includes("health")) {
    if (ctx.emailAccounts.length === 0) {
      return `You have **no email accounts configured**. Go to **Dashboard → Email Accounts → Connect** to add your SMTP accounts.`;
    }
    let response = `You have **${ctx.emailAccounts.length} email account(s)**:\n\n`;
    ctx.emailAccounts.forEach((a) => {
      response += `  • ${a.email} (${a.type})\n    Status: ${a.isActive ? "✅ Active" : "❌ Inactive"} | Remaining: ${a.remaining}/${a.dailyLimit}\n`;
    });
    return response;
  }

  if (lower.includes("recommend") || lower.includes("suggest") || lower.includes("which") || lower.includes("should i")) {
    let response = `Here's what I recommend:\n\n`;
    const firstTemplate = ctx.templates[0];
    const firstList = ctx.contactLists[0];
    if (firstTemplate && firstList) {
      response += `  • Template: "${firstTemplate.name}"\n  • List: ${firstList.name} (${firstList.recipientCount} contacts)\n`;
    }
    response += `\nGo to **Dashboard → Campaigns → New Campaign** to create it.`;
    return response;
  }

  let response = `I can help you with:\n\n`;
  response += `  📋 "List my templates"\n  📊 "How many contacts do I have?"\n  🔌 "Check account health"\n  💡 "What should I send?"\n\n`;
  response += `You have ${ctx.templates.length} templates, ${ctx.contactLists.length} contact lists, and ${ctx.emailAccounts.length} email accounts.`;
  return response;
}
