import { supabase } from './supabase';

type ImageAsset = {
  uri: string;
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

function blobFromUri(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => {
      resolve(request.response as Blob);
    };
    request.onerror = () => {
      reject(new Error('Could not read the selected image.'));
    };
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send(null);
  });
}

function bytesFromBase64(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const outputLength = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(outputLength);

  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (const char of clean) {
    if (char === '=') break;
    const value = chars.indexOf(char);
    if (value < 0) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes;
}

export async function uploadProfilePhoto(userId: string, asset: ImageAsset): Promise<string> {
  const fileExtension =
    asset.fileName?.split('.').pop()?.toLowerCase()
    ?? asset.mimeType?.split('/').pop()?.toLowerCase()
    ?? 'jpg';
  const contentType = asset.mimeType ?? 'image/jpeg';
  const filePath = `${userId}/${Date.now()}.${fileExtension}`;
  const fileBody = asset.base64
    ? bytesFromBase64(asset.base64)
    : await blobFromUri(asset.uri);
  const fileSize = 'size' in fileBody ? fileBody.size : fileBody.byteLength;

  if (!fileSize) {
    throw new Error('Selected image was empty. Choose a different photo and try again.');
  }

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(filePath, fileBody, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function deleteProfilePhotos(userId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from('profile-photos')
    .list(userId);

  if (listError) {
    const message = listError.message.toLowerCase();
    if (message.includes('not found') || message.includes('does not exist')) {
      return;
    }
    throw listError;
  }

  const paths = (files ?? [])
    .filter(file => file.name && file.id !== null)
    .map(file => `${userId}/${file.name}`);

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage.from('profile-photos').remove(paths);
  if (removeError) {
    throw removeError;
  }
}
