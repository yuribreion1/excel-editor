# Data Model: XLSX Viewer Foundation

## Workbook

Represents the opened `.xlsx` file as a whole.

### Fields

- **uri**: Workspace-relative or absolute file identifier for the opened file
- **fileName**: Display name shown in the editor tab
- **sheetOrder**: Ordered list of worksheet identifiers as they appear in the
  workbook
- **activeSheetId**: Identifier of the worksheet currently shown in the viewer
- **openState**: One of `loading`, `ready`, `unsupported`, or `error`
- **warnings**: Non-fatal issues detected while preparing the workbook for view

### Validation Rules

- `uri` and `fileName` are required for every open request.
- `sheetOrder` must contain at least one entry when `openState` is `ready`.
- `activeSheetId` must match one entry in `sheetOrder` when `openState` is
  `ready`.

## Worksheet

Represents one visible sheet in the workbook.

### Fields

- **id**: Stable sheet identifier used by the viewer
- **name**: User-facing sheet label
- **rowCount**: Number of rows represented in the view model
- **columnCount**: Number of columns represented in the view model
- **cellMatrix**: Read-only table-oriented representation of visible cell values
- **visibilityState**: Whether the sheet is visible, hidden, or very hidden
- **structureWarnings**: Sheet-level issues such as merged cells or hidden rows

### Validation Rules

- `name` must be non-empty.
- `rowCount` and `columnCount` must be zero or positive.
- `cellMatrix` dimensions must match the exposed row and column counts.

## Cell View Model

Represents one displayed table cell.

### Fields

- **rowIndex**: Zero-based row position in the rendered table
- **columnIndex**: Zero-based column position in the rendered table
- **displayValue**: Human-readable value shown in the grid
- **rawValueType**: Original value class such as text, number, boolean, date, or
  blank
- **isMergedAnchor**: Whether the cell is the anchor for a merged range
- **isHiddenByStructure**: Whether the source cell belongs to a hidden row or
  column treatment path

### Validation Rules

- `rowIndex` and `columnIndex` must be zero or positive.
- `displayValue` may be empty, but must always be present.

## Sheet Navigation State

Represents the current viewer state that connects workbook data to the UI.

### Fields

- **availableSheets**: Ordered list of selectable worksheet summaries
- **selectedSheetId**: The sheet currently requested by the user
- **loadState**: One of `idle`, `loading`, `ready`, or `error`
- **message**: User-facing informational or error text associated with the
  current state

### Validation Rules

- `selectedSheetId` must be empty only when no sheet is available.
- `message` is required when `loadState` is `error`.

## Relationships

- One **Workbook** contains one or more **Worksheet** records.
- One **Worksheet** contains zero or more **Cell View Model** records.
- One **Workbook** owns one **Sheet Navigation State** instance at a time.

## State Transitions

- **Open request**: `loading` -> `ready`
- **Open request with unsupported file**: `loading` -> `unsupported`
- **Open request with fatal parse problem**: `loading` -> `error`
- **Sheet switch**: `ready` -> `loading` -> `ready`
- **Sheet switch failure**: `ready` -> `loading` -> `error`
