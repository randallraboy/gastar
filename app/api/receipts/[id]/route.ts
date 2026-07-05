import { requireUser, handleApiError } from "@/lib/authz";
import { deleteReceipt, updateReceiptNote } from "@/lib/receipts";
import { receiptNoteSchema } from "@/lib/validation";
import { toPendingReceiptDto } from "@/lib/api-types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const parsedNote = receiptNoteSchema.safeParse(body?.note);
    if (!parsedNote.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsedNote.error.issues[0]?.message ?? "Invalid note",
          },
        },
        { status: 400 },
      );
    }

    const result = await updateReceiptNote(id, parsedNote.data ?? null);

    if (result.outcome === "not_found") {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found" } },
        { status: 404 },
      );
    }

    if (result.outcome === "invalid_status") {
      return Response.json(
        {
          error: {
            code: "NOT_PENDING",
            message: "Only pending receipts can be edited",
          },
        },
        { status: 409 },
      );
    }

    return Response.json(toPendingReceiptDto(result.receipt));
  } catch (err) {
    return handleApiError(err);
  }
}

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
