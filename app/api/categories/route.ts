import { requireUser, handleApiError } from "@/lib/authz";
import {
  listCategoriesFlat,
  listCategoriesTree,
  createSubcategory,
} from "@/lib/categories";
import { categoryCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "tree";

    if (format === "flat") {
      const flat = await listCategoriesFlat();
      return Response.json(flat);
    }

    const tree = await listCategoriesTree();
    return Response.json(tree);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const parsed = categoryCreateSchema.parse(body);
    const created = await createSubcategory(parsed);
    return Response.json(
      {
        id: created.id,
        parentId: created.parentId,
        name: created.name,
        bucket: created.bucket,
        isBucket: created.isBucket,
        displayOrder: created.displayOrder,
        keywords: created.keywords ?? [],
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
