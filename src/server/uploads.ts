import { MAX_IMAGE_FILE_SIZE, MAX_MEMORY_IMAGES } from '@/src/features/media/constants';
import { objectBucket, type StoredUpload } from './memory-store';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function readMemoryForm(form: FormData) {
  const memory = form.get('memory');
  if (typeof memory !== 'string') throw new Error('기억 내용을 확인해 주세요.');
  const images = form.getAll('images').filter((value): value is File => value instanceof File);
  if (images.length > MAX_MEMORY_IMAGES) throw new Error(`사진은 최대 ${MAX_MEMORY_IMAGES}장까지 첨부할 수 있어요.`);
  const remove = form.get('removeMediaIds');
  let removeMediaIds: string[] = [];
  if (typeof remove === 'string') {
    const parsed = JSON.parse(remove) as unknown;
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) throw new Error('삭제할 사진 정보를 확인해 주세요.');
    removeMediaIds = parsed;
  }
  return { memory: JSON.parse(memory) as unknown, images, removeMediaIds };
}

export async function storeImages(images: File[], ownerId: string): Promise<StoredUpload[]> {
  const uploaded: StoredUpload[] = [];
  try {
    for (const image of images) {
      if (!allowedTypes.has(image.type)) throw new Error('JPG, PNG, WEBP 사진만 첨부할 수 있어요.');
      if (image.size > MAX_IMAGE_FILE_SIZE) throw new Error('사진 한 장은 5MB보다 작아야 해요.');
      const id = crypto.randomUUID();
      const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
      const storageKey = `memories/${ownerId}/${id}.${extension}`;
      await objectBucket().put(storageKey, await image.arrayBuffer(), {
        httpMetadata: { contentType: image.type },
        customMetadata: { ownerId },
      });
      uploaded.push({ id, storageKey, mimeType: image.type, size: image.size });
    }
    return uploaded;
  } catch (error) {
    await Promise.all(uploaded.map((item) => objectBucket().delete(item.storageKey)));
    throw error;
  }
}

export async function removeStoredImages(images: StoredUpload[]) {
  await Promise.all(images.map((item) => objectBucket().delete(item.storageKey)));
}
