import { head } from "@vercel/blob";
import { requireUserOrHarness, handleApiError } from "@/lib/authz";
import { getReceiptById } from "@/lib/receipts";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireUserOrHarness(request);
    const { id } = await params;
    const receipt = await getReceiptById(id);

    if (!receipt) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found" } },
        { status: 404 },
      );
    }

    const meta = await head(receipt.blobKey);
    const imageResponse = await fetch(meta.url);
    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

    return new Response(imageResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
