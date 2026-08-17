import type { Branch, Continuity } from './types';

/** Missing chapter anchors are legacy only when that endpoint has chapters to anchor to. */
export function hasLegacyBranchAnchors(
  branch: Pick<Branch, 'startChapterId' | 'endChapterId' | 'startContinuityId' | 'endContinuityId'>,
  continuities: readonly Continuity[],
): boolean {
  const start = continuities.find(continuity => continuity.id === branch.startContinuityId);
  const end = continuities.find(continuity => continuity.id === branch.endContinuityId);
  if (!start || !end) return true;
  return (!branch.startChapterId && start.chapters.length > 0)
    || (!branch.endChapterId && end.chapters.length > 0);
}
