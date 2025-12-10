// Always get a signed URL for a file (for private buckets)
export async function getDocumentUrl(filename: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filename, 3600);
  if (error || !data) throw error || new Error('Could not get file URL');
  return data.signedUrl;
}
import { supabase } from './supabaseClient';

const BUCKET = 'documents';

export async function uploadDocument(file: File) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(BUCKET).upload(file.name, file, {
    upsert: true,
  });
  if (error) throw error;
  return data;
}

export async function listDocuments(): Promise<Array<{ name: string; id?: string; created_at?: string; updated_at?: string; last_accessed_at?: string; metadata?: any; size?: number }>> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  return data || [];
}

export async function downloadDocument(filename: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(BUCKET).download(filename);
  if (error) throw error;
  // Create a download link and trigger it
  const url = window.URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function renameDocument(oldName: string, newName: string) {
  if (!supabase) throw new Error('Supabase not configured');
  // Supabase doesn't have a direct rename, so we need to move the file
  const { data, error } = await supabase.storage.from(BUCKET).move(oldName, newName);
  if (error) throw error;
  return data;
}

export async function deleteDocument(filename: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.storage.from(BUCKET).remove([filename]);
  if (error) throw error;
  return data;
}
