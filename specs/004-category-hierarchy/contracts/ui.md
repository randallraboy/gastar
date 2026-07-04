# UI Contract: Category Hierarchy (004)

**Date**: 2026-07-03 | **API**: [api.md](./api.md) | **Mobile baseline**: [002-mobile-receipt-capture/contracts/ui.md](../../002-mobile-receipt-capture/contracts/ui.md)

## Surfaces

| Route | Purpose |
|-------|---------|
| `/expenses` | Hierarchical filter, path display, bucket drill-down totals |
| `/categories` | Subcategory CRUD (restore nav link on desktop + bottom tab) |
| Expense form / draft confirm sheet | `CategoryPicker` drill-down |

## CategoryPicker (expense forms)

**States**: `loading` | `idle` | `error`

**Layout**:
- Breadcrumb row: `Needs` › `Food` › *(current level)* — each segment tappable to go up.
- List of children at current level: name + chevron if has children.
- Row tap with children → navigate into level (do not select yet).
- Row tap on leaf → select and close.
- Row with children: secondary action **"Select [name]"** (or long-press) assigns intermediate node (FR-003, assumption: mid-level assignment allowed).
- Initial level when opening: three buckets only.

**Constraints**:
- Max four levels reachable (FR-013).
- Tap targets ≥ `--tap-min` (44px).
- Selected value shows full path: `Needs → Food → Groceries` (FR-004).

**Props**:

```ts
type CategoryPickerProps = {
  value: string | null;          // categoryId
  onChange: (id: string, path: string[]) => void;
  disabled?: boolean;
};
```

Data: fetch `GET /api/categories?format=tree` once; cache in component or SWR.

## Expenses page updates

**Category display** (list + cards): show `categoryPath.join(' → ')`; if `categoryWasAuto && !subcategoryResolved`, show subtle badge **"Bucket only"** (FR-011, US4).

**Filter**: replace bucket `<select>` with tree-aware control:
- Top row: bucket quick filters (Needs / Wants / Savings / All).
- Optional: subcategory picker (same drill-down, sets `categoryId` query param).

**Summary section**:
- Primary: three bucket totals (50/30/20 view unchanged).
- Expandable per bucket: nested `CategoryTotal` tree (tap bucket to reveal mid-tier + leaf breakdown) (US2).

## Categories management page (`/categories`)

**Layout**: one column per bucket (desktop) or accordion by bucket (mobile).

**Per bucket**:
- Bucket header read-only (Needs / Wants / Savings).
- Expandable tree of subcategories (indented by depth).
- Actions per subcategory row: Rename, Edit keywords, Delete.
- **Add subcategory** button on each node that is not at depth 4.

**Add / Rename**: inline or small modal; name required, max 80 chars.

**Keywords**: comma-separated or tag input on leaf/mid nodes; saved via PATCH.

**Delete flow**:
1. If branch has no expenses → confirm → cascade delete (US3).
2. If branch has expenses → modal: pick reassignment target (tree picker excluding deleted branch) → confirm delete.

**Out of scope**: drag-to-reparent; no move-between-parents UI.

## Navigation

Restore **Categories** link:
- Desktop header nav: Expenses · Receipts · **Categories**
- Bottom tab bar (optional fourth tab) or entry under Expenses overflow — prefer fourth tab if space allows per 002 pattern.

## Visual tokens

Reuse existing design tokens from `app/globals.css` — no new palette. Tree indent: `--space-2` per depth level.

## Accessibility

- Breadcrumb `nav` with `aria-label="Category path"`.
- Expand/collapse tree uses `aria-expanded` on management page.
- CategoryPicker list: `role="listbox"` / `option` pattern or native radio group per level.

## Manual test checkpoints

See [quickstart.md](../quickstart.md) scenarios 1–6.
