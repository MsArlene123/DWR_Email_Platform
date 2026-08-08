export interface RenderContext {
  [key: string]: string | undefined;
}

/**
 * Normalize a variable name to uppercase with underscores.
 * FIRST_NAME, First Name, first name -> FIRST_NAME
 */
export function normalizeVarName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
}

/**
 * Build a normalized context where all keys are uppercase + underscores.
 * This allows templates with {{FIRST_NAME}} to match sheet columns like "First Name" or "first_name".
 */
export function buildContext(row: Record<string, string>): RenderContext {
  const ctx: RenderContext = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeVarName(key);
    if (!ctx[normalized]) {
      ctx[normalized] = value;
    }
  }
  return ctx;
}

/**
 * Render a template by replacing {{VAR_NAME}} placeholders with values from context.
 * Missing variables are replaced with empty string.
 */
export function renderTemplate(
  template: string,
  context: RenderContext
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([A-Za-z0-9_\s]+)\s*\}\}/g, (_, varName) => {
    const normalized = normalizeVarName(varName);
    return context[normalized] ?? '';
  });
}

/**
 * Find all personalization tags used in a template.
 */
export function extractTags(template: string): string[] {
  const tags = new Set<string>();
  const matches = template.matchAll(/\{\{\s*([A-Za-z0-9_\s]+)\s*\}\}/g);
  for (const m of matches) {
    tags.add(normalizeVarName(m[1]));
  }
  return Array.from(tags);
}

/**
 * Sample context for previews
 */
export const PREVIEW_CONTEXT: RenderContext = {
  FIRST_NAME: 'Jane',
  LAST_NAME: 'Doe',
  EMAIL_ADDRESS: 'jane.doe@example.org',
  TITLE: 'Executive Director',
  COMPANY_NAME: 'Example Foundation',
  WEBSITE: 'https://example.org',
  PHONE_NUMBERS: '(555) 123-4567',
};
