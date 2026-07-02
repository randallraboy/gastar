import { requireUserOrHarness, handleApiError } from "@/lib/authz";
import { getReceiptById } from "@/lib/receipts";
import { getBlobContent } from "@/lib/blob";

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

    const content = await getBlobContent(receipt.blobKey);
    if (!content) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt image not found" } },
        { status: 404 },
      );
    }

    return new Response(content.stream, {
      headers: {
        "Content-Type": content.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
