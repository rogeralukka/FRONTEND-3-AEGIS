/**
 * Service to manage discovery state persistence across session, reloads, and navigation.
 */

const DISCOVERY_STORAGE_PREFIX = 'aegis_case_discovery_v1_';

export interface PersistedDiscoveryState {
  stage: number;
  lastUpdated: string;
}

export const loadCaseDiscoveryStage = (
  caseId: string,
  isCaseComplete: boolean = false
): number => {
  if (typeof window === 'undefined') return 0;
  
  // If the case is already fully solved/complete, render the full graph (Stage 4)
  if (isCaseComplete) {
    return 4;
  }

  try {
    const raw = localStorage.getItem(`${DISCOVERY_STORAGE_PREFIX}${caseId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.stage === 'number') {
        return Math.min(Math.max(parsed.stage, 0), 4);
      }
    }
  } catch (e) {
    console.warn('Failed to load discovery stage for case', caseId, e);
  }

  // Initial opening of a new/active case defaults to Stage 0
  return 0;
};

export const saveCaseDiscoveryStage = (caseId: string, stage: number): void => {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedDiscoveryState = {
      stage: Math.min(Math.max(stage, 0), 4),
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(`${DISCOVERY_STORAGE_PREFIX}${caseId}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save discovery stage for case', caseId, e);
  }
};

export const resetCaseDiscoveryStage = (caseId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${DISCOVERY_STORAGE_PREFIX}${caseId}`);
  } catch (e) {
    console.warn('Failed to reset discovery stage for case', caseId, e);
  }
};
