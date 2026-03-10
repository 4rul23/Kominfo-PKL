export const MAX_ATTACHMENT_COUNT = 3;
export const MAX_ATTACHMENT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_SURAT_REQUEST_BYTES = 12 * 1024 * 1024;

export const ATTACHMENT_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

export const ATTACHMENT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
  ".vbs",
  ".js",
  ".jse",
  ".msi",
  ".scr",
  ".com",
  ".jar",
  ".sh",
  ".php",
  ".py",
]);

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return "";
  return filename.slice(idx).toLowerCase();
}

export function isAllowedAttachmentExtension(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ATTACHMENT_ALLOWED_EXTENSIONS.includes(ext as (typeof ATTACHMENT_ALLOWED_EXTENSIONS)[number]);
}

export function isDangerousAttachmentExtension(filename: string): boolean {
  const ext = getFileExtension(filename);
  return DANGEROUS_EXTENSIONS.has(ext);
}

export function isAllowedAttachmentMime(mime: string): boolean {
  return ATTACHMENT_ALLOWED_MIME.includes(mime as (typeof ATTACHMENT_ALLOWED_MIME)[number]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
