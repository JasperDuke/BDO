/**
 * Ensures each Artemis record includes both corporateSpecific and individualSpecific
 * on entityInformation: the non-applicable branch is always {} (same shape for all responses).
 *
 * @param {Record<string, unknown>} doc - lean Mongoose document
 * @returns {Record<string, unknown>}
 */
export function toUnifiedArtemisRecord(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const et = doc.metadata?.entityType;
  const rawEi = doc.entityInformation;
  const ei =
    rawEi && typeof rawEi === 'object' && !Array.isArray(rawEi)
      ? { ...rawEi }
      : {};

  const gd =
    ei.generalDetails && typeof ei.generalDetails === 'object' && !Array.isArray(ei.generalDetails)
      ? { ...ei.generalDetails }
      : {};

  let corporateSpecific =
    ei.corporateSpecific &&
    typeof ei.corporateSpecific === 'object' &&
    !Array.isArray(ei.corporateSpecific)
      ? { ...ei.corporateSpecific }
      : {};
  let individualSpecific =
    ei.individualSpecific &&
    typeof ei.individualSpecific === 'object' &&
    !Array.isArray(ei.individualSpecific)
      ? { ...ei.individualSpecific }
      : {};

  if (et === 'INDIVIDUAL') corporateSpecific = {};
  if (et === 'CORPORATE') individualSpecific = {};

  return {
    ...doc,
    entityInformation: {
      generalDetails: gd,
      corporateSpecific,
      individualSpecific,
    },
  };
}
