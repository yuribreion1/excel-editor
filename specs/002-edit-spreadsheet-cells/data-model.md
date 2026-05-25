# Data Model: Direct Spreadsheet Cell Editing

## Editable Spreadsheet Document

Represents one `.xlsx` file opened in the custom editor with editable workbook
state and save lifecycle metadata.

### Fields

- **uri**: Absolute VS Code URI for the opened workbook
- **fileName**: Display name shown in the custom editor tab
- **workbook**: In-memory SheetJS workbook object used for rendering and saving
- **visibleSheets**: Ordered visible worksheet summaries available in the UI
- **activeSheetId**: Currently selected worksheet identifier
- **loadState**: One of `loading`, `ready`, `unsupported`, or `error`
- **isDirty**: Whether unsaved edits exist
- **editability**: Workbook-level editability assessment with `editable`,
  `readOnlyReason`, `warnings`, and `blockedFeatures`
- **editHistory**: Ordered history of `CellEditOperation` entries retained for
  undo/redo and dirty-state calculation
- **historyCursor**: Zero-based pointer to the last applied edit in
  `editHistory`, allowing redo after undo
- **warnings**: Non-fatal open-time warnings inherited from workbook parsing

### Validation Rules

- `uri`, `fileName`, and `workbook` are required when `loadState` is `ready`.
- `activeSheetId` must be one of `visibleSheets[].id` when the workbook is ready.
- `isDirty` is `true` only when at least one applied edit has not been saved or
  reverted.
- `editability.editable` may be `true` only when there are no workbook-level
  blockers.

## Worksheet Session

Represents one visible worksheet as rendered and edited in the current editor
session.

### Fields

- **id**: Stable worksheet identifier
- **name**: User-facing sheet label
- **visibilityState**: `visible`, `hidden`, or `veryHidden`
- **isEditable**: Whether this worksheet may accept cell edits in the current
  workbook session
- **editBlockReason**: User-facing reason when the whole sheet is read-only
- **rowCount**: Number of rendered rows
- **columnCount**: Number of rendered columns
- **rowHeaders**: Ordered row labels shown in the table
- **columnHeaders**: Ordered column labels shown in the table
- **structureWarnings**: Messages for merged ranges, hidden structures, or other
  view simplifications
- **cellMatrix**: Two-dimensional array of `SpreadsheetCellState`

### Validation Rules

- `name` must be non-empty.
- `rowCount` and `columnCount` must be zero or positive.
- `cellMatrix` dimensions must match `rowCount` and `columnCount`.
- `editBlockReason` is required when `isEditable` is `false`.

## Spreadsheet Cell State

Represents one displayed cell in the table and the metadata needed to decide if
it can be edited safely.

### Fields

- **address**: A1-style worksheet address such as `B3`
- **rowIndex**: Zero-based row index in the rendered table
- **columnIndex**: Zero-based column index in the rendered table
- **displayValue**: Text currently shown in the grid
- **editValue**: Canonical string value used when opening the inline editor
- **rawValueType**: `text`, `number`, `boolean`, `date`, `blank`, `formula`,
  `error`, or `unknown`
- **isEditable**: Whether the user may commit an edit for this cell
- **editBlockReason**: User-facing reason when `isEditable` is `false`
- **isMergedAnchor**: Whether the cell is the anchor of a merged range
- **isInsideMergedRange**: Whether the cell belongs to any merged range
- **isHiddenByStructure**: Whether the source row or column is hidden
- **hasPendingEdit**: Whether the displayed value differs from the last saved
  workbook value

### Validation Rules

- `address` must be unique within one worksheet.
- `rowIndex` and `columnIndex` must be zero or positive.
- `editBlockReason` is required when `isEditable` is `false`.
- Cells with `rawValueType` of `formula` or `error` must have `isEditable =
  false` in this release.

## Cell Edit Operation

Represents one user-confirmed change to a single worksheet cell.

### Fields

- **id**: Stable edit identifier for tracking and tests
- **sheetId**: Worksheet containing the cell
- **address**: A1-style cell address
- **previousCellSnapshot**: Serialized value/type metadata before the edit
- **nextCellSnapshot**: Serialized value/type metadata after the edit
- **status**: `pending`, `saved`, `undone`, or `discarded`
- **label**: Undo/redo label surfaced to VS Code, for example `Edit B3`
- **committedAt**: Timestamp recorded when the edit is accepted from the webview

### Validation Rules

- `sheetId` and `address` must reference an existing cell position.
- `previousCellSnapshot` and `nextCellSnapshot` must include enough information
  to reapply or reverse the edit without re-reading the webview.
- `status = saved` is only valid after a successful document save.
- An edit may enter `undone` only when it remains in `editHistory` beyond the
  current `historyCursor`.

## Save Assessment

Represents the result of evaluating whether the workbook can be edited or saved
safely in this release.

### Fields

- **editable**: Whether the workbook may enter editable mode
- **blockedFeatures**: Detected workbook-level blockers such as macros, chart
  sheets, style-heavy content, or unsupported workbook shapes
- **warnings**: Non-blocking guidance shown to the user
- **readOnlyReason**: Primary user-facing reason editing is disabled
- **saveTargetFormat**: Expected output format, initially always `xlsx`

### Validation Rules

- `readOnlyReason` is required when `editable` is `false`.
- `blockedFeatures` must be empty when `editable` is `true`.
- `saveTargetFormat` must match the current document format.

## Relationships

- One **Editable Spreadsheet Document** owns one **Save Assessment**.
- One **Editable Spreadsheet Document** contains one or more **Worksheet
  Session** records.
- One **Worksheet Session** contains zero or more **Spreadsheet Cell State**
  records.
- One **Editable Spreadsheet Document** owns zero or more **Cell Edit
  Operation** records.
- Each **Cell Edit Operation** targets exactly one **Spreadsheet Cell State**
  within one worksheet.

## State Transitions

- **Open supported plain-data workbook**: `loading` -> `ready` with
  `editability.editable = true`
- **Open workbook with fidelity blocker**: `loading` -> `ready` with
  `editability.editable = false`
- **Open malformed or unsupported workbook**: `loading` -> `unsupported` or
  `error`
- **Commit cell edit**: `ready/clean` -> `ready/dirty`
- **Commit additional edit**: `ready/dirty` -> `ready/dirty`
- **Undo with redo available**: `historyCursor` moves backward while the
  document remains `dirty` or becomes `clean` if it reaches the last saved edit
- **Redo**: `historyCursor` moves forward and reapplies the next edit from
  `editHistory`
- **Revert document**: `ready/dirty` -> `ready/clean`
- **Successful save**: `ready/dirty` -> `saving` -> `ready/clean`
- **Failed save**: `ready/dirty` -> `saving` -> `ready/dirty` plus save message
- **Sheet switch with pending edits**: `ready/dirty` -> `ready/dirty` with a new
  `activeSheetId`
