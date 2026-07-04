import { requireUser, handleApiError } from "@/lib/authz";
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
  getCategoryIndex,
} from "@/lib/expenses";
import { toExpenseDto } from "@/lib/api-types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json();
    const updated = await updateExpense(id, body);

    if (!updated) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 },
      );
    }

    return Response.json(toExpenseDto(updated, await getCategoryIndex()));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const deleted = await deleteExpense(id);

    if (!deleted) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const expense = await getExpenseById(id);

    if (!expense) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 },
      );
    }

    return Response.json(toExpenseDto(expense, await getCategoryIndex()));
  } catch (err) {
    return handleApiError(err);
  }
}
