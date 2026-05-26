# Change Log

All notable changes to the "excel-editor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Changed

- **Style-rich workbooks are now editable.** Removed the `getWorkbookStyleBlocker` guard that
  blocked all `.xlsx` files containing more than one cell style from being edited. The serializer
  already uses `cellStyles: true` during `XLSX.write()`, so cell styles are preserved on round-trip.
  Workbooks with VBA/macro content, unsupported sheet types, worksheet protection, formula cells,
  error cells, merged-range non-anchors, and hidden rows/columns remain read-only as before.

- Initial release