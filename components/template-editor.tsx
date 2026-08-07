'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Code,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  ImageIcon,
  Undo2,
  Redo2,
  Minus,
  Quote,
  Type,
  Upload,
  X,
  FolderOpen,
  Check,
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { AIWriterDialog } from '@/components/ai-writer-dialog';

// Custom resizable image node view
function ResizableImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const startDataRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const imgWidth = node.attrs.width || null;
  const imgHeight = node.attrs.height || null;

  const openSizeEditor = () => {
    setWidthInput(imgWidth ? String(imgWidth) : '');
    setHeightInput(imgHeight ? String(imgHeight) : '');
    setIsEditing(true);
  };

  const applySizes = () => {
    const w = widthInput ? parseInt(widthInput, 10) : null;
    const h = heightInput ? parseInt(heightInput, 10) : null;
    updateAttributes({ width: w || null, height: h || null });
    setIsEditing(false);
  };

  const applyPreset = (w: number) => {
    updateAttributes({ width: w, height: null });
    setIsEditing(false);
  };

  const resetSize = () => {
    updateAttributes({ width: null, height: null });
    setIsEditing(false);
  };

  // Drag-to-resize handler
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const imgEl = containerRef.current?.querySelector('img');
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    startDataRef.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height };
    setIsResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!startDataRef.current) return;
      const newW = Math.max(50, startDataRef.current.startW + (ev.clientX - startDataRef.current.startX));
      const aspect = startDataRef.current.startH / startDataRef.current.startW;
      const newH = Math.round(newW * aspect);
      updateAttributes({ width: Math.round(newW), height: newH });
    };
    const onMouseUp = () => {
      setIsResizing(false);
      startDataRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className="relative inline-block my-2" data-drag-handle>
      <div ref={containerRef} className={`relative inline-block group ${selected ? 'ring-2 ring-blue-400 rounded' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          width={imgWidth || undefined}
          height={imgHeight || undefined}
          style={{
            width: imgWidth ? `${imgWidth}px` : undefined,
            height: imgHeight ? `${imgHeight}px` : undefined,
            maxWidth: '100%',
            cursor: 'pointer',
            display: 'block',
          }}
          onClick={openSizeEditor}
          draggable={false}
        />

        {/* Resize drag handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={onMouseDown}
          title="Drag to resize"
        />

        {/* Size indicator on hover */}
        {(imgWidth || imgHeight) && (
          <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {imgWidth || '?'}×{imgHeight || 'auto'}
          </div>
        )}

        {/* Size editing popover */}
        {isEditing && !isResizing && (
          <div
            className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[260px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-700 mb-2">Image Size</p>

            {/* Presets */}
            <div className="flex gap-1 mb-2">
              {[100, 200, 300, 400, 600].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => applyPreset(w)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    imgWidth === w ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Custom inputs */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500">Width</label>
                <input
                  type="number"
                  value={widthInput}
                  onChange={(e) => setWidthInput(e.target.value)}
                  placeholder="auto"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <span className="text-gray-400 mt-3">×</span>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500">Height</label>
                <input
                  type="number"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="auto"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={applySizes}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetSize}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Custom image extension with width/height and resize node view
const ResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}) },
      height: { default: null, renderHTML: (attrs) => (attrs.height ? { height: attrs.height } : {}) },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export interface TemplateFormData {
  name: string;
  category: 'NONPROFIT' | 'ATTORNEY_LEGAL' | 'BOOKSTORE_MEDIA' | 'GENERAL_BUSINESS' | 'CUSTOM';
  subject: string;
  htmlContent: string;
  plainText: string;
}

const PREVIEW_CONTEXT: Record<string, string> = {
  FIRST_NAME: 'Jane',
  LAST_NAME: 'Doe',
  EMAIL_ADDRESS: 'jane.doe@example.org',
  TITLE: 'Executive Director',
  COMPANY_NAME: 'Example Foundation',
  WEBSITE: 'https://example.org',
  PHONE_NUMBERS: '(555) 123-4567',
};

function renderPreview(template: string): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_\s]+)\s*\}\}/g, (_, varName) => {
    const key = varName.trim().replace(/\s+/g, '_').toUpperCase();
    return (PREVIEW_CONTEXT as any)[key] ?? `{{${varName}}}`;
  });
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

interface LibraryImage {
  id: string;
  fileName: string;
  url: string;
  publicUrl: string | null;
}

function ImagePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [tab, setTab] = useState<'library' | 'upload' | 'url'>('library');
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoadingLib(true);
      setSelectedId(null);
      setUrlInput('');
      fetch('/api/images')
        .then((r) => r.json())
        .then((data) => setLibraryImages(Array.isArray(data) ? data : []))
        .catch(() => setLibraryImages([]))
        .finally(() => setLoadingLib(false));
    }
  }, [open]);

  const handleUploadAndInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });
      if (!presignedRes.ok) {
        const errBody = await presignedRes.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to get upload URL (HTTP ${presignedRes.status})`);
      }
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      const urlObj = new URL(uploadUrl);
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'inline';
      }

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        const msgMatch = errText.match(/<Message>([^<]+)<\/Message>/);
        throw new Error(
          `Storage rejected upload (HTTP ${uploadRes.status}): ` +
            (msgMatch?.[1] || errText.slice(0, 200) || 'unknown error')
        );
      }

      const saveRes = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          cloud_storage_path,
          isPublic: true,
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      if (!saveRes.ok) throw new Error('Failed to save');
      const saved = await saveRes.json();
      onSelect(saved.publicUrl || saved.url);
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to upload image: ${msg}\n\nTip: visit /api/upload/diagnostics (signed in) to see which storage setting is missing.`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!open) return null;

  const selectedImg = libraryImages.find((i) => i.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Insert Image</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('library')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${
              tab === 'library' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="inline h-4 w-4 mr-1.5" />
            My Library
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${
              tab === 'upload' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="inline h-4 w-4 mr-1.5" />
            Upload New
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${
              tab === 'url' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LinkIcon className="inline h-4 w-4 mr-1.5" />
            From URL
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[250px]">
          {tab === 'library' && (
            <>
              {loadingLib ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No images in your library yet.</p>
                  <p className="text-sm mt-1">Upload images from the &quot;Upload New&quot; tab or the Image Library page.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {libraryImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedId(img.id === selectedId ? null : img.id)}
                      className={`relative rounded-lg border-2 overflow-hidden aspect-video bg-gray-100 transition-all ${
                        selectedId === img.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.fileName} className="w-full h-full object-contain" />
                      {selectedId === img.id && (
                        <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5">
                        <p className="text-[10px] text-white truncate">{img.fileName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Upload className="h-10 w-10 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">Upload an image and insert it directly</p>
              <label>
                <Button variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Choose Image'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadAndInsert}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">Max 10MB · PNG, JPG, GIF, SVG, WebP</p>
            </div>
          )}

          {tab === 'url' && (
            <div className="py-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/my-image.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {urlInput && (
                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-h-32 mx-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          {tab === 'library' && (
            <Button
              type="button"
              disabled={!selectedImg}
              onClick={() => {
                if (selectedImg) {
                  onSelect(selectedImg.publicUrl || selectedImg.url);
                  onClose();
                }
              }}
            >
              Insert Selected
            </Button>
          )}
          {tab === 'url' && (
            <Button
              type="button"
              disabled={!urlInput}
              onClick={() => {
                if (urlInput) {
                  onSelect(urlInput);
                  onClose();
                }
              }}
            >
              Insert Image
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorToolbar({ editor, onOpenImagePicker, onAIWrite }: { editor: any; onOpenImagePicker: () => void; onAIWrite: () => void }) {
  if (!editor) return null;

  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = prompt('Enter link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const setColor = useCallback(() => {
    const color = prompt('Enter color (hex or name):', '#000000');
    if (color) {
      editor.chain().focus().setColor(color).run();
    }
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50">
      {/* Undo/Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
        <Type className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Line">
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onOpenImagePicker} title="Insert Image">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={setColor} title="Text Color">
        <div className="h-4 w-4 rounded border border-gray-300 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* AI Writer */}
      <button
        type="button"
        onClick={onAIWrite}
        title="Write with AI"
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Write with AI
      </button>
    </div>
  );
}

export function TemplateEditor({
  initial,
  onSave,
  saveLabel = 'Save Template',
  submitting,
}: {
  initial?: Partial<TemplateFormData>;
  onSave: (data: TemplateFormData) => void | Promise<void>;
  saveLabel?: string;
  submitting?: boolean;
}) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initial?.name || '',
    category: initial?.category || 'CUSTOM',
    subject: initial?.subject || '',
    htmlContent: initial?.htmlContent || '',
    plainText: initial?.plainText || '',
  });
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'preview'>('visual');
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [aiWriterOpen, setAiWriterOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      ResizableImage.configure({
        HTMLAttributes: { style: 'max-width: 100%; height: auto;' },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: initial?.htmlContent || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[350px] px-4 py-3',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setFormData((d) => ({ ...d, htmlContent: html }));
    },
  });

  // Sync initial content when it changes (e.g. loading from API)
  useEffect(() => {
    if (initial) {
      setFormData({
        name: initial.name || '',
        category: initial.category || 'CUSTOM',
        subject: initial.subject || '',
        htmlContent: initial.htmlContent || '',
        plainText: initial.plainText || '',
      });
      if (editor && initial.htmlContent && editor.getHTML() !== initial.htmlContent) {
        editor.commands.setContent(initial.htmlContent);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.name, initial?.category, initial?.subject, initial?.htmlContent, initial?.plainText]);

  // Sync from raw HTML tab back to visual editor
  const syncHtmlToEditor = useCallback(() => {
    if (editor) {
      editor.commands.setContent(formData.htmlContent);
    }
  }, [editor, formData.htmlContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Get latest HTML from editor if on visual tab
    let finalHtml = formData.htmlContent;
    if (editor && activeTab === 'visual') {
      finalHtml = editor.getHTML();
    }
    await onSave({ ...formData, htmlContent: finalHtml });
  };

  const insertTag = (tag: string) => {
    if (editor && activeTab === 'visual') {
      editor.chain().focus().insertContent(` {{${tag}}} `).run();
    } else {
      setFormData((d) => ({ ...d, htmlContent: d.htmlContent + ` {{${tag}}}` }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Nonprofit Donation Appeal"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CUSTOM">Custom</option>
              <option value="NONPROFIT">Nonprofit Outreach</option>
              <option value="ATTORNEY_LEGAL">Attorney/Legal Marketing</option>
              <option value="BOOKSTORE_MEDIA">Bookstore/Media</option>
              <option value="GENERAL_BUSINESS">General Business</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Hello {{FIRST_NAME}}, ..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200">
          <div className="flex">
            <button
              type="button"
              onClick={() => { setActiveTab('visual'); }}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'visual'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ✏️ Visual Editor
            </button>
            <button
              type="button"
              onClick={() => {
                // Sync editor HTML to formData before switching
                if (editor) {
                  setFormData((d) => ({ ...d, htmlContent: editor.getHTML() }));
                }
                setActiveTab('html');
              }}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'html'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="inline mr-1 h-4 w-4" />
              HTML Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'preview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="inline mr-1 h-4 w-4" />
              Preview
            </button>
          </div>
          <div className="px-4 text-xs text-gray-500">
            Preview uses sample data (Jane Doe, Example Foundation)
          </div>
        </div>

        {/* Toolbar for visual mode */}
        {activeTab === 'visual' && (
          <EditorToolbar
            editor={editor}
            onOpenImagePicker={() => setImagePickerOpen(true)}
            onAIWrite={() => setAiWriterOpen(true)}
          />
        )}

        {/* Image Picker Modal */}
        <ImagePickerModal
          open={imagePickerOpen}
          onClose={() => setImagePickerOpen(false)}
          onSelect={(url) => {
            if (editor) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        />

        {/* AI Writer Dialog */}
        <AIWriterDialog
          open={aiWriterOpen}
          onOpenChange={setAiWriterOpen}
          existingSubject={formData.subject}
          onInsert={(email) => {
            // Update the form data with AI-generated content
            setFormData({
              ...formData,
              subject: email.subject,
              htmlContent: email.htmlContent,
              plainText: email.plainText,
            });
            // Also update the TipTap editor with the HTML content
            if (editor) {
              editor.commands.setContent(email.htmlContent);
            }
          }}
        />

        <div className="min-h-[400px]">
          {activeTab === 'visual' ? (
            <EditorContent editor={editor} />
          ) : activeTab === 'html' ? (
            <div className="p-4">
              <textarea
                required
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                onBlur={syncHtmlToEditor}
                className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`<h1>Hello {{FIRST_NAME}}!</h1>\n<p>Welcome to our newsletter...</p>`}
              />
            </div>
          ) : (
            <div className="p-4">
              <div className="border border-gray-200 rounded-md bg-white p-4 h-96 overflow-y-auto">
                <div className="mb-4 pb-2 border-b">
                  <div className="text-sm text-gray-500">Subject:</div>
                  <div className="font-medium">{renderPreview(formData.subject)}</div>
                </div>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderPreview(formData.htmlContent) }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Personalization Tags */}
        <div className="px-4 pb-4 border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-600 mb-2">
            Click a personalization tag to insert at cursor position:
          </div>
          <div className="flex flex-wrap gap-1">
            {['FIRST_NAME', 'LAST_NAME', 'EMAIL_ADDRESS', 'TITLE', 'COMPANY_NAME', 'WEBSITE', 'PHONE_NUMBERS'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
              >{`{{${tag}}}`}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Plain text fallback */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plain Text Version <span className="text-gray-400">(optional fallback for email clients that don&apos;t display HTML)</span>
        </label>
        <textarea
          value={formData.plainText}
          onChange={(e) => setFormData({ ...formData, plainText: e.target.value })}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Plain text version of the email..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </div>
    </form>
  );
}
