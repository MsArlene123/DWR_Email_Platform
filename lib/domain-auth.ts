import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

/**
 * Domain authentication checker for SPF, DKIM, and DMARC.
 *
 * These three DNS records are how Gmail, Yahoo, and Outlook decide
 * whether your email is legitimate. Think of them as three forms of
 * ID that the receiving mail server checks at the door:
 *
 * SPF (Sender Policy Framework): a list of servers authorized to send
 * mail from your domain. Like saying "only these people are allowed
 * to use my return address."
 *
 * DKIM (DomainKeys Identified Mail): a digital signature on every
 * email proving it was not tampered with in transit. Like a wax seal
 * on a letter.
 *
 * DMARC (Domain-based Message Authentication, Reporting & Conformance):
 * a policy telling receivers what to do if SPF or DKIM fails. Like
 * instructions to the post office: "if the seal is broken, reject it."
 *
 * Without all three, your emails are far more likely to land in spam,
 * especially at volume. Gmail and Yahoo made these mandatory for bulk
 * senders in 2024.
 */

export interface DomainAuthResult {
  domain: string;
  spf: {
    found: boolean;
    record: string | null;
    valid: boolean;
    details: string;
  };
  dkim: {
    found: boolean;
    selector: string | null;
    details: string;
  };
  dmarc: {
    found: boolean;
    record: string | null;
    policy: string | null;
    details: string;
  };
  mx: {
    found: boolean;
    records: string[];
  };
  overallScore: 'good' | 'partial' | 'poor';
  recommendations: string[];
}

// Common DKIM selectors used by major email providers
const DKIM_SELECTORS = [
  'default',        // Titan / Hostinger
  'titan',          // Titan
  'google',         // Google Workspace
  'selector1',      // Microsoft 365
  'selector2',      // Microsoft 365
  'zoho',           // Zoho
  'zmail',          // Zoho
  'k1',             // Mailchimp
  'mailo',          // Generic
  's1',             // Generic
  's2',             // Generic
];

/**
 * Extract the domain from an email address.
 */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

/**
 * Check SPF record for a domain.
 */
async function checkSpf(domain: string): Promise<DomainAuthResult['spf']> {
  try {
    const records = await resolveTxt(domain);
    const flat = records.map((r) => r.join('')).filter(Boolean);
    const spfRecord = flat.find((r) => r.toLowerCase().startsWith('v=spf1'));

    if (!spfRecord) {
      return {
        found: false,
        record: null,
        valid: false,
        details: 'No SPF record found. Receiving servers cannot verify that your emails are authorized.',
      };
    }

    // Basic validation: check it has at least one mechanism
    const hasInclude = /include:|a:|mx:|ip4:|ip6:|all/i.test(spfRecord);
    return {
      found: true,
      record: spfRecord,
      valid: hasInclude,
      details: hasInclude
        ? 'SPF record found and contains authorization mechanisms.'
        : 'SPF record found but may be incomplete (no include, a, mx, or ip mechanisms).',
    };
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return {
        found: false,
        record: null,
        valid: false,
        details: 'No SPF record found for this domain.',
      };
    }
    return {
      found: false,
      record: null,
      valid: false,
      details: `SPF lookup failed: ${err.message}`,
    };
  }
}

/**
 * Check DKIM by trying common selectors.
 */
async function checkDkim(domain: string): Promise<DomainAuthResult['dkim']> {
  for (const selector of DKIM_SELECTORS) {
    try {
      const dkimDomain = `${selector}._domainkey.${domain}`;
      const records = await resolveTxt(dkimDomain);
      const flat = records.map((r) => r.join('')).filter(Boolean);
      const dkimRecord = flat.find((r) => r.includes('v=DKIM1') || r.includes('k=rsa') || r.includes('p='));

      if (dkimRecord) {
        return {
          found: true,
          selector,
          details: `DKIM record found using selector "${selector}".`,
        };
      }
    } catch {
      // Try next selector
    }
  }

  return {
    found: false,
    selector: null,
    details: 'No DKIM record found with common selectors. Your email provider may use a custom selector. Check your provider\'s DNS setup guide.',
  };
}

/**
 * Check DMARC record.
 */
async function checkDmarc(domain: string): Promise<DomainAuthResult['dmarc']> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    const flat = records.map((r) => r.join('')).filter(Boolean);
    const dmarcRecord = flat.find((r) => r.toLowerCase().startsWith('v=dmarc1'));

    if (!dmarcRecord) {
      return {
        found: false,
        record: null,
        policy: null,
        details: 'No DMARC record found. Receiving servers have no instructions for handling authentication failures.',
      };
    }

    // Extract policy
    const policyMatch = dmarcRecord.match(/p=(\w+)/i);
    const policy = policyMatch ? policyMatch[1].toLowerCase() : null;

    let policyNote = '';
    if (policy === 'none') {
      policyNote = ' Policy is "none" (monitoring only, no enforcement). Consider upgrading to "quarantine" or "reject" once you confirm deliverability.';
    } else if (policy === 'quarantine') {
      policyNote = ' Policy is "quarantine" (suspicious mail goes to spam). Good protection.';
    } else if (policy === 'reject') {
      policyNote = ' Policy is "reject" (unauthorized mail is blocked). Strongest protection.';
    }

    return {
      found: true,
      record: dmarcRecord,
      policy,
      details: `DMARC record found.${policyNote}`,
    };
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return {
        found: false,
        record: null,
        policy: null,
        details: 'No DMARC record found for this domain.',
      };
    }
    return {
      found: false,
      record: null,
      policy: null,
      details: `DMARC lookup failed: ${err.message}`,
    };
  }
}

/**
 * Check MX records.
 */
async function checkMx(domain: string): Promise<DomainAuthResult['mx']> {
  try {
    const records = await resolveMx(domain);
    const sorted = records.sort((a, b) => a.priority - b.priority);
    return {
      found: sorted.length > 0,
      records: sorted.map((r) => `${r.exchange} (priority ${r.priority})`),
    };
  } catch {
    return { found: false, records: [] };
  }
}

/**
 * Run all domain authentication checks and produce a summary with
 * actionable recommendations.
 */
export async function checkDomainAuth(email: string): Promise<DomainAuthResult> {
  const domain = extractDomain(email);
  if (!domain) {
    return {
      domain: '',
      spf: { found: false, record: null, valid: false, details: 'Invalid email address' },
      dkim: { found: false, selector: null, details: 'Invalid email address' },
      dmarc: { found: false, record: null, policy: null, details: 'Invalid email address' },
      mx: { found: false, records: [] },
      overallScore: 'poor',
      recommendations: ['Provide a valid email address to check domain authentication.'],
    };
  }

  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
    checkMx(domain),
  ]);

  const recommendations: string[] = [];

  if (!spf.found) {
    recommendations.push(
      `Add an SPF record to ${domain}. Your email provider (check their DNS setup guide) will give you the exact TXT record to add. It typically looks like: v=spf1 include:_spf.your-provider.com ~all`
    );
  }

  if (!dkim.found) {
    recommendations.push(
      `Set up DKIM for ${domain}. Your email provider's admin panel usually has a "DKIM" or "Email Authentication" section that gives you the DNS record to add.`
    );
  }

  if (!dmarc.found) {
    recommendations.push(
      `Add a DMARC record to ${domain}. Start with a monitoring policy: add a TXT record at _dmarc.${domain} with value: v=DMARC1; p=none; rua=mailto:${email}`
    );
  } else if (dmarc.policy === 'none') {
    recommendations.push(
      `Your DMARC policy is "none" (monitoring only). Once you are confident SPF and DKIM are working, upgrade to p=quarantine or p=reject for stronger protection.`
    );
  }

  if (!mx.found) {
    recommendations.push(
      `No MX records found for ${domain}. This domain may not be set up to receive email.`
    );
  }

  const passCount = [spf.found && spf.valid, dkim.found, dmarc.found].filter(Boolean).length;
  const overallScore: DomainAuthResult['overallScore'] =
    passCount === 3 ? 'good' : passCount >= 1 ? 'partial' : 'poor';

  if (passCount === 3 && recommendations.length === 0) {
    recommendations.push('All checks passed. Your domain authentication is properly configured for bulk email sending.');
  }

  return { domain, spf, dkim, dmarc, mx, overallScore, recommendations };
}