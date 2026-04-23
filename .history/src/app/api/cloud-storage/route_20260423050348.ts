import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/html', 'application/json',
  'application/zip', 'application/x-rar-compressed', 'application/gzip',
];

const ALLOWED_CATEGORIES = [
  'contracts', 'licenses', 'guest_ids', 'receipts',
  'invoices', 'policies', 'reports', 'other',
];

const BUCKET_NAME = 'hotel-documents';
const ROLE_HIERARCHY = ['staff', 'housekeeping', 'auditor', 'front_desk', 'accountant', 'manager', 'super_admin', 'developer'];

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
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
    'all_staff': 0, 'accountant': 5, 'manager': 5, 'admin': 6,
  };
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ACCESS_LEVEL_MIN_ROLE[fileAccessLevel] ?? 6;
  return userLevel >= requiredLevel;
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

async function uploadToSupabaseStorage(file: File, filePath: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  const { supabaseUrl, serviceKey } = config;
  const arrayBuffer = await file.arrayBuffer();

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: arrayBuffer,
  });
  return response.ok;
}

async function deleteFromSupabaseStorage(filePath: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  const { supabaseUrl, serviceKey } = config;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${serviceKey}` },
  });
  return response.ok || response.status === 200;
}

async function ensureBucketExists(): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  const { supabaseUrl, serviceKey } = config;

  try {
    const listRes = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET_NAME}`, {
      headers: { 'Authorization': `Bearer ${serviceKey}` },
    });
    if (listRes.ok) return true;

    const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: BUCKET_NAME, name: BUCKET_NAME, public: false }),
    });
    return createRes.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate();
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
    return NextResponse.json(accessibleFiles);
  } catch (error: unknown) {
    console.error('Cloud GET error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'Cloud storage not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.' },
        { status: 500 },
      );
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
    const ext = file.name.split('.').pop() || '';
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    const filename = `${baseName}_${timestamp}_${randomStr}.${ext}`;
    const storagePath = `${finalCategory}/${filename}`;

    await ensureBucketExists();
    const uploadSuccess = await uploadToSupabaseStorage(file, storagePath);
    if (!uploadSuccess) {
      return NextResponse.json(
        { error: 'Failed to upload file to Supabase Storage. Check your Supabase configuration.' },
        { status: 500 },
      );
    }

    let existingFile = null;
    try {
      existingFile = await db.cloudFile.findFirst({
        where: { originalName: file.name, category: finalCategory },
        orderBy: { version: 'desc' },
      });
    } catch { }
    const nextVersion = existingFile ? (existingFile.version || 0) + 1 : 1;

    try {
      const record = await db.cloudFile.create({
        data: {
          name: filename, originalName: file.name, mimeType: file.type,
          size: file.size, path: storagePath, category: finalCategory,
          accessLevel: finalAccessLevel, uploadedBy: user.id, version: nextVersion,
        },
      });
      return NextResponse.json(record, { status: 201 });
    } catch (dbError: unknown) {
      console.error('CloudFile DB error:', dbError);
      await deleteFromSupabaseStorage(storagePath);
      return NextResponse.json(
        { error: 'File uploaded but failed to save record. The CloudFile table may need to be created.' },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    console.error('Cloud POST error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'super_admin', 'developer'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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

    await deleteFromSupabaseStorage(fileRecord.path);
    await db.cloudFile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Cloud DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}