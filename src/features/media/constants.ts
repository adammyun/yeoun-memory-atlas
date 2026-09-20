export const MAX_MEMORY_IMAGES = 5;
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');
