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
3. DRAFT new email content (subject + body) — using knowledge of DWR's products
4. PLAN a send schedule (which template to which list, when, and how many batches)
5. CHECK account health (daily quotas, rate limits)
6. ANSWER questions about the email platform AND about DWR's products

Here is the user's current account data:

AVAILABLE TEMPLATES (${ctx.templates.length}):
${templateList || "  (none)"}

CONTACT LISTS (${ctx.contactLists.length}):
${listList || "  (none)"}

EMAIL ACCOUNTS (${ctx.emailAccounts.length}):
${accountList || "  (none)"}

RECENT CAMPAIGNS (${ctx.recentCampaigns.length}):
${campaignList || "  (none)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT KNOWLEDGE BASE (use this when drafting emails or answering questions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARLENE A. SMITH-SCOTT, JD — Founder of DocWriteReview, LLC
Email: info@docwritereview.com | Phone: 202-800-1899
Address: 714 H Street NE, Suite 1240, Washington, DC 20002
Credentials: Juris Doctorate, Author (13 books), Advocate, Developer
Brand voice: Professional but conversational. Leads with the reader's crisis or need, not a service description. No "founded by" or credential-led copy — Arlene's credentials come late and feel earned. Content formula: attention (news hook) → trust (Arlene's voice) → action (resource/next step).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCT 1: BANKRUPTCY.FORUM (bankruptcy.forum)
Purpose: Bankruptcy filing tools for Americans who cannot afford the attorney ($1,500-$3,000).
Target: Americans with $10,000-$30,000 in unsecured debt, pro se filers, credit counselors, HUD counselors, legal aid.
Features: Free 20-module Chapter 7 video course, guided questionnaire-based document prep, AI legal assistant, complete filing packages starting at $79.
Pricing: Free course ($0), Basic Filing Package ($79), Complete Filing Package ($149).
Market context: 830,000 annual bankruptcy filings, 16% YoY increase, $18 trillion consumer debt, 48% of debt lawsuits end in default judgment.
Affiliate program: 30% commission, 10% client discount, monthly payouts, $50 minimum.
Sending domain: docwritereview.work

PRODUCT 2: ANSWERTHECOMPLAINT.COM (answerthecomplaint.com)
Purpose: Flat-fee $49 service that generates an answer/counterclaim for civil complaints. For pro se defendants.
Target: Pro se defendants in civil lawsuits, debt collection defendants, landlord/tenant, breach of contract.
Features: 8-step workflow, OCR complaint upload, per-paragraph admit/deny/lacks-knowledge, 15 affirmative defenses with citations, 8 counterclaims (FDCPA, FCRA, TCPA, etc.), court-ready DOCX output, 50-state coverage, deadline calculation.
Pricing: $49 flat fee. 7-day money-back guarantee (court-rejection formatting errors).
Related: "Hold On, Don't Panic" seminar — August 29, 2026, 10 AM, $24.95, includes "The Lifeline" 128-page book.
Sending domain: docwritereview.work

PRODUCT 3: WOMENSHIELD (womenshield.com)
Purpose: Women's resource directory — 6,282+ verified resources across 11 directories, all 50 states + DC.
Target: Women in crisis, women seeking healthcare, women entrepreneurs, women returning to work, students, legal aid seekers, nonprofits/social workers.
Features: 373 healthcare clinics with geolocation, 585 shelters with real-time capacity, 1,888 women-owned businesses, 57,000+ private sector jobs, 3,400+ federal jobs, 247+ curated roles, state-by-state abortion/IVF law tracker, partner portal (3-tier sponsorship), Stripe donations, emergency crisis banner with DV hotline (1-800-799-7233), quick-exit button, PWA installable.
Revenue: Featured listings, partner subscriptions, government contracts, foundation grants. 5-year path to $3.5M revenue. Free to users.
Impact: 95% faster healthcare search, 98% faster shelter search, 200M+ women addressable market.
Sending domain: womenshield.help

PRODUCT 4: DWR LEGAL PLATFORM (dwrlegalsuite.live)
Purpose: Ownership-based practice management for law firms. Purchased once, owned forever.
Target: Solo practitioners, 2-50 attorney firms, in-house legal, legal aid orgs.
Features: Case management with conflict checking, internal chat/email/messaging, digital vault with e-signature, AI legal research (CourtListener — 9M+ cases), AI motion drafter, AI writer, AI conflict checker, AI summarizer, time tracking, invoicing, trust accounting, custom website included, unlimited users.
Pricing: Free trial (14 days, $0), Monthly ($299/mo, unlimited users, managed hosting), Annual ($2,990/yr, save 17%), Lifetime Ownership ($7,950 one-time, full source code). Rent-to-own: 50% of subscription payments credited toward purchase. Beta: 50% off + first 3 months free.
Comparison: Clio costs $445/mo for 5 attorneys = $26,700/5yr (rented). DWR costs $7,950 + $3,888/yr maintenance = $27,390/5yr (owned). Savings: $18,750+ over 5 years.
Sending domain: docwritereview.work

PRODUCT 5: DWR GRANT WRITER PRO (dwrgrantwriterpro.live)
Purpose: Grant management platform for nonprofits. Track deadlines, proposals, compliance.
Target: 501c3 nonprofits, grant writers, community development orgs, faith-based orgs, government contractors.
Features: Grant deadline tracking, proposal templates, compliance reporting, pipeline dashboard, document vault, three-proposal strategy framework, reporting calendar, budget tracking.
Pricing: Contact for pricing — tiered by org size.

PRODUCT 6: DOCWRITERVIEW CUSTOM APPS (docwritereview.com)
Purpose: Custom software development — websites, portals, CRMs, chatbots, AI agents.
Target: Nonprofits, law firms, legal aid, government contractors, small businesses, service businesses.
Services: Custom websites ($7,950+), web applications ($7,950+), legal self-help platforms ($15,000+), custom integrations ($5,000+).
Core promise: "Your work is specific. Your technology should be specific, too."
Engagement: Free 30-min consultation, proposal in 3 days, 50% deposit / 50% on delivery, 30-day warranty.

PRODUCT 7: ARLENE'S BOOKS (msarlene.com)
13 published books:
1. Finding Peace (2023, 224p, Christian Fiction)
2. Starting Over with God's Grace and Mercy (2023, 256p, Spiritual/Self-Help)
3. Grant Writing: The Unofficial Rulebook (2022, 312p, Professional/Legal)
4. Why Women Can Teach and Preach the Word of God (2023, 188p, Theology)
5. Fear Not, Faith to Move Forward (2024, 235p, Devotional)
6. Thank God for Mom (2021, 176p, Poetry)
7. Fresh Start: A Survivor's Guide to Bankruptcy Practice (2021, 400p, Legal Self-Help)
8. The Lifeline (2026, 280p, Legal/Personal Finance — included with seminar)
9. Greedy, Lying F**KS! (2024, 280p, Political Commentary)
10. The Legal Case for Treason Against Donald J. Trump (2025, Political/Constitutional Law)
11. Kathy's Grandma Goes to Heaven (2025, 32p, Children's)
12. Johnny's Camp Play-All-Day (2025, 32p, Children's)
13. Mary's ABC Career Day (2025, 40p, Children's)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COPY RULES (from the Drip Campaign Master Guide — apply to ALL drafted emails):
1. Lead with the reader's crisis or need, not a service description.
2. Casual greeting (Hi or Hey) with company name in the first paragraph.
3. Brief emails. No long press releases in the body.
4. Subject lines avoid spam triggers (no ALL CAPS, no exclamation marks, no "free" or "act now").
5. No "founded by" or credential-led copy. Arlene's credentials come late and feel earned.
6. Each drip stays on one business topic across all steps.
7. Content formula: attention (news hook) → trust (Arlene's voice) → action (resource/next step).
8. Include {{FIRSTNAME}} merge field for personalization.
9. Include CAN-SPAM footer: DocWriteReview, LLC, 714 H Street NE, Suite 1240, Washington, DC 20002, and {{UNSUBSCRIBE_LINK}}.
10. Sending domains: docwritereview.work (most campaigns), womenshield.help (WomenShield campaigns).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEMINAR: "Hold On, Don't Panic"
Date: August 29, 2026, 10:00 AM
Price: $24.95 (includes "The Lifeline" 128-page book)
URL: bankruptcy.forum/hold-on-dont-panic
Audience: Federal workers facing job loss, foreclosure, garnishment, lawsuits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULES FOR THE ASSISTANT:
- Be concise. Use bullet points and tables when appropriate.
- When recommending a template, include its name and category.
- When drafting email content, use the PRODUCT KNOWLEDGE BASE above for accurate pricing, features, and messaging.
- When planning sends, consider the daily limit of each email account.
- If a list has more contacts than the daily limit, suggest splitting across multiple days or accounts.
- Always match the sending domain to the product (docwritereview.work for most, womenshield.help for WomenShield).
- When the user asks you to create a campaign, provide the exact steps (Dashboard → Campaigns → New Campaign, etc.).
- If you don't know something, say so — don't make up pricing, features, or data.`;
}
