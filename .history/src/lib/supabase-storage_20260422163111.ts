import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side Supabase client using the service role key.
 * This bypasses RLS policies — use ONLY in server-side API routes.
 */
let _serverClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServerClient() {
  if (_serverClient) return _serverClient;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase Storage] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  _serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  return _serverClient;
}

const BACKUP_BUCKET = 'royal-loft-backups';

/**
 * Upload a backup JSON file to Supabase Storage.
 * Returns the storage path on success, or null on failure.
 */
export async function uploadBackupToStorage(
  backupId: string,
  jsonString: string
): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${timestamp}_backup_${backupId}.json`;

    const { error } = await client.storage
      .from(BACKUP_BUCKET)
      .upload(filePath, jsonString, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage] Upload failed:', error.message);
      return null;
    }

    // Delete old files in the bucket, keep only the 10 most recent
    await cleanupOldStorageFiles(client);

    return filePath;
  } catch (err) {
    console.error('[Supabase Storage] Upload error:', err);
    return null;
  }
}

/**
 * Delete old backup files from Supabase Storage, keeping only the 10 most recent.
 */
async function cleanupOldStorageFiles(
  client: ReturnType<typeof createClient>
) {
  try {
    const { data, error } = await client.storage
      .from(BACKUP_BUCKET)
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });

    if (error || !data || data.length <= 10) return;

    const toDelete = data.slice(10);
    const paths = toDelete.map((f) => f.name);

    await client.storage.from(BACKUP_BUCKET).remove(paths);
  } catch (err) {
    console.error('[Supabase Storage] Cleanup error:', err);
  }
}

// ─── Cloud File Storage ───────────────────────────────────────────────────────

const CLOUD_BUCKET = 'royal-loft-cloud';

/**
 * Upload a cloud file to Supabase Storage.
 * Returns the storage path on success, or null on failure.
 */
export async function uploadCloudFile(
  category: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  try {
    const filePath = `${category}/${filename}`;

    const { error } = await client.storage
      .from(CLOUD_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage] Cloud file upload failed:', error.message);
      return null;
    }

    return filePath;
  } catch (err) {
    console.error('[Supabase Storage] Cloud file upload error:', err);
    return null;
  }
}

/**
 * Delete a cloud file from Supabase Storage.
 */
export async function deleteCloudFile(storagePath: string): Promise<boolean> {
  const client = getSupabaseServerClient();
  if (!client) return false;

  try {
    const { error } = await client.storage
      .from(CLOUD_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('[Supabase Storage] Cloud file delete failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Storage] Cloud file delete error:', err);
    return false;
  }
}

/**
 * Get a public or signed URL for a cloud file.
 * Returns null if the file doesn't exist or on error.
 */
export async function getCloudFileUrl(storagePath: string): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  try {
    const { data } = client.storage.from(CLOUD_BUCKET).getPublicUrl(storagePath);
    if (data?.publicUrl) return data.publicUrl;
    return null;
  } catch (err) {
    console.error('[Supabase Storage] Get URL error:', err);
    return null;
  }
}