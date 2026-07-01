import { put, del } from "@vercel/blob";

const STAGING_PREFIX = "receipts/staging/";

export async function uploadStagingBlob(
  filename: string,
  data: Buffer | Blob,
  contentType: string,
): Promise<string> {
  const blob = await put(`${STAGING_PREFIX}${filename}`, data, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.pathname;
}

export async function deleteBlob(key: string): Promise<void> {
  await del(key);
}

export function receiptImagePath(receiptId: string): string {
  return `/api/receipts/${receiptId}/image`;
}
