import { requireUser, handleApiError } from "@/lib/authz";
import {
  listExpenses,
  createExpense,
  getCategoryTotals,
  getCategoryIndex,
} from "@/lib/expenses";
import { toExpenseDto } from "@/lib/api-types";
import type { BudgetCategory } from "@/lib/budget-categories";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const bucketParam = searchParams.get("bucket");
    const bucket =
      bucketParam && BUDGET_CATEGORIES.includes(bucketParam as BudgetCategory)
        ? (bucketParam as BudgetCategory)
        : undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;

    const filters = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      categoryId,
      bucket,
      status: (searchParams.get("status") as "draft" | "confirmed") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    };

    const [result, categoryTotals, byId] = await Promise.all([
      listExpenses(filters),
      getCategoryTotals(filters),
      getCategoryIndex(),
    ]);

    return Response.json({
      items: result.items.map((e) => toExpenseDto(e, byId)),
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
      const byId = await getCategoryIndex();
      return Response.json(
        {
          error: {
            code: "DUPLICATE",
            message:
              "An expense with the same date, amount, and merchant already exists",
          },
          duplicateOf: toExpenseDto(result.duplicate, byId),
        },
        { status: 409 },
      );
    }

    const byId = await getCategoryIndex();
    return Response.json(toExpenseDto(result.expense!, byId), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
