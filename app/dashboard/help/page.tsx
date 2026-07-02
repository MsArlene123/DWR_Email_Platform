'use client';

import { useState } from 'react';
import {
  BookOpen,
  Mail,
  Sheet,
  FileText,
  ImageIcon,
  Send,
  Workflow,
  ShieldAlert,
  Users,
  UserX,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  LayoutDashboard,
} from 'lucide-react';

type SectionId =
  | 'overview'
  | 'getting-started'
  | 'accounts'
  | 'sheets'
  | 'templates'
  | 'images'
  | 'campaigns'
  | 'drip-sequences'
  | 'bounced-emails'
  | 'contacts'
  | 'unsubscribes'
  | 'analytics'
  | 'tips';

const sections: { id: SectionId; title: string; icon: any }[] = [
  { id: 'overview', title: 'Overview', icon: LayoutDashboard },
  { id: 'getting-started', title: 'Getting Started (Quick Start)', icon: ArrowRight },
  { id: 'accounts', title: 'Email Accounts', icon: Mail },
  { id: 'sheets', title: 'Google Sheets (Recipient Lists)', icon: Sheet },
  { id: 'templates', title: 'Email Templates', icon: FileText },
  { id: 'images', title: 'Image Library', icon: ImageIcon },
  { id: 'campaigns', title: 'Campaigns (One-Time Sends)', icon: Send },
  { id: 'drip-sequences', title: 'Drip Sequences (Automated Series)', icon: Workflow },
  { id: 'bounced-emails', title: 'Bad Emails (Bounced)', icon: ShieldAlert },
  { id: 'contacts', title: 'Contacts', icon: Users },
  { id: 'unsubscribes', title: 'Unsubscribes', icon: UserX },
  { id: 'analytics', title: 'Campaign Analytics', icon: BarChart3 },
  { id: 'tips', title: 'Tips & Best Practices', icon: Lightbulb },
];

export default function HelpPage() {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(['overview', 'getting-started'])
  );

  const toggle = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Instruction Manual</h1>
        </div>
        <p className="text-gray-600 mt-1">
          Everything you need to know about using the DWR Email Marketing Dashboard.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={expandAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Expand All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3">Table of Contents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setOpenSections((prev) => new Set([...prev, s.id]));
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg px-3 py-1.5 text-left transition-colors"
            >
              <s.icon className="h-4 w-4 flex-shrink-0" />
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((s) => (
          <div
            key={s.id}
            id={`section-${s.id}`}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-4"
          >
            <button
              onClick={() => toggle(s.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">{s.title}</h2>
              </div>
              {openSections.has(s.id) ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {openSections.has(s.id) && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                <SectionContent id={s.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Section content ───────────────── */

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'overview':
      return <OverviewSection />;
    case 'getting-started':
      return <GettingStartedSection />;
    case 'accounts':
      return <AccountsSection />;
    case 'sheets':
      return <SheetsSection />;
    case 'templates':
      return <TemplatesSection />;
    case 'images':
      return <ImagesSection />;
    case 'campaigns':
      return <CampaignsSection />;
    case 'drip-sequences':
      return <DripSequencesSection />;
    case 'bounced-emails':
      return <BouncedEmailsSection />;
    case 'contacts':
      return <ContactsSection />;
    case 'unsubscribes':
      return <UnsubscribesSection />;
    case 'analytics':
      return <AnalyticsSection />;
    case 'tips':
      return <TipsSection />;
    default:
      return null;
  }
}

/* ── Shared components ── */
function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
        {num}
      </span>
      <div className="text-gray-700 leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
      <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-800">{children}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">{children}</h3>;
}

/* ── Individual sections ── */

function OverviewSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>
        The <strong>DWR Email Marketing Dashboard</strong> is your all-in-one platform for creating and sending professional email campaigns and automated drip sequences. It connects to your existing email accounts (Gmail, Titan, Zoho) and pulls recipient lists from Google Sheets.
      </p>
      <p>Here&apos;s what each section of the sidebar does:</p>
      <ul className="space-y-2 ml-1">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Dashboard</strong> — Your home base. See quick stats: total campaigns, active accounts, templates, and recent activity at a glance.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Email Accounts</strong> — Connect the email addresses you want to send from (Gmail, Titan SMTP, Zoho SMTP).</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Google Sheets</strong> — Link your Google Sheets that contain your recipient email lists.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Templates</strong> — Create and manage beautiful email templates with a rich text editor. 20 sample templates are provided to get you started.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Image Library</strong> — Upload and manage images you can insert into your email templates.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Campaigns</strong> — One-time email blasts sent to an entire list at once.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Drip Sequences</strong> — Automated multi-step email series where recipients get emails on a schedule (e.g., Day 0, Day 3, Day 7).</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Bad Emails</strong> — Tracks bounced and invalid email addresses. Emails that bounce 3+ times are automatically blacklisted.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Contacts</strong> — View and manage all contacts imported from your campaigns and drip sequences.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Campaign Analytics</strong> — See open rates, click rates, and delivery stats across all your campaigns.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <span><strong>Unsubscribes</strong> — View who has opted out. These recipients are automatically excluded from future sends.</span>
        </li>
      </ul>
    </div>
  );
}

function GettingStartedSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>Follow these steps in order to send your first email campaign or drip sequence:</p>

      <SectionHeading>Step-by-Step Setup</SectionHeading>
      <Step num={1}>
        <strong>Connect an Email Account</strong> — Go to <em>Email Accounts → Connect Account</em>. Choose Gmail, Titan, or Zoho. You&apos;ll need your email address and an <strong>App Password</strong> (not your regular login password). The system will verify the connection before saving.
      </Step>
      <Step num={2}>
        <strong>Add a Google Sheet</strong> — Go to <em>Google Sheets → Add Sheet</em>. Paste the URL of a Google Sheet that contains your recipient email addresses. The sheet <strong>must be shared as &quot;Anyone with the link can view.&quot;</strong> The system will auto-detect the email column.
      </Step>
      <Step num={3}>
        <strong>Create or Choose a Template</strong> — Go to <em>Templates</em>. You&apos;ll see 20 sample templates already loaded. You can use one as-is, duplicate and customize it, or create a brand new template from scratch using the rich text editor.
      </Step>
      <Step num={4}>
        <strong>Send!</strong> — Now choose your path:
        <ul className="list-disc ml-6 mt-1 space-y-1">
          <li><strong>For a one-time blast</strong> → Go to <em>Campaigns → Create Campaign</em></li>
          <li><strong>For an automated multi-step series</strong> → Go to <em>Drip Sequences → New Sequence</em></li>
        </ul>
      </Step>

      <Tip>
        Every email you send automatically includes a CAN-SPAM compliant footer with your business name, physical address, phone number, and an unsubscribe link. Recipients who unsubscribe are automatically excluded from future sends.
      </Tip>
    </div>
  );
}

function AccountsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>Email Accounts are the sending addresses your campaigns and drip sequences use to deliver emails.</p>

      <SectionHeading>Supported Providers</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Gmail</strong> — Uses SMTP with an App Password. Daily limit: ~500 emails.</li>
        <li><strong>Titan SMTP</strong> — Custom email hosting. You configure the SMTP host and port.</li>
        <li><strong>Zoho Mail</strong> — Uses Zoho SMTP with an App Password. Daily limit: ~500 emails.</li>
      </ul>

      <SectionHeading>How to Connect</SectionHeading>
      <Step num={1}>Click <strong>Connect Account</strong> from the Email Accounts page.</Step>
      <Step num={2}>Select your provider (Gmail, Titan, or Zoho).</Step>
      <Step num={3}>Enter your email address, display name, and <strong>App Password</strong>.</Step>
      <Step num={4}>Click <strong>Connect</strong>. The system will test the SMTP connection. If successful, your account is saved with the password securely encrypted.</Step>

      <SectionHeading>What is an App Password?</SectionHeading>
      <p>
        An App Password is a special password generated by your email provider specifically for third-party apps. It&apos;s different from your regular login password.
      </p>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Gmail:</strong> Go to your Google Account → Security → 2-Step Verification → App Passwords. Generate one for &quot;Mail.&quot;</li>
        <li><strong>Zoho:</strong> Go to Zoho Account → Security → App Passwords. Generate one and use it here.</li>
        <li><strong>Titan:</strong> Use your regular Titan email password (App Passwords may not be required).</li>
      </ul>

      <Warning>
        Never share your App Passwords. They are stored encrypted in the database and are never visible after saving.
      </Warning>
    </div>
  );
}

function SheetsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>Google Sheets serve as your recipient lists. Each sheet should have a column of email addresses (the system auto-detects which column contains emails).</p>

      <SectionHeading>How to Add a Sheet</SectionHeading>
      <Step num={1}>Go to <strong>Google Sheets → Add Sheet</strong>.</Step>
      <Step num={2}>Give it a name (e.g., &quot;WomenShield Contacts&quot;).</Step>
      <Step num={3}>Paste the full Google Sheets URL.</Step>
      <Step num={4}>Click <strong>Preview</strong> to verify the system can read the sheet and find email addresses.</Step>
      <Step num={5}>Click <strong>Add Sheet</strong> to save.</Step>

      <Warning>
        Your Google Sheet <strong>must</strong> be shared with &quot;Anyone with the link can view&quot; permissions. Private sheets cannot be read by the system.
      </Warning>

      <SectionHeading>Sheet Format Tips</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>The first row should be headers (e.g., &quot;Email&quot;, &quot;First Name&quot;, &quot;Last Name&quot;).</li>
        <li>The system auto-detects the email column by looking for a column named &quot;email&quot; or containing @ symbols.</li>
        <li>You can include other columns like First Name, Last Name, Company — these can be used as merge fields in templates (e.g., {'{'}{'{'}<code>FIRST_NAME</code>{'}'}{'}'})</li>
      </ul>
    </div>
  );
}

function TemplatesSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>Templates define the content and design of your emails. The dashboard comes preloaded with 20 sample templates across categories like Nonprofit, Legal, Bookstore, and General Business.</p>

      <SectionHeading>Creating a Template</SectionHeading>
      <Step num={1}>Go to <strong>Templates → Create Template</strong>.</Step>
      <Step num={2}>Give it a name, choose a category, and write a subject line.</Step>
      <Step num={3}>Use the rich text editor to design your email. You can format text, add links, insert images from your Image Library, align content, and more.</Step>
      <Step num={4}>Switch between <strong>Editor</strong> and <strong>Preview</strong> tabs to see how it will look.</Step>
      <Step num={5}>Click <strong>Save Template</strong>.</Step>

      <SectionHeading>Personalization / Merge Fields</SectionHeading>
      <p>Use double curly braces to insert dynamic content that gets replaced per recipient:</p>
      <ul className="list-disc ml-6 space-y-1">
        <li><code>{'{'}{'{'}<strong>FIRST_NAME</strong>{'}'}{'}'}  </code> — Recipient&apos;s first name</li>
        <li><code>{'{'}{'{'}<strong>LAST_NAME</strong>{'}'}{'}'}  </code> — Recipient&apos;s last name</li>
        <li><code>{'{'}{'{'}<strong>EMAIL</strong>{'}'}{'}'}  </code> — Recipient&apos;s email address</li>
        <li><code>{'{'}{'{'}<strong>COMPANY</strong>{'}'}{'}'}  </code> — Company name (if in your sheet)</li>
      </ul>
      <p>These map to column headers in your Google Sheet. The column header is converted to UPPER_SNAKE_CASE (e.g., &quot;First Name&quot; becomes <code>FIRST_NAME</code>).</p>

      <Tip>You can duplicate any sample template and customize it rather than starting from scratch. Look for the &quot;Duplicate&quot; button on the template detail page.</Tip>
    </div>
  );
}

function ImagesSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>The Image Library lets you upload images that you can insert into your email templates.</p>

      <SectionHeading>How to Use</SectionHeading>
      <Step num={1}>Go to <strong>Image Library</strong>.</Step>
      <Step num={2}>Click <strong>Upload Image</strong> and select an image file (max 10 MB).</Step>
      <Step num={3}>The image is uploaded to cloud storage and a public URL is generated.</Step>
      <Step num={4}>When editing a template, click the <strong>Image</strong> button in the toolbar. You can choose from your library, upload a new image, or paste a URL.</Step>

      <Tip>Use the &quot;Copy URL&quot; button on any image to get its public link. You can paste this directly into email HTML if you prefer working with raw code.</Tip>
    </div>
  );
}

function CampaignsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>A <strong>Campaign</strong> is a one-time email blast sent to all recipients in a Google Sheet. Think of it as a newsletter or announcement — one template, one send to everyone on your list.</p>

      <SectionHeading>Creating a Campaign</SectionHeading>
      <Step num={1}>Go to <strong>Campaigns → Create Campaign</strong>.</Step>
      <Step num={2}>Give your campaign a name.</Step>
      <Step num={3}>Select the <strong>Email Account</strong> to send from.</Step>
      <Step num={4}>Select the <strong>Google Sheet</strong> (recipient list).</Step>
      <Step num={5}>Select the <strong>Template</strong> to use.</Step>
      <Step num={6}>Enter or confirm the <strong>Subject Line</strong>.</Step>
      <Step num={7}>Set the <strong>Sending Rate</strong> (minutes between emails) — this paces delivery to avoid provider rate limits.</Step>
      <Step num={8}>Choose to <strong>Start Now</strong> or <strong>Schedule</strong> for later.</Step>
      <Step num={9}>Click <strong>Create Campaign</strong>.</Step>

      <SectionHeading>Campaign Statuses</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Draft</strong> — Created but not started.</li>
        <li><strong>Running</strong> — Currently sending emails.</li>
        <li><strong>Paused</strong> — Temporarily halted. Can be resumed.</li>
        <li><strong>Completed</strong> — All emails sent.</li>
        <li><strong>Stopped</strong> — Permanently cancelled.</li>
      </ul>

      <SectionHeading>Monitoring a Campaign</SectionHeading>
      <p>Click on any campaign to see its detail page with real-time stats: delivered, opened, pending, bounced, failed, and retrying. You can also see individual email logs showing the status of each recipient.</p>

      <Tip>Set your sending rate to at least 2-3 minutes between emails to avoid triggering spam filters or exceeding provider limits (e.g., Gmail allows ~500/day).</Tip>
    </div>
  );
}

function DripSequencesSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>
        A <strong>Drip Sequence</strong> is an automated multi-step email series. Unlike campaigns (one email to everyone), drip sequences send a series of emails to each recipient on a schedule. For example: an intro email on Day 0, a follow-up on Day 3, and a final pitch on Day 7.
      </p>

      <SectionHeading>How to Create a Drip Sequence</SectionHeading>
      <Step num={1}>Go to <strong>Drip Sequences → New Sequence</strong>.</Step>
      <Step num={2}>Enter a <strong>Name</strong> and optional <strong>Description</strong> for the sequence.</Step>
      <Step num={3}>
        Select the <strong>Email Account</strong> to send from. This is the email address all steps will be sent from.
      </Step>
      <Step num={4}>
        Select the <strong>Google Sheet</strong> (recipient list). This is who will receive the sequence.
      </Step>
      <Step num={5}>
        Set the <strong>Sending Speed</strong> — the minutes between individual emails. This controls pacing (e.g., 5 minutes between each email sent). A slower pace avoids spam filters.
      </Step>
      <Step num={6}>
        <strong>Add Steps</strong> — Each step is one email in the series:
        <ul className="list-disc ml-6 mt-1 space-y-1">
          <li><strong>Template:</strong> Select which email template to use for this step.</li>
          <li><strong>Subject:</strong> Enter the subject line for this step.</li>
          <li><strong>Delay:</strong> Set how many days and hours after the <em>previous</em> step this email should be sent. The first step usually has 0 delay (sent immediately upon enrollment).</li>
        </ul>
      </Step>
      <Step num={7}>Click <strong>Add Step</strong> to add more emails to the sequence (e.g., a follow-up email 3 days later).</Step>
      <Step num={8}>Click <strong>Create Sequence</strong> to save.</Step>

      <SectionHeading>How to Start a Drip Sequence</SectionHeading>
      <Step num={1}>After creating the sequence, you&apos;ll land on its <strong>detail page</strong>.</Step>
      <Step num={2}>
        Review the <strong>Setup Checklist</strong> to make sure everything is ready:
        <ul className="list-disc ml-6 mt-1 space-y-1">
          <li>✅ Email account assigned</li>
          <li>✅ At least one step defined</li>
          <li>✅ Recipient list (Google Sheet) connected</li>
        </ul>
      </Step>
      <Step num={3}>
        If no recipients have been enrolled yet, click <strong>Enroll Recipients</strong>. This reads your Google Sheet and adds each email address to the sequence.
      </Step>
      <Step num={4}>
        Click the <strong>Activate</strong> button to turn the sequence on. This changes its status to active and begins processing.
      </Step>
      <Step num={5}>
        Click <strong>Send Now</strong> (the lightning bolt button) to begin processing immediately. The system will send emails in rounds, showing you progress toasts like &quot;Round 3: Sent 15 emails (45 total).&quot;
      </Step>

      <SectionHeading>Understanding the Drip Timeline</SectionHeading>
      <p>Each recipient progresses through the steps independently:</p>
      <ul className="list-disc ml-6 space-y-1">
        <li>When enrolled, they start at Step 1 (usually sent immediately).</li>
        <li>After Step 1 is sent, the system waits the delay defined for Step 2 (e.g., 3 days) before sending Step 2.</li>
        <li>This continues until all steps are completed for each recipient.</li>
        <li>The <strong>Progress Bar</strong> on the detail page shows how many recipients have completed all steps.</li>
      </ul>

      <SectionHeading>Managing a Running Sequence</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Pause</strong> — Temporarily stops all sending. No emails go out until you reactivate.</li>
        <li><strong>Send Now</strong> — Manually triggers processing for recipients whose next email is due.</li>
        <li><strong>Adjust Sending Speed</strong> — Change the minutes between emails using the speed buttons on the detail page.</li>
        <li><strong>Enroll More Recipients</strong> — If you add new contacts to your Google Sheet, click &quot;Enroll Recipients&quot; again to add them (existing recipients are skipped).</li>
      </ul>

      <Tip>
        For large lists (500+ recipients), the &quot;Send Now&quot; button runs in rounds of up to 20 cycles. Each cycle sends emails for about 50 seconds. You&apos;ll see real-time progress as it works through the list.
      </Tip>

      <Warning>
        Make sure your email account&apos;s daily limit can handle your list size. Gmail allows ~500 emails/day. If you have 1,000 recipients on a 2-step drip, that&apos;s 2,000 emails total — which would take about 4 days through Gmail.
      </Warning>
    </div>
  );
}

function BouncedEmailsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>The Bad Emails page tracks email addresses that bounced (i.e., the email could not be delivered).</p>

      <SectionHeading>How It Works</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>When an email bounces, the system records it with the bounce reason.</li>
        <li>The <strong>bounce count</strong> tracks how many times each address has bounced.</li>
        <li>After <strong>3 bounces</strong>, the email is automatically <strong>blacklisted</strong> — it will be skipped in all future campaigns and drip sequences.</li>
      </ul>

      <SectionHeading>What You Can Do</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>View</strong> all bounced emails, their bounce count, and reason.</li>
        <li><strong>Remove</strong> individual bounced records if you believe the issue was temporary.</li>
        <li><strong>Clear All</strong> bounced records to start fresh.</li>
      </ul>

      <Tip>
        Regularly clean your Google Sheets by removing addresses that appear in the Bad Emails list. This improves your sender reputation and delivery rates.
      </Tip>
    </div>
  );
}

function ContactsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>The Contacts page gives you a unified view of all email addresses that have been imported from your campaigns and drip sequences.</p>

      <SectionHeading>What You&apos;ll See</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>Contact email address and any associated name.</li>
        <li>Source — which campaign or drip sequence imported this contact.</li>
        <li>Engagement status — whether they&apos;ve opened or clicked emails.</li>
        <li>Bounce and unsubscribe status.</li>
      </ul>
    </div>
  );
}

function UnsubscribesSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>When a recipient clicks the unsubscribe link in any email you send, they are automatically added to the Unsubscribes list.</p>

      <SectionHeading>How It Works</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>Every email includes an <strong>unsubscribe link</strong> in the CAN-SPAM footer.</li>
        <li>When clicked, the recipient is taken to a confirmation page and added to the unsubscribe list.</li>
        <li>Unsubscribed addresses are <strong>automatically excluded</strong> from all future campaigns and drip sequences.</li>
        <li>Recipients can also <strong>resubscribe</strong> using the link provided on the unsubscribe confirmation page.</li>
      </ul>

      <Warning>
        Never remove someone from the unsubscribe list and send them emails without their explicit consent. This violates CAN-SPAM regulations and can result in penalties.
      </Warning>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <p>Campaign Analytics gives you a bird&apos;s-eye view of email performance across all your campaigns.</p>

      <SectionHeading>Metrics Tracked</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Delivered</strong> — Emails successfully sent.</li>
        <li><strong>Opened</strong> — Emails that recipients opened (tracked via a tiny invisible pixel).</li>
        <li><strong>Clicked</strong> — Emails where recipients clicked a link.</li>
        <li><strong>Bounced</strong> — Emails that could not be delivered.</li>
        <li><strong>Open Rate</strong> — Percentage of delivered emails that were opened.</li>
        <li><strong>Click Rate</strong> — Percentage of delivered emails where a link was clicked.</li>
      </ul>

      <Tip>Open tracking relies on image loading. Some email clients block images by default, so actual open rates may be higher than reported.</Tip>
    </div>
  );
}

function TipsSection() {
  return (
    <div className="space-y-3 text-gray-700 leading-relaxed">
      <SectionHeading>Email Deliverability</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>Use a slow sending rate (3-5 minutes between emails) to avoid triggering spam filters.</li>
        <li>Clean your recipient lists regularly — remove bounced and unsubscribed addresses from your Google Sheets.</li>
        <li>Avoid spammy words in subject lines (e.g., &quot;FREE!!!&quot;, &quot;ACT NOW&quot;, &quot;URGENT&quot;).</li>
        <li>Always include meaningful content. Emails that are all images with no text often get flagged as spam.</li>
      </ul>

      <SectionHeading>Google Sheets Best Practices</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>Always have headers in the first row.</li>
        <li>Use clear column names: &quot;Email&quot;, &quot;First Name&quot;, &quot;Last Name&quot;, &quot;Company&quot;.</li>
        <li>Make sure the sheet is shared as &quot;Anyone with the link can view.&quot;</li>
        <li>Don&apos;t include blank rows in the middle of your data.</li>
      </ul>

      <SectionHeading>Template Design</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li>Keep emails concise and focused on one call to action.</li>
        <li>Use personalization (merge fields like {'{'}{'{'}<code>FIRST_NAME</code>{'}'}{'}'}{')'} to increase engagement.</li>
        <li>Test with a small list before sending to your entire database.</li>
        <li>Preview your template before using it in a campaign.</li>
      </ul>

      <SectionHeading>Account Limits</SectionHeading>
      <ul className="list-disc ml-6 space-y-1">
        <li><strong>Gmail:</strong> ~500 emails/day with App Password. Exceeding this may temporarily lock your account.</li>
        <li><strong>Zoho:</strong> ~500 emails/day depending on your plan.</li>
        <li><strong>Titan:</strong> Limits vary by plan. Check with your Titan provider.</li>
        <li>Spread large sends across multiple days or use multiple email accounts.</li>
      </ul>

      <SectionHeading>CAN-SPAM Compliance</SectionHeading>
      <p>All emails automatically include a compliant footer with:</p>
      <ul className="list-disc ml-6 space-y-1">
        <li>Your business name and physical address.</li>
        <li>A working <strong>unsubscribe</strong> link.</li>
        <li>A <strong>resubscribe</strong> option on the unsubscribe confirmation page.</li>
      </ul>
      <p>This is handled automatically — you don&apos;t need to add it to your templates.</p>
    </div>
  );
}
