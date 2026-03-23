import { supabase } from '@/lib/supabase';

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/**
 * Upload a file to Supabase storage (files bucket) and return the public URL.
 */
export async function uploadMessageAttachment(
  file: File,
  userId: string
): Promise<UploadedFile | null> {
  if (file.size > MAX_FILE_SIZE) {
    console.error('File too large (max 10MB)');
    return null;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    console.error('File type not allowed');
    return null;
  }

  const ext = file.name.split('.').pop() || 'bin';
  const path = `messages/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error } = await supabase.storage
    .from('files')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('Upload failed:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from('files').getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Check if a file_url is an image.
 */
export function isImageFile(fileUrl: string | null, metadata?: Record<string, unknown> | null): boolean {
  if (!fileUrl) return false;
  const type = (metadata?.type as string) || '';
  if (type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(fileUrl);
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
