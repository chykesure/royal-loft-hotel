import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'upload', 'cloud');

export async function GET() {
  try {
    const files = await db.cloudFile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(files);
  } catch (error) {
    console.error('Cloud GET error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string || 'other';
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    await writeFile(filePath, buffer);

    const cloudFile = await db.cloudFile.create({
      data: {
        name: fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: filePath,
        category,
        uploadedBy: uploadedBy || undefined,
      },
    });

    return NextResponse.json(cloudFile, { status: 201 });
  } catch (error) {
    console.error('Cloud POST error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    await db.cloudFile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cloud DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
