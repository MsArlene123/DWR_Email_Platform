/**
 * AI Assistant Context Builder
 *
 * Gathers the user's templates, contact lists, email accounts, and recent
 * campaigns so the AI assistant has full context when responding.
 *
 * This is called before every AI assistant request — it builds a system
 * prompt that tells the LLM what's available in the user's account.
 */

import { prisma } from "./prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface AssistantContext {
  templates: Array<{
    id: string;
    name: string;
    category: string;
    subject: string;
  }>;
  contactLists: Array<{
    id: string;
    name: string;
    recipientCount: number;
  }>;
  emailAccounts: Array<{
    id: string;
    email: string;
    type: string;
    isActive: boolean;
    dailyLimit: number;
    emailsSentToday: number;
    remaining: number;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    emailsSent: number;
    totalRecipients: number;
    createdAt: string;
  }>;
}

export async function gatherContext(): Promise<AssistantContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [templates, sheets, accounts, campaigns] = await Promise.all([
    prisma.emailTemplate.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        category: true,
        subject: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.googleSheet.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        recipientCount: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        type: true,
        isActive: true,
        dailyLimit: true,
        emailsSentToday: true,
      },
      orderBy: { email: "asc" },
    }),
    prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        emailsSent: true,
        totalRecipients: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      subject: t.subject,
    })),
    contactLists: sheets.map((s) => ({
      id: s.id,
      name: s.name,
      recipientCount: s.recipientCount,
    })),
    emailAccounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      type: a.type,
      isActive: a.isActive,
      dailyLimit: a.dailyLimit,
      emailsSentToday: a.emailsSentToday,
      remaining: Math.max(0, a.dailyLimit - a.emailsSentToday),
    })),
    recentCampaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      emailsSent: c.emailsSent,
      totalRecipients: c.totalRecipients,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

/**
 * Builds the system prompt for the AI assistant.
 * This tells the LLM what it can do and what's available.
 */
export function buildSystemPrompt(ctx: AssistantContext): string {
  const templateList = ctx.templates
    .map((t) => `  - ID: ${t.id} | Name: "${t.name}" | Category: ${t.category} | Subject: "${t.subject}"`)
    .join("\n");

  const listList = ctx.contactLists
    .map((l) => `  - ID: ${l.id} | Name: "${l.name}" | Contacts: ${l.recipientCount}`)
    .join("\n");

  const accountList = ctx.emailAccounts
    .map((a) => `  - ID: ${a.id} | Email: ${a.email} | Type: ${a.type} | Active: ${a.isActive} | Daily limit: ${a.dailyLimit} | Sent today: ${a.emailsSentToday} | Remaining: ${a.remaining}`)
    .join("\n");

  const campaignList = ctx.recentCampaigns
    .map((c) => `  - ID: ${c.id} | Name: "${c.name}" | Status: ${c.status} | Sent: ${c.emailsSent}/${c.totalRecipients} | Created: ${c.createdAt}`)
    .join("\n");

  return `You are the DWR Email Marketing Assistant. You help Arlene manage email campaigns through natural language.

You can:
1. RECOMMEND templates for a specific contact list
2. SUMMARIZE campaign performance
3. DRAFT new email content (subject + body)
4. PLAN a send schedule (which template to which list, when, and how many batches)
5. CHECK account health (daily quotas, rate limits)
6. ANSWER questions about the email platform

Here is the user's current account data:

AVAILABLE TEMPLATES (${ctx.templates.length}):
${templateList || "  (none)"}

CONTACT LISTS (${ctx.contactLists.length}):
${listList || "  (none)"}

EMAIL ACCOUNTS (${ctx.emailAccounts.length}):
${accountList || "  (none)"}

RECENT CAMPAIGNS (${ctx.recentCampaigns.length}):
${campaignList || "  (none)"}

RULES:
- Be concise. Use bullet points and tables when appropriate.
- When recommending a template, include its ID and name so the user can find it.
- When planning sends, consider the daily limit of each email account.
- If a list has more contacts than the daily limit, suggest splitting across multiple days or accounts.
- Arlene's brand voice: professional but conversational, leads with the reader's crisis, not a service description.
- Subject lines should avoid spam triggers (no ALL CAPS, no exclamation marks, no "free" or "act now").
- When drafting email content, include the {{FIRSTNAME}} merge field for personalization.
- Always include a CAN-SPAM reminder in drafted emails (physical address, unsubscribe link).
- If you don't know something, say so — don't make up data.

When the user asks you to create a campaign or schedule a send, provide the exact steps they need to take in the dashboard (which buttons to click, which fields to fill). You cannot directly create campaigns — you guide the user through the process.`;
}
