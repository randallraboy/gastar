import { requireUser, handleApiError } from "@/lib/authz";
import { deleteReceipt } from "@/lib/receipts";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const deleted = await deleteReceipt(id);

    if (!deleted) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found" } },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
