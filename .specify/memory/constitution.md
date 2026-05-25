<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
  - Template principle 1 -> I. Tabular Editing First
  - Template principle 2 -> II. Simplicity Over Feature Creep
  - Template principle 3 -> III. Data Safety Is Non-Negotiable
  - Template principle 4 -> IV. Testable Editing Workflows
  - Template principle 5 -> V. Responsive and Reliable by Default
- Added sections:
  - Product Constraints
  - Development Workflow
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated .specify/templates/plan-template.md
  - ✅ updated .specify/templates/spec-template.md
  - ✅ updated .specify/templates/tasks-template.md
  - ✅ verified no files matched .specify/templates/commands/*.md
- Follow-up TODOs:
  - None
-->
# Excel Editor Constitution

## Core Principles

### I. Tabular Editing First
All product work MUST improve or preserve a spreadsheet-like table experience
for Excel and CSV files inside Visual Studio Code. Features MUST directly
support viewing, editing, validating, or saving tabular data at the cell,
column, or row level; peripheral capabilities that do not strengthen that
workflow are out of scope.

Rationale: The project exists to make spreadsheet editing practical inside VS
Code rather than to become a general office suite.

### II. Simplicity Over Feature Creep
Implementations MUST prefer the smallest design that solves the current editing
problem end to end. New dependencies, settings, UI surfaces, or abstractions
MUST be justified by a concrete user need, and speculative spreadsheet features
MUST be deferred.

Rationale: A concise extension is easier to learn, maintain, and ship reliably.

### III. Data Safety Is Non-Negotiable
Any operation that opens, transforms, edits, or saves spreadsheet or CSV
content MUST protect user data integrity. Features MUST define expected
behavior for invalid files, unsupported structures, save failures, and lossy
conversions, and MUST avoid silent data mutation.

Rationale: Users trust the extension with business data; incorrect edits are
more costly than missing features.

### IV. Testable Editing Workflows
Changes that affect parsing, tabular rendering, editing behavior, save/load
flows, or file-format translation MUST include automated tests that exercise
the affected workflow and guard against regression. Manual-only verification is
insufficient for core data handling behavior.

Rationale: Spreadsheet workflows have many edge cases, and regressions are
expensive to detect after release.

### V. Responsive and Reliable by Default
The extension MUST remain responsive for its intended document sizes and MUST
communicate failures with clear, actionable feedback. Features MUST define
practical performance bounds and degrade predictably instead of blocking the
editor or hiding errors.

Rationale: Editors are interactive tools; perceived sluggishness or opaque
failures break user trust quickly.

## Product Constraints

- The product targets a custom Visual Studio Code extension as the primary
  delivery vehicle.
- Supported work MUST center on Excel spreadsheet and CSV files displayed in a
  tabular view.
- Users MUST be able to manipulate cell and column data without leaving the
  editor context.
- Scope decisions MUST favor concise, understandable behavior over parity with
  full spreadsheet desktop applications.

## Development Workflow

- Every specification MUST identify the target file formats, editing actions,
  data-safety risks, and out-of-scope behaviors before implementation begins.
- Every plan MUST pass a constitution check covering tabular fit, simplicity,
  data safety, test coverage, and performance or reliability expectations.
- Every task list MUST include work for fixtures or regression coverage when a
  change affects parsing, editing, rendering, or persistence.
- Pull requests and reviews MUST explicitly confirm constitution compliance and
  document any justified exception in the plan's complexity tracking section.

## Governance

This constitution overrides conflicting local workflow preferences for this
repository. Amendments MUST be proposed in the same change set as any affected
template or guidance update, and reviewers MUST reject amendments that leave
dependent artifacts inconsistent.

Versioning policy follows semantic versioning for governance changes: MAJOR for
removing or redefining a principle in a backward-incompatible way, MINOR for
adding a principle or materially expanding required guidance, and PATCH for
clarifications that do not change expectations.

Compliance review is required for every feature specification, implementation
plan, task list, and pull request. Reviews MUST verify tabular focus,
simplicity, data safety, required automated coverage, and responsive failure
handling before work is approved or merged.

**Version**: 1.0.0 | **Ratified**: 2026-05-25 | **Last Amended**: 2026-05-25
