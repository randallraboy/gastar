import { requireUser, handleApiError } from "@/lib/authz";
import { updateCategory, deleteCategory } from "@/lib/categories";
import { toCategoryDto } from "@/lib/api-types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await request.json();

    try {
      const updated = await updateCategory(id, body);
      if (!updated) {
        return Response.json(
          { error: { code: "NOT_FOUND", message: "Category not found" } },
          { status: 404 },
        );
      }
      return Response.json(toCategoryDto(updated));
    } catch (err) {
      if (err instanceof Error && err.message.includes("System")) {
        return Response.json(
          { error: { code: "SYSTEM_CATEGORY", message: err.message } },
          { status: 400 },
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireUser();
    const { id } = await params;

    try {
      const deleted = await deleteCategory(id);
      if (!deleted) {
        return Response.json(
          { error: { code: "NOT_FOUND", message: "Category not found" } },
          { status: 404 },
        );
      }
      return new Response(null, { status: 204 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("System")) {
        return Response.json(
          { error: { code: "SYSTEM_CATEGORY", message: err.message } },
          { status: 400 },
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
