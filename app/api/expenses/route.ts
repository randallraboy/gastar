import { requireUser, handleApiError } from "@/lib/authz";
import { listExpenses, createExpense, getCategoryTotals } from "@/lib/expenses";
import { toExpenseDto } from "@/lib/api-types";
import type { BudgetCategory } from "@/lib/budget-categories";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const category =
      categoryParam && BUDGET_CATEGORIES.includes(categoryParam as BudgetCategory)
        ? (categoryParam as BudgetCategory)
        : undefined;

    const filters = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      category,
      status: (searchParams.get("status") as "draft" | "confirmed") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    };

    const [result, categoryTotals] = await Promise.all([
      listExpenses(filters),
      getCategoryTotals(filters),
    ]);

    return Response.json({
      items: result.items.map(toExpenseDto),
      total: result.total,
      sumCents: result.sumCents,
      categoryTotals,
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
    return handleApiError(err);
  }
}
