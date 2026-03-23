import mongoose from 'mongoose';

const { Schema } = mongoose;

const generalDetailsSchema = new Schema(
  {
    activeStatus: String,
    name: String,
    alias: String,
    formerRegisteredName: String,
    emailAddress: String,
    phoneNumber: String,
    website: String,
    address: String,
    bankAccount: String,
    sourceOfFunds: String,
    natureOfBusinessRelationship: String,
    additionalInformation: String,
    onboardingMode: String,
    paymentMode: String,
    productServiceComplexity: String,
  },
  { _id: false }
);

const corporateSpecificSchema = new Schema(
  {
    incorporationStatus: String,
    entityType: String,
    ownershipStructureLayers: Schema.Types.Mixed,
    countryOfOperations: String,
    countryOfIncorporation: String,
    primaryBusinessActivity: String,
    incorporationNumber: String,
    dateOfIncorporation: Date,
    dateOfIncorporationExpiry: Date,
    imoNumber: String,
    ultimateHoldingCompanyRegulatedOrFATFListed: Boolean,
  },
  { _id: false }
);

const individualSpecificSchema = new Schema(
  {
    salutation: String,
    gender: String,
    nationality: String,
    countryOfResidence: String,
    identificationType: String,
    identificationNumber: String,
    identityIssuedDate: Date,
    identityExpiryDate: Date,
    countryOfBirth: String,
    dateOfBirth: Date,
    industry: String,
    occupation: String,
  },
  { _id: false }
);

const metadataSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['CORPORATE', 'INDIVIDUAL'],
      required: true,
    },
    caseId: String,
    customerId: String,
    caseStatus: String,
    approvalStatus: String,
    riskRating: String,
    nextPeriodicReviewCycleDate: Date,
  },
  { _id: false }
);

const screeningSummarySchema = new Schema(
  {
    pepFlag: Boolean,
    sanctionsFlag: Boolean,
    adverseNewsFlag: Boolean,
    ownRestrictedListFlag: Boolean,
    noHitFlag: Boolean,
    lastUpdated: Date,
    officerName: String,
  },
  { _id: false }
);

const matchDetailSchema = new Schema(
  {
    sourceList: String,
    matchedIndicator: String,
    matchedName: String,
    categories: [String],
    countries: [String],
    matchStrength: String,
    matchType: String,
    comments: String,
  },
  { _id: false }
);

const countryRiskSchema = new Schema(
  {
    cpiScore: Schema.Types.Mixed,
    fatfScore: Schema.Types.Mixed,
    oecdScore: Schema.Types.Mixed,
  },
  { _id: false }
);

const taxRiskSchema = new Schema(
  {
    fsiScore: Schema.Types.Mixed,
    fatcaScore: Schema.Types.Mixed,
  },
  { _id: false }
);

const screeningRiskSchema = new Schema(
  {
    pepSanctionsAdverseCombinedScore: Schema.Types.Mixed,
  },
  { _id: false }
);

const structuralRiskSchema = new Schema(
  {
    industryScore: Schema.Types.Mixed,
    entityTypeAndIndividualShareholdingScore: Schema.Types.Mixed,
    occupationScore: Schema.Types.Mixed,
    ownershipLayersScore: Schema.Types.Mixed,
    onboardingModeScore: Schema.Types.Mixed,
  },
  { _id: false }
);

const operationalRiskSchema = new Schema(
  {
    paymentModeScore: Schema.Types.Mixed,
    productServiceComplexityScore: Schema.Types.Mixed,
  },
  { _id: false }
);

const riskAssessmentSchema = new Schema(
  {
    computedRiskRating: String,
    overrideRiskRating: String,
    totalRiskScorePercentage: Schema.Types.Mixed,
    countryRisk: countryRiskSchema,
    taxRisk: taxRiskSchema,
    screeningRisk: screeningRiskSchema,
    structuralRisk: structuralRiskSchema,
    operationalRisk: operationalRiskSchema,
  },
  { _id: false }
);

const approvalHistoryEntrySchema = new Schema(
  {
    computedRiskRating: String,
    overrideRiskRating: String,
    riskScore: Schema.Types.Mixed,
    approvalStatus: String,
    timestamp: Date,
    approvingOfficerName: String,
  },
  { _id: false }
);

const modificationDetailsSchema = new Schema(
  {
    kycSubmissionTimestamp: Date,
    recordCreatedDate: Date,
    recordCreatedBy: String,
    lastModifiedDate: Date,
    lastModifiedBy: String,
  },
  { _id: false }
);

const entityInformationSchema = new Schema(
  {
    generalDetails: generalDetailsSchema,
    corporateSpecific: corporateSpecificSchema,
    individualSpecific: individualSpecificSchema,
  },
  { _id: false }
);

const screeningConclusionSchema = new Schema(
  {
    summary: screeningSummarySchema,
    matchDetails: [matchDetailSchema],
  },
  { _id: false }
);

const artemisRecordSchema = new Schema(
  {
    metadata: { type: metadataSchema, required: true },
    entityInformation: { type: entityInformationSchema, default: () => ({}) },
    screeningAndSearchConclusion: screeningConclusionSchema,
    riskAssessment: riskAssessmentSchema,
    approvalHistory: [approvalHistoryEntrySchema],
    modificationDetails: modificationDetailsSchema,
    /** Denormalized lowercase blob for fast multi-field substring search */
    _searchText: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

artemisRecordSchema.path('entityInformation').validate(function (v) {
  if (!v) return true;
  const et = this.metadata?.entityType;
  if (et === 'CORPORATE' && v.individualSpecific != null) {
    return Object.keys(v.individualSpecific?.toObject?.() ?? v.individualSpecific ?? {}).length === 0;
  }
  if (et === 'INDIVIDUAL' && v.corporateSpecific != null) {
    return Object.keys(v.corporateSpecific?.toObject?.() ?? v.corporateSpecific ?? {}).length === 0;
  }
  return true;
}, 'Individual_Specific must be omitted for CORPORATE and Corporate_Specific must be omitted for INDIVIDUAL.');

function isEmptySubdoc(sub) {
  if (sub == null) return true;
  const o = sub.toObject ? sub.toObject() : sub;
  return !o || Object.keys(o).length === 0;
}

artemisRecordSchema.pre('validate', function (next) {
  const et = this.metadata?.entityType;
  if (et === 'CORPORATE' && this.entityInformation?.individualSpecific && !isEmptySubdoc(this.entityInformation.individualSpecific)) {
    this.invalidate('entityInformation.individualSpecific', 'Must be omitted when entityType is CORPORATE');
  }
  if (et === 'INDIVIDUAL' && this.entityInformation?.corporateSpecific && !isEmptySubdoc(this.entityInformation.corporateSpecific)) {
    this.invalidate('entityInformation.corporateSpecific', 'Must be omitted when entityType is INDIVIDUAL');
  }
  next();
});

/** Normalize payload: strip wrong branch before save */
export function applyEntityTypeRules(body) {
  const out = JSON.parse(JSON.stringify(body));
  const et = out?.metadata?.entityType;
  if (!out.entityInformation) out.entityInformation = {};
  if (et === 'CORPORATE') {
    delete out.entityInformation.individualSpecific;
  } else if (et === 'INDIVIDUAL') {
    delete out.entityInformation.corporateSpecific;
  }
  return out;
}

const SEARCH_SKIP_KEYS = new Set(['_searchText']);

/**
 * Flattens every object key name and leaf value into searchable tokens
 * (metadata keys, nested paths, booleans, dates, arrays, etc.).
 */
function collectSearchTokens(obj, parts, seen) {
  if (obj === null || obj === undefined) return;
  if (obj instanceof mongoose.Types.ObjectId) {
    parts.push(String(obj));
    return;
  }
  if (Buffer.isBuffer(obj)) {
    parts.push(obj.toString('hex'));
    return;
  }
  const t = typeof obj;
  if (t === 'string' || t === 'number' || t === 'bigint') {
    parts.push(String(obj));
    return;
  }
  if (t === 'boolean') {
    parts.push(obj ? 'true yes' : 'false no');
    return;
  }
  if (obj instanceof Date) {
    parts.push(obj.toISOString());
    parts.push(obj.toString());
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((el) => collectSearchTokens(el, parts, seen));
    return;
  }
  if (t !== 'object') {
    parts.push(String(obj));
    return;
  }
  if (seen.has(obj)) return;
  seen.add(obj);
  for (const [k, v] of Object.entries(obj)) {
    if (SEARCH_SKIP_KEYS.has(k) || k === '__v') continue;
    parts.push(k);
    collectSearchTokens(v, parts, seen);
  }
}

export function buildSearchText(doc) {
  const plain = doc.toObject ? doc.toObject({ depopulate: true }) : JSON.parse(JSON.stringify(doc));
  if (plain && typeof plain === 'object') {
    delete plain._searchText;
  }
  const parts = [];
  collectSearchTokens(plain, parts, new WeakSet());
  return parts.join(' ').toLowerCase();
}

artemisRecordSchema.pre('save', function (next) {
  try {
    this._searchText = buildSearchText(this);
  } catch {
    this._searchText = '';
  }
  next();
});

artemisRecordSchema.index({ 'metadata.caseId': 1 });
artemisRecordSchema.index({ 'metadata.customerId': 1 });
artemisRecordSchema.index({ createdAt: -1 });

export const ArtemisRecord = mongoose.model('ArtemisRecord', artemisRecordSchema);
