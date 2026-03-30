# Tickets Folder Guide

This folder contains the implementation tickets for **`@logscopeai/logscope`**.

## Purpose

- Provide a code-aware, contract-aligned execution plan.
- Track work by epic, feature, and ticket code.
- Keep implementation, compatibility docs, and tracking synchronized.

## Registry

Use `tickets/ticket_registry.md` as the authoritative status registry for all tickets.

## Preferred Future Structure

New work should prefer the shared workspace layout:

- `tickets/epics/EP-XX-<name>/README.md`
- `tickets/epics/EP-XX-<name>/feature-NN-<feature-name>/LSN-###-*.md`
- `tickets/epics/EP-XX-<name>/feature-NN-<feature-name>/<feature-name>_pr.md`

## Legacy Layout

This repository already contains historical ticket trees under directories such as
`tickets/epic-LSN-XX-...`. Those directories remain valid legacy content and should not be renamed
retroactively just to match the new preferred structure.

When continuing work inside a legacy epic, keep its existing IDs and references stable unless there
is a separate explicit migration task.

## Working Rules

- Prefer small tickets and granular features.
- Prefer one PR per feature.
- Epic README files should describe intent, included features or tickets, and exit condition.
- Feature completion should produce a feature-level PR note.
- Ticket files are planning and tracking artifacts unless they explicitly say otherwise.
