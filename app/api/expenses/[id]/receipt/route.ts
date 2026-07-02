import { requireUser, handleApiError } from "@/lib/authz";
import { getExpenseById } from "@/lib/expenses";
import { getBlobContent } from "@/lib/blob";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const expense = await getExpenseById(id);

    if (!expense?.receiptBlobKey) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt image not found" } },
        { status: 404 },
      );
    }

    const content = await getBlobContent(expense.receiptBlobKey);
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
