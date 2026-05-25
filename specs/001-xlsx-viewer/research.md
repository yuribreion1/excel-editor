# Research: XLSX Viewer Foundation

## Workbook parsing stack

**Decision**: Use SheetJS CE (`xlsx`) to read workbook structure and worksheet
data for the initial read-only viewer.

**Rationale**: The feature only needs reliable `.xlsx` inspection, sheet
enumeration, and value extraction. SheetJS CE covers workbook parsing, sheet
selection, merges, visibility metadata, and unsupported-file detection without
requiring custom ZIP and XML parsing.

**Alternatives considered**:

- **ExcelJS**: Viable, but heavier toward editing and generation than this
  milestone requires.
- **Direct OOXML parsing**: Rejected because it adds avoidable complexity and
  risk for the first feature.

## Extension runtime

**Decision**: Build the extension in TypeScript on the VS Code extension host.

**Rationale**: TypeScript is the most common and best-supported way to build
VS Code extensions. It keeps the extension API integration direct and improves
type safety for workbook models, view state, and webview messaging.

**Alternatives considered**:

- **JavaScript**: Simpler to bootstrap, but weaker for the typed workbook and
  viewer state this feature needs.
- **Browser-only extension**: Rejected because the first milestone targets the
  desktop VS Code experience.

## Viewer surface

**Decision**: Use a `CustomReadonlyEditorProvider` with a dedicated webview.

**Rationale**: The feature needs a file-backed experience that replaces raw
binary content with an Excel-like table. A custom read-only editor cleanly owns
the `.xlsx` open experience while keeping the scope smaller than a full custom
editor with save flows.

**Alternatives considered**:

- **Standalone command + webview panel**: Rejected because it would make file
  opening feel indirect and less native.
- **Notebook or tree-based rendering**: Rejected because it would not match the
  expected table metaphor closely enough.

## Testing strategy

**Decision**: Use fixture-based unit tests for parser and mapping logic, plus VS
Code integration tests for editor open, rendering, sheet switching, and error
handling.

**Rationale**: The constitution requires automated coverage for parsing,
rendering, and persistence-adjacent flows. This split keeps tests focused while
still exercising the extension behavior users actually depend on.

**Alternatives considered**:

- **Only unit tests**: Rejected because they would miss editor registration and
  webview integration issues.
- **Full browser-style end-to-end automation**: Rejected for the first
  milestone due to added setup cost without proportional benefit.

## Performance and reliability guardrails

**Decision**: Parse workbook metadata first, load the active sheet on demand, and
render the table with virtualization-friendly assumptions.

**Rationale**: The spec targets a readable view within 5 seconds for workbooks
up to 10 MB. Loading all sheets eagerly or rendering every cell directly in the
DOM would make large documents fragile and slow.

**Alternatives considered**:

- **Eagerly parse and render all worksheets**: Rejected because it wastes memory
  and slows first render.
- **Hard limit to first sheet only**: Rejected because multi-sheet navigation is
  already part of the feature scope.

## Unsupported workbook structures

**Decision**: Support straightforward worksheet viewing first and treat advanced
or lossy structures with explicit fallback messaging.

**Rationale**: The first milestone does not need full Excel parity. Predictable
read-only behavior is better than a misleading approximation when the workbook
contains encrypted content, unsupported formatting semantics, or structures that
do not map cleanly to a simple table.

**Alternatives considered**:

- **Promise full Excel parity immediately**: Rejected because it violates the
  constitution's simplicity rule.
- **Silently flatten every unsupported structure**: Rejected because it risks
  confusing users and hiding fidelity loss.
