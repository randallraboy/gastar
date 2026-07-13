import { z } from "zod";
import { requireUser, requireHarness, handleApiError } from "@/lib/authz";
import { createPendingReceipt, listReceiptsByStatus } from "@/lib/receipts";
import { toPendingReceiptDto } from "@/lib/api-types";
import { receiptNoteSchema } from "@/lib/validation";

const clientKeySchema = z.string().uuid();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const clientKeyRaw = formData.get("clientKey");
    const noteRaw = formData.get("note");

    if (!(file instanceof File)) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A receipt image file is required",
          },
        },
        { status: 400 },
      );
    }

    let clientKey: string | undefined;
    if (clientKeyRaw != null && clientKeyRaw !== "") {
      if (typeof clientKeyRaw !== "string") {
        return Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "clientKey must be a valid UUID",
            },
          },
          { status: 400 },
        );
      }
      const parsed = clientKeySchema.safeParse(clientKeyRaw);
      if (!parsed.success) {
        return Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "clientKey must be a valid UUID",
            },
          },
          { status: 400 },
        );
      }
      clientKey = parsed.data;
    }

    let note: string | null = null;
    if (noteRaw != null && noteRaw !== "") {
      if (typeof noteRaw !== "string") {
        return Response.json(
          {
            error: { code: "VALIDATION_ERROR", message: "Note must be text" },
          },
          { status: 400 },
        );
      }
      const parsedNote = receiptNoteSchema.safeParse(noteRaw);
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
      note = parsedNote.data && parsedNote.data.length > 0 ? parsedNote.data : null;
    }

    try {
      const { receipt, created } = await createPendingReceipt(
        user,
        file,
        clientKey,
        note,
      );
      return Response.json(toPendingReceiptDto(receipt), {
        status: created ? 201 : 200,
      });
    } catch (err) {
      if (err instanceof Error) {
        return Response.json(
          { error: { code: "VALIDATION_ERROR", message: err.message } },
          { status: 400 },
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      requireHarness(request);
    } else {
      await requireUser();
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "pending") as
      "pending" | "processed" | "unreadable" | "converted";

    const receipts = await listReceiptsByStatus(status);
    return Response.json(receipts.map(toPendingReceiptDto));
  } catch (err) {
    return handleApiError(err);
  }
}
