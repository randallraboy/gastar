import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, expenses, merchantCorrections } from "@/lib/db/schema";
import type { Category } from "@/lib/db/schema";
import { categoryInputSchema, categoryUpdateSchema } from "@/lib/validation";
import { getUncategorizedId } from "@/lib/categorize";
import { z } from "zod";

export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(input: z.infer<typeof categoryInputSchema>) {
  const parsed = categoryInputSchema.parse(input);
  const db = getDb();
  const [created] = await db
    .insert(categories)
    .values({
      name: parsed.name,
      keywords: parsed.keywords ?? [],
    })
    .returning();
  return created;
}

export async function updateCategory(
  id: string,
  input: z.infer<typeof categoryUpdateSchema>,
) {
  const parsed = categoryUpdateSchema.parse(input);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) return null;
  if (existing.isSystem) {
    throw new Error("System categories cannot be modified");
  }

  const [updated] = await db
    .update(categories)
    .set({
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.keywords !== undefined ? { keywords: parsed.keywords } : {}),
    })
    .where(eq(categories.id, id))
    .returning();

  return updated;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) return false;
  if (existing.isSystem) {
    throw new Error("System categories cannot be deleted");
  }

  const uncategorizedId = await getUncategorizedId(await listCategories());

  await db.transaction(async (tx) => {
    await tx
      .update(expenses)
      .set({ categoryId: uncategorizedId })
      .where(eq(expenses.categoryId, id));
    await tx
      .update(merchantCorrections)
      .set({ categoryId: uncategorizedId })
      .where(eq(merchantCorrections.categoryId, id));
    await tx.delete(categories).where(eq(categories.id, id));
  });

  return true;
}
