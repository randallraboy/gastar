import { requireUser, handleApiError } from "@/lib/authz";
import { confirmExpense } from "@/lib/expenses";
import { toExpenseDto } from "@/lib/api-types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await confirmExpense(id, user, body);

    if ("error" in result && result.error === "NOT_DRAFT") {
      return Response.json(
        {
          error: { code: "NOT_DRAFT", message: "Only draft expenses can be confirmed" },
        },
        { status: 400 },
      );
    }

    if ("duplicate" in result && result.duplicate) {
      return Response.json(
        {
          error: {
            code: "DUPLICATE",
            message:
              "An expense with the same date, amount, and merchant already exists",
          },
          duplicateOf: toExpenseDto(result.duplicate),
        },
        { status: 409 },
      );
    }

    return Response.json(toExpenseDto(result.expense!));
  } catch (err) {
    return handleApiError(err);
  }
}
