# EPIC-LSN-03: Capture, Filtering, and Pino

## Context

This epic delivers Spec Milestone 3 (section 13): console interception, client-side filtering, and pino transport support.

## Goal

Unify all log sources (manual API, console, and pino transport) through one pipeline while enforcing pre-batch filtering and preserving host behavior.

## Included Tickets

- `LSN-008` Add pre-batch level filtering
- `LSN-009` Add opt-in console capture
- `LSN-010` Add pino transport entrypoint

## Exit Criteria

- Filtering occurs before enqueueing for all source types.
- Console capture is opt-in and preserves original console behavior.
- `@logscopeai/logscope/pino` transport maps levels and forwards without stdout interception.
