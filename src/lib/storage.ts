import { supabase } from "./supabase";

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  RESUMES: "resumes",
  CERTIFICATES: "certificates",
  PROJECT_FILES: "project-files",
  COMPANY_LOGOS: "company-logos",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// Allowed file types per bucket
const ALLOWED_TYPES: Record<StorageBucket, string[]> = {
  avatars: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  resumes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  certificates: ["application/pdf", "image/jpeg", "image/png"],
  "project-files": ["application/pdf", "image/jpeg", "image/png", "application/zip", "text/plain"],
  "company-logos": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
};

// Max file sizes per bucket (in bytes)
const MAX_FILE_SIZES: Record<StorageBucket, number> = {
  avatars: 5 * 1024 * 1024, // 5MB
  resumes: 10 * 1024 * 1024, // 10MB
  certificates: 5 * 1024 * 1024, // 5MB
  "project-files": 50 * 1024 * 1024, // 50MB
  "company-logos": 5 * 1024 * 1024, // 5MB
};

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before upload
 */
export function validateFile(
  file: File,
  bucket: StorageBucket
): FileValidationResult {
  // Check file type
  const allowedTypes = ALLOWED_TYPES[bucket];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[bucket];
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file path
 */
function generateFilePath(
  userId: string,
  fileName: string,
  bucket: StorageBucket
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = sanitizedName.split(".").pop() || "";
  const baseName = sanitizedName.replace(`.${extension}`, "");

  return `${userId}/${timestamp}-${baseName.substring(0, 50)}.${extension}`;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket,
  userId: string
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file, bucket);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const filePath = generateFilePath(userId, file.name, bucket);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: "Failed to upload file" };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  path: string,
  bucket: StorageBucket
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Delete error:", err);
    return { success: false, error: "Failed to delete file" };
  }
}

/**
 * Get a signed URL for a private file
 */
export async function getSignedUrl(
  path: string,
  bucket: StorageBucket,
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err) {
    return { error: "Failed to get signed URL" };
  }
}

/**
 * Upload avatar and update profile
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  const result = await uploadFile(file, STORAGE_BUCKETS.AVATARS, userId);

  if (result.success && result.url) {
    // Update profile with new avatar URL
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: result.url })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update profile:", error);
      // Don't fail the upload, just log the error
    }
  }

  return result;
}

/**
 * Upload resume and update candidate profile
 */
export async function uploadResume(
  file: File,
  userId: string
): Promise<UploadResult> {
  const result = await uploadFile(file, STORAGE_BUCKETS.RESUMES, userId);

  if (result.success && result.url) {
    // Update candidate profile with new resume URL
    const { error } = await supabase
      .from("candidate_profiles")
      .update({ resume_url: result.url })
      .eq("profile_id", userId);

    if (error) {
      console.error("Failed to update candidate profile:", error);
    }

    // Create growth log entry
    await supabase.from("growth_log_entries").insert({
      candidate_id: userId,
      event_type: "resume_upload",
      title: "Resume Uploaded",
      description: `Uploaded resume: ${file.name}`,
      source_component: "Profile",
    });
  }

  return result;
}

/**
 * Upload company logo and update employer profile
 */
export async function uploadCompanyLogo(
  file: File,
  userId: string,
  employerId: string
): Promise<UploadResult> {
  const result = await uploadFile(file, STORAGE_BUCKETS.COMPANY_LOGOS, userId);

  if (result.success && result.url) {
    // Update employer profile with new logo URL
    const { error } = await supabase
      .from("employer_profiles")
      .update({ company_logo_url: result.url })
      .eq("id", employerId);

    if (error) {
      console.error("Failed to update employer profile:", error);
    }
  }

  return result;
}

/**
 * React hook helper for file input handling
 */
export function createFileInputHandler(
  onUpload: (file: File) => Promise<void>,
  accept?: string
) {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input to allow re-selecting same file
    event.target.value = "";
  };
}

export const StorageService = {
  uploadFile,
  deleteFile,
  getSignedUrl,
  uploadAvatar,
  uploadResume,
  uploadCompanyLogo,
  validateFile,
  STORAGE_BUCKETS,
};

export default StorageService;
