import type { IngestionRequestResult } from './transport-types';

const MAX_DETAILS_IN_WARNING = 3;

/**
 * One warning per batch that lost entries to the API's validation. Unlike the unauthorized and
 * retry-exhausted warnings this is not deduplicated: each occurrence is a distinct data loss the
 * producer can fix (the offending field is named), and it is bounded by the flush cadence.
 */
export const buildDroppedEntriesWarning = (
  result: IngestionRequestResult,
  prefix = '[logscope]',
): string | undefined => {
  const droppedEntries = result.droppedEntries;

  if (droppedEntries === undefined || droppedEntries.count === 0) {
    return undefined;
  }

  const shownDetails = droppedEntries.details.slice(0, MAX_DETAILS_IN_WARNING).join('; ');
  const omittedCount = droppedEntries.details.length - MAX_DETAILS_IN_WARNING;
  const detailSuffix =
    shownDetails.length > 0
      ? ` Details: ${shownDetails}${omittedCount > 0 ? `; +${omittedCount} more` : ''}.`
      : '';
  const outcome =
    result.action === 'success'
      ? 'the rest of the batch was delivered'
      : 'the rest of the batch was not delivered';

  return `${prefix} Dropped ${droppedEntries.count} log entr${droppedEntries.count === 1 ? 'y' : 'ies'} rejected by the ingestion API (batch positions ${droppedEntries.indexes.join(', ')}); ${outcome}.${detailSuffix}`;
};
