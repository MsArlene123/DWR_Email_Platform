import Papa from 'papaparse';

export interface SheetRow {
  [key: string]: string;
}

export interface ParsedSheet {
  columns: string[];
  rows: SheetRow[];
  emailColumn: string | null;
  error?: string;
}

/**
 * Extract Google Sheet ID from URL
 * Supports formats:
 * - https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
 * - https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Extract gid (sheet tab ID) from URL
 */
export function extractGid(url: string): string {
  const match = url.match(/[#&?]gid=([0-9]+)/);
  return match ? match[1] : '0';
}

/**
 * Convert Google Sheet URL to CSV export URL
 * Uses the gviz/tq endpoint which is more reliable from server-side than /export
 * Requires the sheet to be shared with "Anyone with the link can view"
 */
export function getCsvExportUrl(sheetUrl: string): string | null {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return null;

  const gid = extractGid(sheetUrl);
  // Use gviz/tq endpoint with headers=1 for reliable server-side CSV access
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}`;
}

/**
 * Find the email column from a list of columns
 */
export function findEmailColumn(columns: string[]): string | null {
  const emailPatterns = [
    /^email[_\s]*address$/i,
    /^e[_\s]*mail$/i,
    /^email$/i,
    /email/i,
  ];

  for (const pattern of emailPatterns) {
    const match = columns.find((col) => pattern.test(col));
    if (match) return match;
  }

  return null;
}

/**
 * Normalize column names (trim whitespace, handle duplicates)
 */
function normalizeColumns(columns: string[]): string[] {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const trimmed = (col || '').trim();
    if (!trimmed) return '_empty';
    const count = seen.get(trimmed) || 0;
    seen.set(trimmed, count + 1);
    return count > 0 ? `${trimmed}_${count + 1}` : trimmed;
  });
}

/**
 * Fetch and parse a Google Sheet via its CSV export URL
 */
export async function parseGoogleSheet(sheetUrl: string): Promise<ParsedSheet> {
  const csvUrl = getCsvExportUrl(sheetUrl);

  if (!csvUrl) {
    return {
      columns: [],
      rows: [],
      emailColumn: null,
      error: 'Invalid Google Sheets URL',
    };
  }

  try {
    const response = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmailMarketing/1.0)',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 400) {
        return {
          columns: [],
          rows: [],
          emailColumn: null,
          error:
            'Could not access sheet. Please ensure the sheet is shared: click Share → General access → "Anyone with the link" → Viewer.',
        };
      }
      return {
        columns: [],
        rows: [],
        emailColumn: null,
        error: `Failed to fetch sheet (HTTP ${response.status}). Please check the URL and sharing settings.`,
      };
    }

    const csvText = await response.text();

    // Check if we got HTML (sheet not public)
    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
      return {
        columns: [],
        rows: [],
        emailColumn: null,
        error:
          'Sheet is not publicly accessible. Please share with "Anyone with the link can view".',
      };
    }

    const parsed = Papa.parse<string[]>(csvText, {
      skipEmptyLines: true,
    });

    if (parsed.errors?.length && !parsed.data?.length) {
      return {
        columns: [],
        rows: [],
        emailColumn: null,
        error: parsed.errors[0].message,
      };
    }

    const allRows = parsed.data as string[][];
    if (!allRows || allRows.length === 0) {
      return {
        columns: [],
        rows: [],
        emailColumn: null,
        error: 'Sheet is empty',
      };
    }

    const headers = normalizeColumns(allRows[0]);
    const dataRows = allRows.slice(1);

    const rows: SheetRow[] = dataRows
      .filter((row) => row && row.some((v) => v && v.trim()))
      .map((row) => {
        const obj: SheetRow = {};
        headers.forEach((header, idx) => {
          obj[header] = (row[idx] || '').trim();
        });
        return obj;
      });

    const emailColumn = findEmailColumn(headers);

    return {
      columns: headers,
      rows,
      emailColumn,
    };
  } catch (error: any) {
    console.error('Parse sheet error:', error);
    return {
      columns: [],
      rows: [],
      emailColumn: null,
      error: error?.message || 'Failed to parse sheet',
    };
  }
}
