/**
 * MCP API Authentication Middleware
 *
 * Validates the X-MCP-Key header against the MCP_API_KEY env var.
 * Also implements basic rate limiting (60 requests/minute).
 *
 * Usage in route files:
 *   import { validateMcpRequest } from '@/lib/mcp-auth';
 *   const auth = validateMcpRequest(req);
 *   if (auth.error) return auth.error;
 */

import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

// In-memory rate limit (resets on server restart — fine for this use case)
const requestLog: number[] = [];

export function validateMcpRequest(req: NextRequest): { ok: boolean; error?: NextResponse } {
  // 1. Check API key
  const apiKey = req.headers.get('x-mcp-key');
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'MCP_API_KEY not configured on the server. Set it in .env' },
        { status: 503 }
      ),
    };
  }

  if (!apiKey || apiKey !== expectedKey) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // 2. Rate limiting
  const now = Date.now();
  // Remove requests older than 1 minute
  while (requestLog.length > 0 && requestLog[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestLog.shift();
  }

  if (requestLog.length >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Rate limited. Try again in a minute.' }, { status: 429 }),
    };
  }

  requestLog.push(now);
  return { ok: true };
}
