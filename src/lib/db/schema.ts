import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  char,
  date,
  timestamp,
  check,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { BudgetCategory } from "@/lib/budget-categories";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    googleSub: text("google_sub").notNull().unique(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_google_sub_idx").on(table.googleSub)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    bucket: text("bucket").$type<BudgetCategory>().notNull(),
    isBucket: boolean("is_bucket").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "categories_bucket_check",
      sql`${table.bucket} IN ('Needs', 'Wants', 'Savings')`,
    ),
    check("categories_name_nonempty", sql`length(trim(${table.name})) > 0`),
    index("categories_parent_order_idx").on(table.parentId, table.displayOrder),
    index("categories_bucket_idx").on(table.bucket),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CAD"),
    expenseDate: date("expense_date").notNull(),
    merchant: text("merchant").notNull(),
    merchantNormalized: text("merchant_normalized").notNull(),
    description: text("description"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("confirmed"),
    source: text("source").notNull(),
    receiptBlobKey: text("receipt_blob_key"),
    categoryWasAuto: boolean("category_was_auto").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("expenses_amount_positive", sql`${table.amountCents} > 0`),
    check("expenses_date_not_future", sql`${table.expenseDate} <= CURRENT_DATE`),
    check("expenses_status_check", sql`${table.status} IN ('draft', 'confirmed')`),
    check("expenses_source_check", sql`${table.source} IN ('manual', 'photo')`),
    check("expenses_merchant_nonempty", sql`length(trim(${table.merchant})) > 0`),
    index("expenses_expense_date_idx").on(table.expenseDate),
    index("expenses_category_id_idx").on(table.categoryId),
    index("expenses_status_idx").on(table.status),
    index("expenses_duplicate_idx").on(
      table.expenseDate,
      table.amountCents,
      table.merchantNormalized,
    ),
  ],
);

export const pendingReceipts = pgTable(
  "pending_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blobKey: text("blob_key").notNull(),
    status: text("status").notNull().default("pending"),
    errorNote: text("error_note"),
    draftExpenseId: uuid("draft_expense_id").references(() => expenses.id),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    clientKey: uuid("client_key"),
  },
  (table) => [
    check(
      "pending_receipts_status_check",
      sql`${table.status} IN ('pending', 'processed', 'unreadable', 'converted')`,
    ),
    uniqueIndex("pending_receipts_client_key_idx").on(table.clientKey),
  ],
);

export const merchantCorrections = pgTable(
  "merchant_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantNormalized: text("merchant_normalized").notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("merchant_corrections_merchant_idx").on(table.merchantNormalized),
  ],
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type PendingReceipt = typeof pendingReceipts.$inferSelect;
export type MerchantCorrection = typeof merchantCorrections.$inferSelect;
