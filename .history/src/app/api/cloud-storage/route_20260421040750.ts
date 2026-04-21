import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/json',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip',
  'application/xml',
];

const ALLOWED_CATEGORIES = [
  'contracts', 'licenses', 'guest_ids', 'receipts',
  'invoices', 'policies', 'reports', 'other',
];

const ROLE_HIERARCHY = ['staff', 'housekeeping', 'auditor', 'front_desk', 'accountant', 'manager', 'super_admin', 'developer'];

// ─── Auth ────────────────────────────────────────────────────────────────────

async function authenticate(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

function canAccessFile(userRole: string, fileAccessLevel: string): boolean {
  const ACCESS_LEVEL_MIN_ROLE: Record<string, number> = {
    'all_staff': 0,
    'accountant': 5,
    'manager': 5,
    'admin': 6,
  };
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ACCESS_LEVEL_MIN_ROLE[fileAccessLevel] ?? 6;
  return userLevel >= requiredLevel;
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (category && category !== 'all') where.category = category;
    if (search) where.originalName = { contains: search };

    const files = await db.cloudFile.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    const accessibleFiles = files.filter((f) => canAccessFile(user.role, f.accessLevel));

    const totalFiles = accessibleFiles.length;
    const totalSize = accessibleFiles.reduce((sum, f) => sum + f.size, 0);

    const categoryMap = new Map<string, { count: number; size: number }>();
    for (const f of accessibleFiles) {
      const cat = f.category || 'other';
      const existing = categoryMap.get(cat) || { count: 0, size: 0 };
      existing.count += 1;
      existing.size += f.size;
      categoryMap.set(cat, existing);
    }

    const categories = Array.from(categoryMap.entries()).map(([cat, data]) => ({
      category: cat,
      count: data.count,
      size: data.size,
    }));

    return NextResponse.json({
      files: accessibleFiles,
      summary: { totalFiles, totalSize, categories },
    });
  } catch (error: unknown) {
    console.error('Cloud storage GET error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

// ─── POST (Upload) ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'other';
    const accessLevel = (formData.get('accessLevel') as string) || 'admin';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type || 'unknown'}" is not allowed.` },
        { status: 400 },
      );
    }

    const finalCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'other';
    const validAccessLevels = ['admin', 'manager', 'accountant', 'all_staff'];
    const finalAccessLevel = validAccessLevels.includes(accessLevel) ? accessLevel : 'admin';

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name) || '';
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    const filename = `${baseName}_${timestamp}_${randomStr}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', finalCategory);
    fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const existingFile = await db.cloudFile.findFirst({
      where: { originalName: file.name, category: finalCategory },
      orderBy: { version: 'desc' },
    });
    const nextVersion = existingFile ? (existingFile.version || 0) + 1 : 1;

    const record = await db.cloudFile.create({
      data: {
        name: filename,
        originalName: file.name,
        mimeType: file.type,
        size: buffer.length,
        path: `uploads/${finalCategory}/${filename}`,
        category: finalCategory,
        accessLevel: finalAccessLevel,
        uploadedBy: user.id,
        version: nextVersion,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: unknown) {
    console.error('Cloud storage POST error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'super_admin', 'developer'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete files' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const fileRecord = await db.cloudFile.findUnique({ where: { id } });
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', fileRecord.path);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // File may already be deleted from disk
    }

    await db.cloudFile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Cloud storage DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}