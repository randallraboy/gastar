import { requireUser, requireHarness, handleApiError } from "@/lib/authz";
import { createPendingReceipt, listReceiptsByStatus } from "@/lib/receipts";
import { toPendingReceiptDto } from "@/lib/api-types";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");

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

    try {
      const receipt = await createPendingReceipt(user, file);
      return Response.json(toPendingReceiptDto(receipt), { status: 201 });
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
