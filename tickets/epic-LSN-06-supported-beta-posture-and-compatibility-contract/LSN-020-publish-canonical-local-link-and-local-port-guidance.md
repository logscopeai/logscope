# LSN-020: Publish Canonical Local-Link and Local-Port Guidance

## Context

Cross-repo local validation still drifts on how the SDK should be linked and which local endpoints
it should target during workspace development.

## Objective

Publish the canonical SDK-side local linking and local endpoint guidance for the workspace.

## Scope

### In Scope

- Document local linking workflow for SDK consumers in the workspace.
- Align local endpoint/port guidance with current Core and Ingestion setup.
- Remove stale `@logscope/node` or legacy local-topology references where they still exist in SDK
  docs.
- Clarify which repo owns the canonical local topology versus SDK-specific usage notes.

### Out of Scope

- Packaging or publishing workflow redesign.
- Local-dev infra automation outside documentation.

## Acceptance Criteria

1. SDK repo documents the canonical local linking flow clearly.
2. Local endpoint/port guidance matches the current workspace.
3. Legacy local integration references are removed from SDK docs.
4. Repo ownership boundaries for local guidance are explicit.

## Implementation Notes

- This ticket should serve as the SDK sync point for payload-gen and simulator consumers.

## Status

Backlog

## Checklist

- [ ] Document canonical local linking flow.
- [ ] Align endpoint/port guidance with workspace reality.
- [ ] Remove stale legacy references.
- [ ] Clarify ownership boundaries for local guidance.

## Comments

- Planning ticket only.
