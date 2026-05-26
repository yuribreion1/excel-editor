# Contracts: Webview ↔ Extension Host Message Protocol

This document describes the message-passing contract between the VS Code
extension host (`XlsxEditorProvider` / `XlsxCustomDocument`) and the webview
(`xlsxViewerApp.ts`). All messages are JSON-serialisable objects exchanged via
`vscode.postMessage` / `window.addEventListener('message', …)`.

---

## Direction: Extension Host → Webview

### `state-update`

Sent whenever the document state changes (on open, after an edit, after save,
after undo/redo, after sheet switch).

```ts
{
  type: 'state-update';
  state: ViewerState;
}
```

**`ViewerState` shape** (relevant fields for this feature):

| Field | Type | Notes |
|-------|------|-------|
| `loadState` | `'idle' \| 'loading' \| 'ready' \| 'unsupported' \| 'error'` | |
| `title` | `string` | File basename |
| `readOnly` | `boolean` | `false` for standard `.xlsx` after this feature |
| `isDirty` | `boolean` | `true` when unsaved edits exist |
| `canUndo` | `boolean` | |
| `canRedo` | `boolean` | |
| `availableSheets` | `WorksheetSummary[]` | |
| `selectedSheetId` | `string \| undefined` | |
| `table` | `WorksheetTable \| undefined` | Full cell matrix for the active sheet |
| `warnings` | `string[]` | Non-fatal informational messages |
| `editability` | `WorkbookSaveAssessment` | Workbook-level edit/save gating |
| `editorMessage` | `EditorMessageState \| undefined` | Inline warning/error banner |

---

### `cell-update`

Sent after a single cell edit is applied (optimistic update path).

```ts
{
  type: 'cell-update';
  sheetId: string;
  address: string;
  cell: WorksheetCell;   // updated cell view-model
}
```

---

## Direction: Webview → Extension Host

### `edit-cell`

Sent when the user confirms a cell value change (Enter or focus-out).

```ts
{
  type: 'edit-cell';
  sheetId: string;
  address: string;
  value: string;   // raw string from input element
}
```

### `select-sheet`

Sent when the user clicks a sheet tab.

```ts
{
  type: 'select-sheet';
  sheetId: string;
}
```

### `undo`

Sent when the user triggers undo (Ctrl+Z / Cmd+Z inside the webview).

```ts
{
  type: 'undo';
  operationId: string;
}
```

### `redo`

Sent when the user triggers redo (Ctrl+Y / Ctrl+Shift+Z inside the webview).

```ts
{
  type: 'redo';
  operationId: string;
}
```

### `dismiss-editor-message`

Sent when the user dismisses the inline warning/error banner.

```ts
{
  type: 'dismiss-editor-message';
}
```

---

## Read-only guard contract

The webview checks `state.readOnly` before allowing cell interaction:

```
state.readOnly === true   → cell click shows inline warning, no input rendered
state.readOnly === false  → cell click opens inline input for editing
```

Individual cell editability is also checked via `cell.isEditable` and
`cell.editBlockReason`. A cell may be blocked even when the workbook is editable
(e.g., formula cells, merged-range non-anchors). In that case:

```
state.readOnly === false AND cell.isEditable === false
  → showInlineMessage('warning', cell.editBlockReason)
```

**After this feature**: `state.readOnly` will be `false` for all standard
`.xlsx` files (no VBA, no non-standard sheet types). The per-cell guards are
unchanged.

---

## Save flow (VS Code native)

Saving is handled by the VS Code `CustomEditorProvider` save lifecycle, not by
a custom webview message. When the user presses `Ctrl+S`/`Cmd+S`:

1. VS Code calls `XlsxEditorProvider.saveCustomDocument(document, …)`
2. Provider calls `document.save()`
3. `XlsxCustomDocument.save()` → `persistTo(this.uri)`
4. `persistTo` re-evaluates `assessWorkbookEditability`; if still editable,
   calls `writeWorkbookToUri`
5. On success: `savePoint` updated, `emitChange({ kind: 'state' })` triggers
   a new `state-update` to the webview with `isDirty: false`
6. On failure: `setEditorMessage('error', …)` triggers a `state-update` with
   the error banner populated; original file is untouched
