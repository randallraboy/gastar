import { put, del, get } from "@vercel/blob";

const STAGING_PREFIX = "receipts/staging/";

export async function uploadStagingBlob(
  filename: string,
  data: Buffer | Blob,
  contentType: string,
): Promise<string> {
  const blob = await put(`${STAGING_PREFIX}${filename}`, data, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });
  return blob.pathname;
}

export async function deleteBlob(key: string): Promise<void> {
  await del(key);
}

export type BlobContent = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
};

export async function getBlobContent(key: string): Promise<BlobContent | null> {
  const result = await get(key, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return {
    stream: result.stream,
    contentType: result.blob.contentType,
  };
}

export function receiptImagePath(receiptId: string): string {
  return `/api/receipts/${receiptId}/image`;
}
