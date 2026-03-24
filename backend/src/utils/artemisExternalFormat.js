/**
 * Maps Artemis export JSON (PascalCase + underscores, e.g. Metadata, Entity_Information)
 * into the Mongoose camelCase shape (metadata, entityInformation, …).
 * If the body already looks like the internal API shape (has lowercase `metadata`), it is returned unchanged.
 */

function yesNoToBool(v) {
  if (v === true || v === false) return v;
  if (v == null || v === "") return undefined;
  const s = String(v).trim().toUpperCase();
  if (s === "YES" || s === "Y" || s === "TRUE") return true;
  if (s === "NO" || s === "N" || s === "FALSE") return false;
  return undefined;
}

/** Split "10 JUL 2025 11:08:03 BY OFFICER NAME" → { datePart, officer } */
function splitDateAndOfficer(s) {
  if (s == null || typeof s !== "string") return { datePart: "", officer: undefined };
  const by = /\s+BY\s+/i;
  const m = s.match(by);
  if (!m || m.index === undefined) return { datePart: s.trim(), officer: undefined };
  return {
    datePart: s.slice(0, m.index).trim(),
    officer: s.slice(m.index + m[0].length).trim() || undefined,
  };
}

function tryParseDate(s) {
  if (s == null || s === "") return undefined;
  if (s instanceof Date && !Number.isNaN(s.getTime())) return s;
  const str = String(s).trim();
  if (!str) return undefined;
  const { datePart } = splitDateAndOfficer(str);
  const d = new Date(datePart || str);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function isEmptyObjectOrNull(v) {
  if (v == null) return true;
  if (typeof v !== "object") return false;
  return Object.keys(v).length === 0;
}

function mapGeneralDetails(G) {
  if (!G || typeof G !== "object") return {};
  const out = { ...G };
  if ("isActive" in out) {
    out.activeStatus = out.isActive;
    delete out.isActive;
  }
  return out;
}

function mapSummary(sum) {
  if (!sum || typeof sum !== "object") return {};
  const lastRaw = sum.lastUpdated;
  const { datePart, officer } =
    typeof lastRaw === "string" ? splitDateAndOfficer(lastRaw) : { datePart: "", officer: undefined };
  const lastUpdated = datePart ? tryParseDate(datePart) : tryParseDate(lastRaw);

  return {
    pepFlag: yesNoToBool(sum.pep),
    sanctionsFlag: yesNoToBool(sum.sanctions),
    adverseNewsFlag: yesNoToBool(sum.adverseNews),
    ownRestrictedListFlag: yesNoToBool(sum.ownRestrictedList),
    noHitFlag: yesNoToBool(sum.noHit),
    ...(lastUpdated ? { lastUpdated } : {}),
    ...(officer != null && officer !== "" ? { officerName: officer } : {}),
  };
}

function mapCountryRisk(cr) {
  if (!cr || typeof cr !== "object") return undefined;
  return {
    cpiScore: cr.cpi_CorruptionPerceptionsIndex_Score ?? cr.cpiScore,
    fatfScore: cr.fatf_FinancialActionTaskForce_Score ?? cr.fatfScore,
    oecdScore: cr.oecd_Score ?? cr.oecdScore,
  };
}

function mapTaxRisk(tr) {
  if (!tr || typeof tr !== "object") return undefined;
  return {
    fsiScore: tr.fsi_FinancialSecrecyIndex_Score ?? tr.fsiScore,
    fatcaScore: tr.fatca_Score ?? tr.fatcaScore,
  };
}

function mapScreeningRisk(sr) {
  if (!sr || typeof sr !== "object") return undefined;
  return {
    pepSanctionsAdverseCombinedScore:
      sr.pep_Sanctions_AdverseNews_Score ?? sr.pepSanctionsAdverseCombinedScore,
  };
}

function mapStructuralRisk(sr) {
  if (!sr || typeof sr !== "object") return undefined;
  return {
    industryScore: sr.industry_Score ?? sr.industryScore,
    entityTypeAndIndividualShareholdingScore:
      sr.entityType_IndividualShareholding_Score ?? sr.entityTypeAndIndividualShareholdingScore,
    occupationScore: sr.occupation_Score ?? sr.occupationScore,
    ownershipLayersScore: sr.ownershipLayers_Score ?? sr.ownershipLayersScore,
    onboardingModeScore: sr.onboardingMode_Score ?? sr.onboardingModeScore,
  };
}

function mapOperationalRisk(or) {
  if (!or || typeof or !== "object") return undefined;
  return {
    paymentModeScore: or.paymentMode_Score ?? or.paymentModeScore,
    productServiceComplexityScore:
      or.productServiceComplexity_Score ?? or.productServiceComplexityScore,
  };
}

function mapRiskAssessment(R) {
  if (!R || typeof R !== "object") return undefined;
  const rc = R.Risk_Categories || R.riskCategories;
  const out = {
    computedRiskRating: R.Computed_Risk_Rating ?? R.computedRiskRating,
    overrideRiskRating: R.Override_Risk_Rating ?? R.overrideRiskRating,
    totalRiskScorePercentage:
      R.Total_Risk_Score_Percentage ?? R.totalRiskScorePercentage,
  };
  if (rc && typeof rc === "object") {
    const countryRisk = mapCountryRisk(rc.Country_Risk || rc.countryRisk);
    const taxRisk = mapTaxRisk(rc.Tax_Risk || rc.taxRisk);
    const screeningRisk = mapScreeningRisk(rc.Screening_Risk || rc.screeningRisk);
    const structuralRisk = mapStructuralRisk(rc.Structural_Risk || rc.structuralRisk);
    const operationalRisk = mapOperationalRisk(rc.Operational_Risk || rc.operationalRisk);
    if (countryRisk && Object.values(countryRisk).some((x) => x != null)) out.countryRisk = countryRisk;
    if (taxRisk && Object.values(taxRisk).some((x) => x != null)) out.taxRisk = taxRisk;
    if (screeningRisk && Object.values(screeningRisk).some((x) => x != null))
      out.screeningRisk = screeningRisk;
    if (structuralRisk && Object.values(structuralRisk).some((x) => x != null))
      out.structuralRisk = structuralRisk;
    if (operationalRisk && Object.values(operationalRisk).some((x) => x != null))
      out.operationalRisk = operationalRisk;
  }
  return out;
}

function mapApprovalEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const updatedRaw = entry.updated;
  const { datePart, officer } =
    typeof updatedRaw === "string"
      ? splitDateAndOfficer(updatedRaw)
      : { datePart: "", officer: undefined };
  const timestamp = datePart ? tryParseDate(datePart) : tryParseDate(updatedRaw);
  return {
    computedRiskRating: entry.computedRiskRating,
    overrideRiskRating: entry.overrideRiskRating,
    riskScore: entry.riskScore,
    approvalStatus: entry.approvalStatus,
    ...(timestamp ? { timestamp } : {}),
    ...(officer ? { approvingOfficerName: officer } : {}),
  };
}

function mapModificationDetails(M) {
  if (!M || typeof M !== "object") return undefined;
  const out = {};

  if (M.submittedKycAt) {
    const d = tryParseDate(M.submittedKycAt);
    if (d) out.kycSubmissionTimestamp = d;
  }

  if (M.createdBy && typeof M.createdBy === "string") {
    const { datePart, officer } = splitDateAndOfficer(M.createdBy);
    const d = tryParseDate(datePart);
    if (d) out.recordCreatedDate = d;
    if (officer) out.recordCreatedBy = officer;
    else if (!d) out.recordCreatedBy = M.createdBy;
  }

  if (M.lastModifiedBy && typeof M.lastModifiedBy === "string") {
    const { datePart, officer } = splitDateAndOfficer(M.lastModifiedBy);
    const d = tryParseDate(datePart);
    if (d) out.lastModifiedDate = d;
    if (officer) out.lastModifiedBy = officer;
    else if (!d) out.lastModifiedBy = M.lastModifiedBy;
  }

  return Object.keys(out).length ? out : undefined;
}

function mapMatchDetailsItem(item) {
  if (!item || typeof item !== "object") return item;
  const known = {
    sourceList: item.sourceList,
    matchedIndicator: item.matchedIndicator,
    matchedName: item.matchedName,
    categories: item.categories,
    countries: item.countries,
    matchStrength: item.matchStrength,
    matchType: item.matchType,
    comments: item.comments,
  };
  const hasKnown = Object.values(known).some((v) => v != null);
  if (hasKnown) return { ...known, ...item };
  return item;
}

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
export function mapExternalArtemisJsonToInternal(body) {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return /** @type {Record<string, unknown>} */ (body);
  }

  const raw = /** @type {Record<string, unknown>} */ (body);

  if (!("Metadata" in raw) && raw.metadata && typeof raw.metadata === "object") {
    return JSON.parse(JSON.stringify(raw));
  }

  const M = raw.Metadata;
  if (!M || typeof M !== "object") {
    return JSON.parse(JSON.stringify(raw));
  }

  const E = raw.Entity_Information;
  const S = raw.Screening_And_Search_Conclusion;
  const R = raw.Risk_Assessment;
  const AH = raw.Approval_History;
  const MD = raw.Modification_Details;

  const metadata = {
    entityType: M.entityType,
    caseId: M.caseId,
    customerId: M.customerId,
    caseStatus: M.caseStatus,
    approvalStatus: M.approvalStatus,
    riskRating: M.riskRating,
  };
  const cycle = M.nextPeriodicReviewCycle ?? M.nextPeriodicReviewCycleDate;
  const cycleDate = tryParseDate(cycle);
  if (cycleDate) metadata.nextPeriodicReviewCycleDate = cycleDate;

  let entityInformation = {};
  if (E && typeof E === "object") {
    const gd = mapGeneralDetails(E.General_Details);
    entityInformation.generalDetails = gd;
    const corp = E.Corporate_Specific;
    const ind = E.Individual_Specific;
    if (corp != null && !isEmptyObjectOrNull(corp)) {
      entityInformation.corporateSpecific = corp;
    }
    if (ind != null && !isEmptyObjectOrNull(ind)) {
      entityInformation.individualSpecific = { ...ind };
      for (const k of ["identityIssuedDate", "identityExpiryDate", "dateOfBirth"]) {
        const v = entityInformation.individualSpecific[k];
        const d = tryParseDate(v);
        if (d) entityInformation.individualSpecific[k] = d;
      }
    }
  }

  let screeningAndSearchConclusion;
  if (S && typeof S === "object") {
    const md = S.Match_Details ?? S.matchDetails;
    screeningAndSearchConclusion = {
      summary: mapSummary(S.Summary || S.summary || {}),
      matchDetails: Array.isArray(md) ? md.map(mapMatchDetailsItem) : [],
    };
  }

  const riskAssessment = mapRiskAssessment(R);
  const approvalHistory = Array.isArray(AH) ? AH.map(mapApprovalEntry) : [];
  const modificationDetails = mapModificationDetails(MD);

  const out = {
    metadata,
    entityInformation,
    ...(screeningAndSearchConclusion
      ? { screeningAndSearchConclusion }
      : {}),
    ...(riskAssessment && Object.keys(riskAssessment).some((k) => riskAssessment[k] != null)
      ? { riskAssessment }
      : {}),
    ...(approvalHistory.length ? { approvalHistory } : {}),
    ...(modificationDetails ? { modificationDetails } : {}),
  };

  return out;
}

/**
 * Strip Mongo bookkeeping keys, then map external → internal when applicable.
 * @param {unknown} body
 */
export function normalizeArtemisIncomingPayload(body) {
  const clone =
    body && typeof body === "object" && !Array.isArray(body)
      ? JSON.parse(JSON.stringify(body))
      : body;
  if (!clone || typeof clone !== "object" || Array.isArray(clone)) {
    return clone;
  }
  delete clone._id;
  delete clone.__v;
  delete clone._searchText;
  delete clone.createdAt;
  delete clone.updatedAt;
  return mapExternalArtemisJsonToInternal(clone);
}
