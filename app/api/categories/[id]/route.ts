import { requireUser, handleApiError } from "@/lib/authz";
import {
  updateSubcategory,
  deleteCategoryBranch,
  loadCategoryFlat,
} from "@/lib/categories";
import { categoryUpdateSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = categoryUpdateSchema.parse(body);
    const updated = await updateSubcategory(id, parsed);
    const flat = await loadCategoryFlat();
    const node = flat.find((c) => c.id === updated.id);
    return Response.json(node ?? updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireUser();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const reassignTo = searchParams.get("reassignTo") ?? undefined;
    await deleteCategoryBranch(id, reassignTo);
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
