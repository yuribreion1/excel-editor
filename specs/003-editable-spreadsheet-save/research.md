# Research: Editable Spreadsheet with Save

## R-001 — Style blocker origin and correctness

**Question**: Why does `getWorkbookStyleBlocker` in `workbookRiskScanner.ts`
block editing, and is the concern still valid?

**Finding**: The function inspects `workbook.Styles?.CellXf`. If the style
table contains more than one entry (practically all real `.xlsx` files have at
least a default style plus one custom style), the workbook is flagged as
read-only with the message:

> "Style-rich workbooks remain read-only in this release to avoid lossy saves."

**Rationale for removal**: `serializeWorkbook()` in `workbookSerializer.ts`
already passes `cellStyles: true` to `XLSX.write()`:

```ts
const buffer = XLSX.write(workbook, {
  type: 'buffer',
  bookType: 'xlsx',
  cellStyles: true   // ← preserves cell style data on round-trip
}) as Buffer;
```

The round-trip risk of lossy style saving is addressed by this flag. The blocker
was added as a conservative guard before `cellStyles: true` was confirmed to be
sufficient. Removing it is safe.

**Decision**: Remove `getWorkbookStyleBlocker` function and its call site in
`assessWorkbookEditability`.

**Alternatives considered**: Keeping the blocker and adding a user-facing
"Enable editing" button. Rejected — contradicts FR-001 (files must open
editable by default) and SC-001 (editing requires no extra steps).

---

## R-002 — Round-trip style fidelity with SheetJS 0.20.3

**Question**: Does SheetJS 0.20.3 faithfully preserve `CellXf` style data when
reading with `cellStyles: true` and writing with `cellStyles: true`?

**Finding**: SheetJS 0.20.3 (commercial distribution) retains `Styles.CellXf`,
`Styles.Fonts`, `Styles.Fills`, and `Styles.Borders` in the in-memory
`WorkBook` object when `cellStyles: true` is passed to `XLSX.read()`. Those
same objects are emitted back into the ZIP on `XLSX.write()` when
`cellStyles: true` is set on the write options. Cell references to style
indices (`s` field on `CellObject`) are preserved. This is the basis on which
SheetJS recommends the `cellStyles` round-trip pattern for editor tools.

**Decision**: No changes needed to `serializeWorkbook`. The existing options
are correct.

**Alternatives considered**: Switching to a different serialization library.
Rejected — out of scope and introduces new risk.

---

## R-003 — Remaining workbook-level blockers after style guard removal

**Question**: What guards remain after removing the style blocker, and are they
still appropriate?

**Finding (kept intentionally)**:

| Blocker | Location | Reason kept |
|---------|----------|-------------|
| VBA macro workbooks (`vbaraw` present) | `assessWorkbookEditability` | SheetJS does not round-trip VBA reliably; macro loss would corrupt workbook behaviour |
| Non-standard sheet types (`sheet['!type']` set) | `assessWorkbookEditability` + `assessWorksheetEditability` | Chart sheets and dialog sheets cannot be represented as cell grids |
| Worksheet protection (`sheet['!protect']` present) | `assessWorksheetEditability` | Respects file-level protection semantics |

**Cell-level guards (kept, not affected by this change)**:

| Guard | Reason kept |
|-------|-------------|
| Formula cells | Formula recalculation is out of scope; editing would corrupt `=SUM(...)` expressions |
| Error cells | Overwriting `#REF!`/`#VALUE!` silently changes semantics |
| Merged-range non-anchor cells | Only the anchor cell can logically hold a value |
| Hidden rows/columns | Editing hidden cells creates unexpected state |

**Decision**: All existing non-style guards remain in place unchanged.

---

## R-004 — Impact on `xlsxViewerApp.ts` UI branches

**Question**: Do any webview UI branches need updating after the style blocker
is removed?

**Finding**: The `state.readOnly` flag in `xlsxViewerApp.ts` is derived from
`ViewerState.readOnly`, which is set to `!parsedWorkbook.editability.editable`
in `XlsxCustomDocument.getViewerState()`. Once the style blocker is removed,
`editability.editable` will be `true` for standard `.xlsx` files, so
`state.readOnly` will be `false`. All existing UI branches that key on
`state.readOnly` are correct — they handle the remaining genuine read-only cases
(VBA workbooks, unsupported sheet types) without change.

**Decision**: No changes to `xlsxViewerApp.ts`.

---

## R-005 — Test fixture requirements

**Question**: What test fixtures are needed to guard this change against regression?

**Finding**: No fixture currently exists for a style-rich `.xlsx` file. The
following fixtures are needed:

| Fixture | Purpose |
|---------|---------|
| `tests/fixtures/style-rich.xlsx` | An `.xlsx` file with multiple `CellXf` entries (i.e., cells with varied formatting). Used to assert that `assessWorkbookEditability` returns `editable: true` after the change. |
| `tests/fixtures/macro-enabled.xlsm` (or `.xlsx` with `vbaraw`) | Confirm VBA workbooks remain blocked (regression guard). |

The style-rich fixture can be generated programmatically using SheetJS in a
test setup helper, or committed as a binary artefact. Either approach is
acceptable; generating programmatically avoids binary blobs in the repository.

**Decision**: Generate `style-rich.xlsx` programmatically in test helpers using
SheetJS `cellStyles: true` write options to inject a multi-entry `CellXf` table.
