import { requireUser, handleApiError } from "@/lib/authz";
import { listCategories, createCategory } from "@/lib/categories";
import { toCategoryDto } from "@/lib/api-types";

export async function GET() {
  try {
    await requireUser();
    const categories = await listCategories();
    return Response.json(categories.map(toCategoryDto));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const created = await createCategory(body);
    return Response.json(toCategoryDto(created), { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: err.message } },
        { status: 400 },
      );
    }
    return handleApiError(err);
  }
}
