export type EntityType = 'CORPORATE' | 'INDIVIDUAL';

export interface ArtemisRecord {
  _id: string;
  metadata: {
    entityType: EntityType;
    caseId?: string;
    customerId?: string;
    caseStatus?: string;
    approvalStatus?: string;
    riskRating?: string;
    nextPeriodicReviewCycleDate?: string;
  };
  entityInformation?: {
    generalDetails?: Record<string, unknown>;
    corporateSpecific?: Record<string, unknown>;
    individualSpecific?: Record<string, unknown>;
  };
  screeningAndSearchConclusion?: {
    summary?: Record<string, unknown>;
    matchDetails?: Record<string, unknown>[];
  };
  riskAssessment?: Record<string, unknown>;
  approvalHistory?: Record<string, unknown>[];
  modificationDetails?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
