import { requireUser, handleApiError } from "@/lib/authz";
import { listExpenses, createExpense } from "@/lib/expenses";
import { toExpenseDto } from "@/lib/api-types";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const result = await listExpenses({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      status: (searchParams.get("status") as "draft" | "confirmed") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });

    return Response.json({
      items: result.items.map(toExpenseDto),
      total: result.total,
      sumCents: result.sumCents,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const result = await createExpense(user, body);

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

    return Response.json(toExpenseDto(result.expense!), { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("valid")) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: err.message } },
        { status: 400 },
      );
    }
    return handleApiError(err);
  }
}
