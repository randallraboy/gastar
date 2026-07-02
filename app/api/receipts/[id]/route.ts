import { requireUser, handleApiError } from "@/lib/authz";
import { deleteReceipt } from "@/lib/receipts";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const result = await deleteReceipt(id);

    if (result === "not_found") {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found" } },
        { status: 404 },
      );
    }

    if (result === "invalid_status") {
      return Response.json(
        {
          error: {
            code: "INVALID_STATUS",
            message:
              "Only pending or unreadable receipts can be discarded — this one already has a draft expense",
          },
        },
        { status: 409 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
