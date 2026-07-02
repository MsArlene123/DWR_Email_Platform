'use client';

import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, Copy, Check, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface UploadedImage {
  id: string;
  fileName: string;
  url: string;
  publicUrl: string | null;
  contentType: string;
  fileSize: number | null;
  createdAt: string;
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (err) {
      console.error('Failed to fetch images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        // Step 1: Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            isPublic: true,
          }),
        });
        if (!presignedRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        // Step 2: Upload to S3
        // Check if content-disposition is in signed headers
        const urlObj = new URL(uploadUrl);
        const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || '';
        const headers: Record<string, string> = { 'Content-Type': file.type };
        if (signedHeaders.includes('content-disposition')) {
          headers['Content-Disposition'] = 'attachment';
        }

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers,
          body: file,
        });
        if (!uploadRes.ok) throw new Error('Failed to upload file to storage');

        // Step 3: Save record
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
        if (!saveRes.ok) throw new Error('Failed to save image record');

        toast.success(`${file.name} uploaded!`);
      }
      await fetchImages();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      const res = await fetch(`/api/images?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Image deleted');
        setImages((prev) => prev.filter((img) => img.id !== id));
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete image');
    }
  };

  const copyUrl = (img: UploadedImage) => {
    const url = img.publicUrl || img.url;
    navigator.clipboard.writeText(url);
    setCopiedId(img.id);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Library</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload images to use in your email templates. Each image gets a public URL you can copy.
          </p>
        </div>
        <label>
          <Button disabled={uploading} asChild>
            <span className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Image
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(210,100%,23%)]" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No images yet</h3>
          <p className="text-gray-500 mt-1 mb-4">
            Upload your logos, banners, and other images to use in email templates.
          </p>
          <label>
            <Button variant="outline" asChild>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Image
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Failed to load';
                  }}
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate" title={img.fileName}>
                  {img.fileName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatSize(img.fileSize)} · {new Date(img.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => copyUrl(img)}
                  >
                    {copiedId === img.id ? (
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedId === img.id ? 'Copied!' : 'Copy URL'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 text-xs"
                    onClick={() => handleDelete(img.id, img.fileName)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
