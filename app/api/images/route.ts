export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFileUrl, deleteFile } from '@/lib/s3';

// GET: List all user images
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const images = await prisma.uploadedImage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Generate fresh URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (img) => {
        const url = await getFileUrl(img.cloud_storage_path, img.isPublic);
        return { ...img, url };
      })
    );

    return NextResponse.json(imagesWithUrls);
  } catch (error) {
    console.error('List images error:', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}

// POST: Save uploaded image record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, cloud_storage_path, isPublic, contentType, fileSize } = await req.json();
    if (!fileName || !cloud_storage_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const publicUrl = isPublic ? await getFileUrl(cloud_storage_path, true) : null;

    const image = await prisma.uploadedImage.create({
      data: {
        userId: session.user.id,
        fileName,
        cloud_storage_path,
        isPublic: isPublic ?? true,
        publicUrl,
        contentType: contentType || 'image/png',
        fileSize: fileSize || null,
      },
    });

    const url = await getFileUrl(cloud_storage_path, isPublic ?? true);

    return NextResponse.json({ ...image, url });
  } catch (error) {
    console.error('Save image error:', error);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
}

// DELETE: Remove an image
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    const image = await prisma.uploadedImage.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from S3
    await deleteFile(image.cloud_storage_path);

    // Delete from DB
    await prisma.uploadedImage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
