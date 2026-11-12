import { buildDroppedEntriesWarning } from './dropped-entries-warning';
import { describe, expect, it } from 'vitest';

describe('buildDroppedEntriesWarning', () => {
  it('returns nothing when no entries were dropped', () => {
    expect(
      buildDroppedEntriesWarning({ action: 'success', status: 202, shouldWarnUnauthorized: false }),
    ).toBeUndefined();
  });

  it('names the positions, the outcome and at most three details', () => {
    const warning = buildDroppedEntriesWarning(
      {
        action: 'drop',
        status: 400,
        shouldWarnUnauthorized: false,
        errorKind: 'repeated_validation_failure',
        droppedEntries: {
          count: 2,
          indexes: [1, 4],
          details: [
            '"logs.1.message" a',
            '"logs.4.source" b',
            '"logs.4.message" c',
            '"logs.1.source" d',
          ],
        },
      },
      '[logscope] Pino transport',
    );

    expect(warning).toBe(
      '[logscope] Pino transport Dropped 2 log entries rejected by the ingestion API (batch positions 1, 4); the rest of the batch was not delivered. Details: "logs.1.message" a; "logs.4.source" b; "logs.4.message" c; +1 more.',
    );
  });
});
