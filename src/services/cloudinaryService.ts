// Cloudinary direct-upload service (unsigned upload preset)
// Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  originalFilename: string;
  format: string;
  resourceType: string;
  uploadedAt: string;
  bytes: number;
}

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

function isConfigured(): boolean {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Upload a File to Cloudinary via unsigned upload preset.
 * Falls back to a local object-URL result when Cloudinary is not configured
 * (demo mode — no actual cloud storage).
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'maxhub-erp'
): Promise<CloudinaryUploadResult> {
  if (!isConfigured()) {
    // Demo fallback: store data URL locally and return a fake result
    return new Promise<CloudinaryUploadResult>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result as string,
          publicId: `${folder}/${Date.now()}_${file.name}`,
          originalFilename: file.name,
          format: file.name.split('.').pop() ?? '',
          resourceType: file.type.startsWith('image/') ? 'image' : 'raw',
          uploadedAt: new Date().toISOString(),
          bytes: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET!);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary upload failed (${res.status})`);
  }

  const data = await res.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    originalFilename: data.original_filename ?? file.name,
    format: data.format ?? '',
    resourceType: data.resource_type ?? 'raw',
    uploadedAt: data.created_at ?? new Date().toISOString(),
    bytes: data.bytes ?? file.size,
  };
}

/**
 * Upload multiple files concurrently.
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  folder = 'maxhub-erp'
): Promise<CloudinaryUploadResult[]> {
  return Promise.all(files.map(f => uploadToCloudinary(f, folder)));
}

/** Download a Cloudinary file using its URL. */
export function downloadCloudinaryFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const cloudinaryService = {
  upload: uploadToCloudinary,
  uploadMultiple: uploadMultipleToCloudinary,
  download: downloadCloudinaryFile,
  isConfigured,
};
