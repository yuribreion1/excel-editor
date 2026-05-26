# Data Model: Editable Spreadsheet with Save

## Entities

### ParsedWorkbook

Represents an opened `.xlsx` file together with its in-memory SheetJS
`WorkBook` object and all derived metadata.

| Field | Type | Description |
|-------|------|-------------|
| `uri` | `string` | VS Code URI of the source file (stringified) |
| `fileName` | `string` | Basename of the file (e.g., `budget.xlsx`) |
| `workbook` | `XLSX.WorkBook` | Live SheetJS workbook object held in memory |
| `sheets` | `WorksheetSummary[]` | Visible sheets with editability metadata |
| `activeSheetId` | `string` | ID (name) of the initially active sheet |
| `warnings` | `string[]` | Non-fatal informational messages (e.g., hidden sheets) |
| `editability` | `WorkbookSaveAssessment` | Workbook-level edit/save assessment |

**Change from this feature**: After removing the style blocker,
`editability.editable` will be `true` for standard `.xlsx` files (no VBA, no
unsupported sheet types). Previously, style-rich workbooks had `editable: false`.

---

### WorkbookSaveAssessment

Captures whether the workbook as a whole can be edited and saved.

| Field | Type | Description |
|-------|------|-------------|
| `editable` | `boolean` | `true` if the workbook may be edited and saved |
| `blockedFeatures` | `string[]` | List of reasons the workbook is blocked (empty when editable) |
| `warnings` | `string[]` | Non-blocking observations |
| `readOnlyReason` | `string \| undefined` | Human-readable summary of the first blocker |
| `saveTargetFormat` | `'xlsx'` | Always `'xlsx'` in this release |

**Blockers remaining after this feature** (style blocker removed):

| Condition | `readOnlyReason` |
|-----------|-----------------|
| `workbook.vbaraw` present | "Macro-enabled workbooks remain read-only in this release." |
| Any sheet has non-null `!type` | "Worksheet \"{name}\" uses the unsupported \"{type}\" sheet type." |

---

### WorksheetEditAssessment

Captures whether a specific worksheet can be edited.

| Field | Type | Description |
|-------|------|-------------|
| `editable` | `boolean` | `true` if the sheet is editable |
| `warnings` | `string[]` | Non-blocking observations |
| `readOnlyReason` | `string \| undefined` | Why the sheet is not editable |

**Blockers**:

| Condition | `readOnlyReason` |
|-----------|-----------------|
| Workbook is not editable | Propagated from `WorkbookSaveAssessment.readOnlyReason` |
| Sheet not found | "Worksheet \"{id}\" was not found in the workbook." |
| `sheet['!type']` set | "Worksheet \"{id}\" uses the unsupported \"{type}\" sheet type." |
| `sheet['!protect']` set | "Worksheet \"{id}\" is protected and cannot be edited in this release." |

---

### CellEditAssessment

Captures whether a specific cell may be edited by the user.

| Field | Type | Description |
|-------|------|-------------|
| `editable` | `boolean` | `true` if the user may change this cell's value |
| `rawValueType` | `CellRawValueType` | The current value category (text, number, formula, …) |
| `isMergedAnchor` | `boolean` | Cell is the top-left anchor of a merge range |
| `isInsideMergedRange` | `boolean` | Cell is inside (but not the anchor of) a merge range |
| `isHiddenByStructure` | `boolean` | Cell belongs to a hidden row or column |
| `readOnlyReason` | `string \| undefined` | Why this cell is not editable |

**Cell-level blockers** (unchanged by this feature):

| Condition | `readOnlyReason` |
|-----------|-----------------|
| Worksheet not editable | Propagated from `WorksheetEditAssessment` |
| `rawValueType === 'formula'` | "Formula cells remain read-only in this release." |
| `rawValueType === 'error'` | "Cells with spreadsheet errors remain read-only in this release." |
| `isInsideMergedRange && !isMergedAnchor` | "Merged cells remain read-only in this release." |
| `isHiddenByStructure` | "Hidden rows and columns remain read-only in this release." |

---

### CellEditOperation

Represents a single user-initiated change to one cell's value.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique operation ID (`sheetId:address:timestamp:random`) |
| `sheetId` | `string` | Sheet name |
| `address` | `string` | Cell address (e.g., `B3`) |
| `previousCellSnapshot` | `CellSnapshot` | State before the edit |
| `nextCellSnapshot` | `CellSnapshot` | State after the edit |
| `status` | `CellEditStatus` | `pending` → `saved` or `undone` / `discarded` |
| `label` | `string` | Human-readable label (e.g., `Edit B3`) |
| `committedAt` | `number` | Unix timestamp (ms) |

---

### CellSnapshot

Immutable capture of a cell's value at a point in time.

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | Cell address |
| `cell` | `XLSX.CellObject \| undefined` | Full SheetJS cell object (cloned) |
| `displayValue` | `string` | Value as shown in the table |
| `editValue` | `string` | Value presented in the edit input |
| `rawValueType` | `CellRawValueType` | Category of the value |

---

## State Transitions

### Document edit state

```
                 ┌──────────────────────────────────┐
                 │                                  │
  [Open file] ──► editable / clean                  │
                 │  readOnly = false                 │
                 │  isDirty  = false                 │
                 │                                  │
                 ▼                                  │
           [User edits cell]                        │
                 │                                  │
                 ▼                                  │
           editable / dirty ─── [Save] ─────────────┘
                 │  isDirty = true
                 │
                 ▼
           [Close with dirty]
                 │
                 ▼
           [Prompt: Save / Discard / Cancel]
```

### Cell edit lifecycle

```
  [User types in cell]
         │
         ▼
  CellEditOperation { status: 'pending' }
         │
    ┌────┴─────┐
    │          │
  [Save]    [Undo]
    │          │
    ▼          ▼
 'saved'    'undone'
                │
              [Redo]
                │
                ▼
            'pending'
```

---

## CellRawValueType enum

| Value | Meaning |
|-------|---------|
| `text` | String value |
| `number` | Numeric value |
| `boolean` | `true` / `false` |
| `date` | Date object |
| `blank` | Empty cell |
| `formula` | Cell contains a formula (not editable) |
| `error` | Cell contains a spreadsheet error (not editable) |
| `unknown` | Unrecognised SheetJS cell type |
