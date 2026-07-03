import { z } from "zod";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const budgetCategorySchema = z.enum(BUDGET_CATEGORIES);

export const expenseCreateSchema = z.object({
  amountCents: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .int("Amount must be in whole cents")
    .positive("Amount must be greater than zero"),
  expenseDate: z
    .string()
    .regex(isoDateRegex, "Enter a valid date (YYYY-MM-DD)")
    .refine((d) => d <= new Date().toISOString().slice(0, 10), {
      message: "Expense date cannot be in the future",
    }),
  merchant: z
    .string()
    .trim()
    .min(1, "Merchant is required")
    .max(200, "Merchant must be 200 characters or fewer"),
  description: z.string().max(500).nullable().optional(),
  category: budgetCategorySchema.optional(),
  pendingReceiptId: z.string().uuid().optional(),
  overrideDuplicate: z.boolean().optional(),
});

export const expenseUpdateSchema = z.object({
  amountCents: z.number().int().positive("Amount must be greater than zero").optional(),
  expenseDate: z
    .string()
    .regex(isoDateRegex, "Enter a valid date (YYYY-MM-DD)")
    .refine((d) => d <= new Date().toISOString().slice(0, 10), {
      message: "Expense date cannot be in the future",
    })
    .optional(),
  merchant: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  category: budgetCategorySchema.optional(),
  overrideDuplicate: z.boolean().optional(),
});

export const harnessParsedResultSchema = z.object({
  outcome: z.literal("parsed"),
  amountCents: z.number().int().positive(),
  expenseDate: z.string().regex(isoDateRegex),
  merchant: z.string().trim().min(1).max(200),
  categoryHint: z.string().trim().optional(),
});

export const harnessUnreadableResultSchema = z.object({
  outcome: z.literal("unreadable"),
  errorNote: z.string().trim().min(1, "Error note is required for unreadable receipts"),
});

export const harnessResultSchema = z.discriminatedUnion("outcome", [
  harnessParsedResultSchema,
  harnessUnreadableResultSchema,
]);

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// Vercel serverless functions reject request bodies over ~4.5 MB, so the app-level
// limit must stay below that (with margin for multipart overhead) or in-limit uploads
// would fail at the platform edge with an opaque 413.
export const UPLOAD_LIMIT_MB = 4;
export const MAX_UPLOAD_BYTES = UPLOAD_LIMIT_MB * 1024 * 1024;
export const UPLOAD_LIMIT_MESSAGE = `Image must be ${UPLOAD_LIMIT_MB} MB or smaller`;

export function validateUploadFile(file: File): string | null {
  if (
    !ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])
  ) {
    return "Image must be JPEG, PNG, WebP, or HEIC format";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return UPLOAD_LIMIT_MESSAGE;
  }
  return null;
}
