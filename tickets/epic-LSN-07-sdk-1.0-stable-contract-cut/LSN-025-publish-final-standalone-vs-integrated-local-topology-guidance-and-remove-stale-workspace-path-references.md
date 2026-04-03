# LSN-025: Publish Final Standalone-vs-Integrated Local Topology Guidance and Remove Stale Workspace Path References

## Context

Local SDK validation still depends on mixed guidance across repos, and a few docs still refer to
the old sibling repo path `../logscope`.

## Objective

Publish the final local topology guidance for stable `1.0` and remove stale workspace-path
references from SDK-owned docs.

## Scope

### In Scope

- Document standalone versus integrated local workspace runs from the SDK point of view.
- Align local target guidance with the final workspace topology matrix.
- Remove stale repo-path references where this repo still points to `logscope`.

### Out of Scope

- Payload-generator README ownership.
- Ingestion runtime bring-up docs outside SDK-owned sync points.

## Acceptance Criteria

1. SDK local docs cover standalone and integrated topology explicitly.
2. SDK docs no longer reference the old sibling repo path.
3. The SDK-side local story matches the root `1.0` roadmap.

## Status

Implemented

## Checklist

- [x] Document standalone versus integrated local workspace runs from the SDK point of view.
- [x] Align SDK local target guidance with the final workspace topology matrix.
- [x] Confirm SDK-owned docs no longer reference the old sibling repo path `../logscope`.

## Comments

- Completed on 2026-04-03.
- Rewrote `docs/local-development.md` around one explicit SDK-side topology matrix:
  standalone ingestion on `http://localhost:3000` and integrated Core + Ingestion local runs with
  the SDK targeting `http://localhost:3001`.
- Updated `README.md` to point contributors at the new standalone-versus-integrated local guidance
  instead of the older single-target wording.
- Reviewed SDK-owned docs for stale sibling-path references and found no remaining `../logscope`
  references after the local-topology rewrite. The guide now calls out `logscope-npm` explicitly in
  the `npm link` workflow.
