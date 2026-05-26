# Feature Specification: GitHub Actions Build & Deploy Workflow

**Feature Branch**: `004-github-action-build-deploy`

**Created**: 2025-07-14

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automated VSIX Build on Version Tag (Priority: P1)

A maintainer creates a version tag (e.g., `v1.2.0`) on the `main` branch to signal a new release. The CI system automatically builds the packaged VSIX file from the extension source code, attaches it as a downloadable asset to a GitHub Release, and reports success or failure back on the tag/release page — all without any manual build steps on the maintainer's local machine.

**Why this priority**: This is the core value proposition of the feature. It automates the error-prone manual step of packaging and distributing the extension, ensuring every release is reproducible and traceable.

**Independent Test**: Can be fully tested by pushing a `vX.Y.Z` tag to the repository and verifying that a GitHub Release is created with the `.vsix` file attached as an asset.

**Acceptance Scenarios**:

1. **Given** a valid semver tag `vX.Y.Z` is pushed to the repository, **When** the workflow runs, **Then** a VSIX package is built successfully and attached to a new GitHub Release named after that tag.
2. **Given** the workflow has completed successfully, **When** a team member visits the GitHub Releases page, **Then** they can download the `.vsix` file and install it directly in VS Code via the "Install from VSIX…" command.
3. **Given** the build step fails (e.g., compilation error), **When** the workflow runs on a tag push, **Then** no GitHub Release is created, the workflow reports a failure status on the tag, and the maintainer receives a notification.
4. **Given** the tag does not follow the `vX.Y.Z` semver pattern, **When** the tag is pushed, **Then** the release workflow does not trigger.

---

### User Story 2 — Manual Workflow Trigger for On-Demand Builds (Priority: P2)

A developer wants to produce a VSIX artifact without creating a release tag — for example, to test a feature branch build, validate a hotfix candidate, or share a pre-release with a tester. They can trigger the build workflow manually from the GitHub Actions UI, choosing whether to simply produce an artifact or also cut a pre-release.

**Why this priority**: Manual triggers provide the safety valve that avoids creating unintended releases, while still offering the convenience of CI-built artifacts during development and QA cycles.

**Independent Test**: Can be fully tested by using the "Run workflow" button in the GitHub Actions UI and verifying a `.vsix` artifact appears in the workflow run summary.

**Acceptance Scenarios**:

1. **Given** a developer navigates to the Actions tab in GitHub and selects the build workflow, **When** they click "Run workflow" on any branch, **Then** the VSIX is built and made available as a downloadable workflow artifact.
2. **Given** a developer triggers the workflow manually with a "create pre-release" option enabled, **When** the workflow completes, **Then** a GitHub Release marked as pre-release is created with the VSIX attached.
3. **Given** a manual trigger is initiated on a branch with uncommitted or broken code, **When** the build step fails, **Then** no artifact or release is created and the failure is clearly reported in the workflow log.

---

### User Story 3 — Continuous Integration Build on Push to Main (Priority: P3)

Every push to the `main` branch automatically triggers a build to verify the extension packages correctly. No release or artifact is published, but the build status is visible on the branch and in pull request checks, giving the team confidence that the extension is always in a releasable state.

**Why this priority**: Provides an ongoing health signal and catches packaging regressions early, but produces no distributable output — lower urgency than the release and manual build stories.

**Independent Test**: Can be fully tested by merging a PR to `main` and verifying the workflow check appears and passes (or fails) in the PR checks section without creating any release or artifact.

**Acceptance Scenarios**:

1. **Given** a pull request is merged to `main`, **When** the push event fires, **Then** the workflow builds the extension in production mode and reports a green status check.
2. **Given** the extension source contains a breaking change that prevents packaging, **When** a push to `main` triggers the workflow, **Then** the workflow fails with a clear error status visible on the commit and any open PRs targeting `main`.
3. **Given** a push to a non-`main` branch occurs, **When** the event fires, **Then** the CI build workflow does NOT trigger (only the version-tag and manual triggers apply to non-main branches).

---

### User Story 4 — VS Code Marketplace Publishing on Release Tag (Priority: P4)

When a release tag is created, in addition to attaching the VSIX to the GitHub Release, the workflow can optionally publish the extension to the VS Code Marketplace. This step is gated by a secret token and is skipped gracefully if the token is not configured, so teams that only want GitHub Release artifacts are not affected.

**Why this priority**: Marketplace publishing is a deployment destination that requires additional credentials and setup. It is a valuable final step for public distribution but is optional and dependent on the team's publishing readiness.

**Independent Test**: Can be fully tested by configuring the Marketplace publisher token secret and verifying that a release tag results in the extension appearing on the VS Code Marketplace listing.

**Acceptance Scenarios**:

1. **Given** the Marketplace publisher token secret is configured in the repository, **When** a `vX.Y.Z` tag is pushed, **Then** the workflow publishes the extension to the VS Code Marketplace after the GitHub Release artifact step succeeds.
2. **Given** the Marketplace publisher token secret is NOT configured, **When** a `vX.Y.Z` tag is pushed, **Then** the GitHub Release artifact is still created, the Marketplace step is skipped gracefully, and the workflow reports a warning (not a failure) about the missing token.
3. **Given** the Marketplace publish step fails (e.g., version already exists, invalid token), **When** the workflow runs, **Then** the failure is clearly reported in the workflow log and the maintainer is notified, while the already-created GitHub Release artifact remains intact.

---

### Edge Cases

- What happens when the `package.json` version does not match the Git tag version? The workflow must detect the mismatch and fail fast with a clear message rather than publishing an inconsistently versioned artifact.
- What happens if the workflow is triggered simultaneously by two concurrent tag pushes? Each run must operate independently without overwriting or corrupting the other's artifacts.
- What happens when `npm install` fails due to a network error or a dependency not being available? The workflow must fail the build step, surface the dependency error in the log, and not proceed to packaging.
- What happens when the VSIX packaging step produces an unexpectedly large file (e.g., `node_modules` accidentally included)? The workflow should report the artifact size so maintainers can detect packaging anomalies.
- What happens when the repository is forked and a fork maintainer pushes a tag? The workflow should not attempt to publish to the Marketplace or create releases against the upstream repository, and secrets should not be accessible to fork workflows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workflow MUST trigger automatically when a tag matching the pattern `v*.*.*` (semantic version) is pushed to the repository.
- **FR-002**: The workflow MUST support a manual trigger (`workflow_dispatch`) that can be invoked from the GitHub Actions UI on any branch without requiring a tag.
- **FR-003**: The workflow MUST trigger a build-only check (no artifact or release) on every push to the `main` branch.
- **FR-004**: The workflow MUST install all project dependencies before attempting to build or package the extension.
- **FR-005**: The workflow MUST compile the extension source code in production mode prior to packaging.
- **FR-006**: The workflow MUST package the compiled extension into a single `.vsix` file using the standard VS Code extension packaging tool.
- **FR-007**: On a version-tag trigger, the workflow MUST create a GitHub Release and attach the `.vsix` file as a release asset.
- **FR-008**: On a manual trigger, the workflow MUST make the `.vsix` file available as a downloadable workflow artifact retained for at least 7 days.
- **FR-009**: On a manual trigger, the workflow MUST offer an option to mark the resulting release as a pre-release.
- **FR-010**: The Marketplace publish step MUST be skipped gracefully (warning, not failure) when the publisher token secret is not configured in the repository.
- **FR-011**: The Marketplace publish step MUST only execute after the GitHub Release artifact step has completed successfully.
- **FR-012**: The workflow MUST validate that the `package.json` version field matches the Git tag before proceeding to release or publish steps.
- **FR-013**: The workflow MUST run on a Linux-based CI runner environment.
- **FR-014**: The workflow MUST run using a Node.js version compatible with the project's declared engine requirements.
- **FR-015**: All secrets required by the workflow (Marketplace token, GitHub token) MUST be accessed exclusively through GitHub Actions encrypted secrets — never hardcoded or printed in logs.
- **FR-016**: The workflow MUST NOT run on pull requests from forks in a way that exposes repository secrets.
- **FR-017**: Workflow steps MUST report meaningful exit codes and log messages so failures can be diagnosed without access to a local development environment.

### Key Entities

- **Workflow Run**: A single execution of the GitHub Actions workflow, associated with a trigger event (tag push, main push, or manual dispatch), a Git commit SHA, and a final status (success, failure, cancelled).
- **VSIX Package**: The distributable binary artifact produced by packaging the extension source. Contains compiled JavaScript, static assets, and extension manifest. Identified by name and version.
- **GitHub Release**: A tagged snapshot in the repository's Releases section. May have a name, description, and attached binary assets. Can be marked as pre-release.
- **Workflow Artifact**: A file attached directly to a workflow run (not a release). Accessible from the run summary page. Subject to a retention period after which it is automatically deleted.
- **Publisher Token**: An encrypted secret that authenticates the workflow to the VS Code Marketplace on behalf of the extension's publisher account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can go from pushing a version tag to having a downloadable VSIX attached to a GitHub Release in under 10 minutes, with no local build steps required.
- **SC-002**: 100% of version-tag-triggered workflow runs either produce a valid GitHub Release artifact or report a clear, actionable failure — no silent failures or partial releases.
- **SC-003**: A developer unfamiliar with the build tooling can manually trigger a VSIX build and download the resulting artifact from the GitHub Actions UI without reading any documentation beyond the workflow's inline descriptions.
- **SC-004**: The CI build check on `main` catches packaging failures within 5 minutes of a push, giving the team a fast feedback loop before any release is attempted.
- **SC-005**: The Marketplace publish step is successfully decoupled from the artifact release step — removing or misconfiguring the publisher token does not break the VSIX release to GitHub.
- **SC-006**: Workflow credentials (tokens, secrets) are never exposed in workflow logs or accessible to untrusted forks, with zero credential-leak incidents.
- **SC-007**: The VSIX artifact produced by the workflow installs and activates correctly in VS Code without any additional configuration steps by the end user.

## Assumptions

- The extension will remain in a private GitHub repository during initial workflow development; publishing to the VS Code Marketplace is a later, optional step dependent on the team's decision to make the extension public.
- The project's `vscode:prepublish` npm script (which runs webpack in production mode) is the authoritative build entry point and will be used by the packaging tool automatically.
- The `package.json` `version` field is the single source of truth for the extension version; the Git tag is expected to be `v` + that version (e.g., `package.json` `"version": "1.2.0"` → tag `v1.2.0`).
- No self-hosted runners are required; GitHub-hosted Linux runners provide sufficient compute for the build and packaging steps.
- The repository uses GitHub Actions (already confirmed by existing `codeql.yml` and `dependency-review.yml` workflows) and no migration of CI platform is needed.
- The `vsce` (or `@vscode/vsce`) packaging tool will be added as a development dependency if not already present; no alternative packaging tool is in scope.
- Marketplace publishing credentials (Personal Access Token or Azure DevOps PAT) are managed by the repository owner and stored as GitHub encrypted secrets; the workflow spec does not cover how to obtain or rotate these credentials.
- The workflow does not need to run automated tests as part of the build/deploy pipeline at this stage; test execution is considered a separate CI concern already covered or to be covered independently.
- GitHub Releases are used as the primary distribution mechanism for team/beta users; direct VS Code Marketplace publishing is treated as an optional enhancement.
