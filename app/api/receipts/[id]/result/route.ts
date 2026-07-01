import { requireHarness, handleApiError } from "@/lib/authz";
import { getReceiptById, markUnreadable } from "@/lib/receipts";
import { createDraftFromHarness } from "@/lib/expenses";
import { harnessResultSchema } from "@/lib/validation";
import { toExpenseDto, toPendingReceiptDto } from "@/lib/api-types";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    requireHarness(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = harnessResultSchema.parse(body);

    const receipt = await getReceiptById(id);
    if (!receipt) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found" } },
        { status: 404 },
      );
    }

    if (receipt.status !== "pending") {
      return Response.json(
        {
          error: { code: "NOT_PENDING", message: "Receipt has already been processed" },
        },
        { status: 409 },
      );
    }

    if (parsed.outcome === "unreadable") {
      const updated = await markUnreadable(id, parsed.errorNote);
      return Response.json(toPendingReceiptDto(updated!));
    }

    const db = getDb();
    const [uploader] = await db
      .select()
      .from(users)
      .where(eq(users.id, receipt.uploadedBy))
      .limit(1);

    if (!uploader) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Uploader not found" } },
        { status: 404 },
      );
    }

    const draft = await createDraftFromHarness(
      uploader,
      id,
      {
        amountCents: parsed.amountCents,
        expenseDate: parsed.expenseDate,
        merchant: parsed.merchant,
        categoryHint: parsed.categoryHint,
      },
      receipt.blobKey,
    );

    return Response.json({ draftExpense: toExpenseDto(draft) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid harness result payload",
          },
        },
        { status: 400 },
      );
    }
    return handleApiError(err);
  }
}
