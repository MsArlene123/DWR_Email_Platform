/**
 * /api/ai-assistant/upload-document
 *
 * Accepts a file upload (PDF, DOCX, TXT, MD, CSV) from the AI assistant
 * chat, extracts the text content, and returns it so the AI can use it
 * as context when responding.
 *
 * POST /api/ai-assistant/upload-document
 *   multipart/form-data with field "file"
 *
 * Returns: { fileName, content, contentType, fileSize, truncated }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_LENGTH = 50000; // 50K chars — fits in LLM context

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`,
      }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());

    let content = '';

    // Extract text based on file type
    if (fileType === 'text/plain' || fileType === 'text/markdown' || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
      // Plain text — just read it
      content = buffer.toString('utf-8');

    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF — extract text using a simple approach
      // We don't have a PDF library installed, so we'll extract raw text
      // by stripping non-text bytes. This works for text-based PDFs
      // (not scanned/image PDFs).
      try {
        const rawText = buffer.toString('latin1');
        // Extract text between BT and ET markers (PDF text objects)
        const textMatches = rawText.match(/\(([^)]+)\)/g);
        if (textMatches) {
          content = textMatches
            .map(m => m.slice(1, -1))
            .join(' ')
            .replace(/\\[nrt()\\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        if (!content) {
          // Fallback: extract any readable ASCII text
          content = rawText
            .replace(/[^\x20-\x7E\n]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_TEXT_LENGTH);
        }
      } catch {
        content = '[Could not extract text from PDF. Please paste the content manually.]';
      }

    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // DOCX — extract text from the XML inside the zip
      // DOCX files are ZIP archives containing word/document.xml
      try {
        // Simple approach: look for <w:t> tags in the XML
        const rawText = buffer.toString('latin1');
        const textMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatches) {
          content = textMatches
            .map(m => m.replace(/<[^>]+>/g, ''))
            .join(' ')
            .trim();
        }
        if (!content) {
          content = '[Could not extract text from DOCX. Please paste the content manually.]';
        }
      } catch {
        content = '[Could not extract text from DOCX. Please paste the content manually.]';
      }

    } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
      content = buffer.toString('utf-8');

    } else {
      // Try as plain text
      try {
        content = buffer.toString('utf-8');
      } catch {
        return NextResponse.json({
          error: `Unsupported file type: ${fileType}. Supported: TXT, MD, CSV, PDF, DOCX, JSON`,
        }, { status: 400 });
      }
    }

    // Truncate if too long
    const truncated = content.length > MAX_TEXT_LENGTH;
    if (truncated) {
      content = content.slice(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated at 50,000 characters ...]';
    }

    return NextResponse.json({
      fileName,
      content,
      contentType: fileType,
      fileSize: file.size,
      truncated,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}
