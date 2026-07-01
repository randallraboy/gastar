import { head } from "@vercel/blob";
import { requireUser, handleApiError } from "@/lib/authz";
import { getExpenseById } from "@/lib/expenses";

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

    const meta = await head(expense.receiptBlobKey);
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
