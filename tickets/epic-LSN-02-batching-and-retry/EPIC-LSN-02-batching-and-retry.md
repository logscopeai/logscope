# EPIC-LSN-02: Batching and Retry Delivery

## Context

This epic delivers Spec Milestone 2 (section 13): batching, retry logic, and sustained coverage over 90%.

## Goal

Move from immediate single-log delivery to resilient queued delivery with max-50 batches, timed flushes, and contract-compliant retry behavior.

## Included Tickets

- `LSN-005` Build in-memory batching pipeline
- `LSN-006` Implement retry and status handling
- `LSN-007` Enforce Vitest coverage gate

## Exit Criteria

- Batching and retry behavior satisfy sections 6, 10, and 11 of the spec.
- Coverage thresholds are automated and enforced.
