import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDb } from './config/db.js';
import mongoose from 'mongoose';
import { User } from './models/User.js';
import { ArtemisRecord, buildSearchText } from './models/ArtemisRecord.js';
import { AgentTriggerConfig } from './models/AgentTriggerConfig.js';

const MONTHS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

/** "10 APR 2028" or "20 JAN 1991" */
function parseDMY(s) {
  if (!s || typeof s !== 'string') return undefined;
  const m = s.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i);
  if (!m) return undefined;
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return undefined;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10));
}

/** "10 JUL 2025 11:05:37" */
function parseDMYTime(s) {
  if (!s || typeof s !== 'string') return undefined;
  const m = s
    .trim()
    .match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/i);
  if (!m) return undefined;
  const mon = MONTHS[m[2].toUpperCase()];
  if (mon === undefined) return undefined;
  const h = parseInt(m[4] || '0', 10);
  const min = parseInt(m[5] || '0', 10);
  const sec = parseInt(m[6] || '0', 10);
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), h, min, sec);
}

function splitByBy(line) {
  if (!line || typeof line !== 'string') return { datePart: '', officer: '' };
  const match = line.match(/^(.+?)\s+BY\s+(.+)$/i);
  if (!match) return { datePart: line.trim(), officer: '' };
  return { datePart: match[1].trim(), officer: match[2].trim() };
}

function yesFlag(v) {
  if (typeof v === 'boolean') return v;
  return typeof v === 'string' && /^yes$/i.test(v.trim());
}

function categoriesToArray(c) {
  if (Array.isArray(c)) return c.map(String);
  if (typeof c !== 'string') return [];
  return c
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function countriesToArray(c) {
  if (Array.isArray(c)) return c.map(String);
  if (typeof c !== 'string' || !c.trim()) return [];
  return [c.trim()];
}

function mapGeneral(g) {
  if (!g) return {};
  return {
    activeStatus: g.isActive ?? g.activeStatus,
    name: g.name,
    alias: g.alias || undefined,
    formerRegisteredName: g.formerRegisteredName || undefined,
    emailAddress: g.emailAddress || undefined,
    phoneNumber: g.phoneNumber || undefined,
    website: g.website || undefined,
    address: g.address || undefined,
    bankAccount: g.bankAccount || undefined,
    sourceOfFunds: g.sourceOfFunds || undefined,
    natureOfBusinessRelationship: g.natureOfBusinessRelationship || undefined,
    additionalInformation: g.additionalInformation || undefined,
    onboardingMode: g.onboardingMode || undefined,
    paymentMode: g.paymentMode || undefined,
    productServiceComplexity: g.productServiceComplexity || undefined,
  };
}

function mapIndividual(ind) {
  if (!ind) return undefined;
  const dob = ind.dateOfBirth ? parseDMY(ind.dateOfBirth) : undefined;
  const idIssued = ind.identityIssuedDate ? parseDMY(ind.identityIssuedDate) : undefined;
  const idExp = ind.identityExpiryDate ? parseDMY(ind.identityExpiryDate) : undefined;
  return {
    salutation: ind.salutation || undefined,
    gender: ind.gender || undefined,
    nationality: ind.nationality || undefined,
    countryOfResidence: ind.countryOfResidence || undefined,
    identificationType: ind.identificationType || undefined,
    identificationNumber: ind.identificationNumber || undefined,
    identityIssuedDate: idIssued,
    identityExpiryDate: idExp,
    countryOfBirth: ind.countryOfBirth || undefined,
    dateOfBirth: dob,
    industry: ind.industry || undefined,
    occupation: ind.occupation || undefined,
  };
}

function mapCorporate(corp) {
  if (!corp) return undefined;
  const inc = corp.dateOfIncorporation ? parseDMY(corp.dateOfIncorporation) : undefined;
  const incExp = corp.dateOfIncorporationExpiry ? parseDMY(corp.dateOfIncorporationExpiry) : undefined;
  let uhc = corp.ultimateHoldingCompanyRegulatedOrFATFListed;
  if (corp.isUltimateHoldingCompanyRegulatedOrListedInFATF !== undefined) {
    uhc = yesFlag(corp.isUltimateHoldingCompanyRegulatedOrListedInFATF);
  }
  return {
    incorporationStatus: corp.isIncorporated ?? corp.incorporationStatus,
    entityType: corp.entityType || undefined,
    ownershipStructureLayers: corp.ownershipStructureLayers ?? undefined,
    countryOfOperations: corp.countryOfOperations || undefined,
    countryOfIncorporation: corp.countryOfIncorporation || undefined,
    primaryBusinessActivity: corp.primaryBusinessActivity || undefined,
    incorporationNumber: corp.incorporationNumber || undefined,
    dateOfIncorporation: inc,
    dateOfIncorporationExpiry: incExp,
    imoNumber: corp.imoNumber || undefined,
    ultimateHoldingCompanyRegulatedOrFATFListed:
      typeof uhc === 'boolean' ? uhc : /^yes$/i.test(String(uhc || '')),
  };
}

function mapScreeningSummary(sum) {
  if (!sum) return {};
  const { datePart, officer } = splitByBy(sum.lastUpdated || '');
  const lastUpdated = datePart ? parseDMYTime(datePart) : undefined;
  return {
    pepFlag: yesFlag(sum.pep ?? sum.pepFlag),
    sanctionsFlag: yesFlag(sum.sanctions ?? sum.sanctionsFlag),
    adverseNewsFlag: yesFlag(sum.adverseNews ?? sum.adverseNewsFlag),
    ownRestrictedListFlag: yesFlag(sum.ownRestrictedList ?? sum.ownRestrictedListFlag),
    noHitFlag: yesFlag(sum.noHit ?? sum.noHitFlag),
    lastUpdated,
    officerName: officer || undefined,
  };
}

function mapMatchDetails(list) {
  if (!Array.isArray(list)) return [];
  return list.map((m) => ({
    sourceList: m.sourceList,
    matchedIndicator: m.matchedIndicator,
    matchedName: m.matchedName ?? m.name,
    categories: categoriesToArray(m.categories),
    countries: countriesToArray(m.countries),
    matchStrength: m.matchStrength,
    matchType: m.matchType || undefined,
    comments: m.comments || undefined,
  }));
}

function mapRisk(ra) {
  if (!ra) return undefined;
  const rc = ra.Risk_Categories || ra.riskCategories;
  if (!rc) {
    return {
      computedRiskRating: ra.computedRiskRating ?? ra.Computed_Risk_Rating,
      overrideRiskRating: ra.overrideRiskRating ?? ra.Override_Risk_Rating,
      totalRiskScorePercentage: ra.totalRiskScorePercentage ?? ra.Total_Risk_Score_Percentage,
    };
  }
  const cr = rc.Country_Risk || rc.countryRisk || {};
  const tr = rc.Tax_Risk || rc.taxRisk || {};
  const sr = rc.Screening_Risk || rc.screeningRisk || {};
  const str = rc.Structural_Risk || rc.structuralRisk || {};
  const op = rc.Operational_Risk || rc.operationalRisk || {};
  return {
    computedRiskRating: ra.Computed_Risk_Rating ?? ra.computedRiskRating,
    overrideRiskRating: ra.Override_Risk_Rating ?? ra.overrideRiskRating,
    totalRiskScorePercentage: ra.Total_Risk_Score_Percentage ?? ra.totalRiskScorePercentage,
    countryRisk: {
      cpiScore: cr.cpi_CorruptionPerceptionsIndex_Score ?? cr.cpiScore,
      fatfScore: cr.fatf_FinancialActionTaskForce_Score ?? cr.fatfScore,
      oecdScore: cr.oecd_Score ?? cr.oecdScore,
    },
    taxRisk: {
      fsiScore: tr.fsi_FinancialSecrecyIndex_Score ?? tr.fsiScore,
      fatcaScore: tr.fatca_Score ?? tr.fatcaScore,
    },
    screeningRisk: {
      pepSanctionsAdverseCombinedScore:
        sr.pep_Sanctions_AdverseNews_Score ?? sr.pepSanctionsAdverseCombinedScore,
    },
    structuralRisk: {
      industryScore: str.industry_Score ?? str.industryScore,
      entityTypeAndIndividualShareholdingScore:
        str.entityType_IndividualShareholding_Score ?? str.entityTypeAndIndividualShareholdingScore,
      occupationScore: str.occupation_Score ?? str.occupationScore,
      ownershipLayersScore: str.ownershipLayers_Score ?? str.ownershipLayersScore,
      onboardingModeScore: str.onboardingMode_Score ?? str.onboardingModeScore,
    },
    operationalRisk: {
      paymentModeScore: op.paymentMode_Score ?? op.paymentModeScore,
      productServiceComplexityScore: op.productServiceComplexity_Score ?? op.productServiceComplexityScore,
    },
  };
}

function mapApprovalHistory(ah) {
  if (!Array.isArray(ah)) return [];
  return ah.map((row) => {
    const raw = row.updated || row.timestamp || '';
    const { datePart, officer } = splitByBy(typeof raw === 'string' ? raw : '');
    const ts = datePart ? parseDMYTime(datePart) : undefined;
    return {
      computedRiskRating: row.computedRiskRating,
      overrideRiskRating: row.overrideRiskRating,
      riskScore: row.riskScore,
      approvalStatus: row.approvalStatus,
      timestamp: ts,
      approvingOfficerName: officer || undefined,
    };
  });
}

function mapModification(md) {
  if (!md) return undefined;
  const created = md.createdBy ? splitByBy(md.createdBy) : { datePart: '', officer: '' };
  const modified = md.lastModifiedBy ? splitByBy(md.lastModifiedBy) : { datePart: '', officer: '' };
  return {
    kycSubmissionTimestamp: md.submittedKycAt
      ? parseDMYTime(md.submittedKycAt)
      : md.kycSubmissionTimestamp,
    recordCreatedDate: created.datePart ? parseDMYTime(created.datePart) : undefined,
    recordCreatedBy: md.createdBy || undefined,
    lastModifiedDate: modified.datePart ? parseDMYTime(modified.datePart) : undefined,
    lastModifiedBy: md.lastModifiedBy || undefined,
  };
}

function fromLegacyPayload(row) {
  const md = row.Metadata || row.metadata;
  const ei = row.Entity_Information || row.entityInformation;
  const sc = row.Screening_And_Search_Conclusion || row.screeningAndSearchConclusion;
  const ra = row.Risk_Assessment || row.riskAssessment;
  const ah = row.Approval_History || row.approvalHistory;
  const mod = row.Modification_Details || row.modificationDetails;

  const gd = ei?.General_Details || ei?.generalDetails;
  const corpRaw = ei?.Corporate_Specific ?? ei?.corporateSpecific;
  const indRaw = ei?.Individual_Specific ?? ei?.individualSpecific;

  const entityType = md.entityType;
  const metadata = {
    entityType,
    caseId: md.caseId,
    customerId: md.customerId,
    caseStatus: md.caseStatus,
    approvalStatus: md.approvalStatus,
    riskRating: md.riskRating,
    nextPeriodicReviewCycleDate:
      parseDMY(md.nextPeriodicReviewCycle) || parseDMY(md.nextPeriodicReviewCycleDate),
  };

  const entityInformation = {
    generalDetails: mapGeneral(gd),
    corporateSpecific: entityType === 'CORPORATE' ? mapCorporate(corpRaw) : undefined,
    individualSpecific: entityType === 'INDIVIDUAL' ? mapIndividual(indRaw) : undefined,
  };

  const sum = sc?.Summary || sc?.summary;
  const matches = sc?.Match_Details || sc?.matchDetails;

  return {
    metadata,
    entityInformation,
    screeningAndSearchConclusion: {
      summary: mapScreeningSummary(sum),
      matchDetails: mapMatchDetails(matches || []),
    },
    riskAssessment: mapRisk(ra),
    approvalHistory: mapApprovalHistory(ah || []),
    modificationDetails: mapModification(mod),
  };
}

/** Source records (legacy-shaped JSON) */
const SEED_ARTEMIS = [
  {
    Metadata: {
      entityType: 'INDIVIDUAL',
      caseId: '910120085305',
      customerId: '910120085305',
      caseStatus: 'COMPLETED',
      approvalStatus: 'ACCEPTED',
      riskRating: 'LOW',
      nextPeriodicReviewCycle: '10 APR 2028',
    },
    Entity_Information: {
      General_Details: {
        isActive: 'YES',
        name: 'CHEAH WAN YEE',
        alias: '',
        formerRegisteredName: '',
        emailAddress: '',
        phoneNumber: '',
        website: '',
        address: '',
        bankAccount: '',
        sourceOfFunds: '',
        natureOfBusinessRelationship: '',
        additionalInformation: '',
        onboardingMode: 'FACE-TO-FACE',
        paymentMode: 'NOT APPLICABLE',
        productServiceComplexity: 'SIMPLE',
      },
      Corporate_Specific: null,
      Individual_Specific: {
        salutation: '',
        gender: 'MALE',
        nationality: 'MALAYSIA',
        countryOfResidence: 'MALAYSIA',
        identificationType: 'NATIONAL ID',
        identificationNumber: '910120085305',
        identityIssuedDate: '',
        identityExpiryDate: '',
        countryOfBirth: '',
        dateOfBirth: '20 JAN 1991',
        industry: 'NOT APPLICABLE - NOT APPLICABLE',
        occupation: 'COMPANY DIRECTOR/PARTNER',
      },
    },
    Screening_And_Search_Conclusion: {
      Summary: {
        pep: 'NO',
        sanctions: 'NO',
        adverseNews: 'NO',
        ownRestrictedList: 'NO',
        noHit: 'YES',
        lastUpdated: '10 JUL 2025 11:05:37 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
      },
      Match_Details: [],
    },
    Risk_Assessment: {
      Computed_Risk_Rating: 'LOW',
      Override_Risk_Rating: 'LOW',
      Total_Risk_Score_Percentage: 86.0,
      Risk_Categories: {
        Country_Risk: {
          cpi_CorruptionPerceptionsIndex_Score: 7.5,
          fatf_FinancialActionTaskForce_Score: 13.5,
          oecd_Score: 10.0,
        },
        Tax_Risk: {
          fsi_FinancialSecrecyIndex_Score: 0.83,
          fatca_Score: 2.5,
        },
        Screening_Risk: {
          pep_Sanctions_AdverseNews_Score: 30.0,
        },
        Structural_Risk: {
          industry_Score: 5.0,
          entityType_IndividualShareholding_Score: 0.0,
          occupation_Score: 1.67,
          ownershipLayers_Score: 0.0,
          onboardingMode_Score: 5.0,
        },
        Operational_Risk: {
          paymentMode_Score: 5.0,
          productServiceComplexity_Score: 5.0,
        },
      },
    },
    Approval_History: [
      {
        computedRiskRating: 'LOW',
        overrideRiskRating: 'LOW',
        riskScore: '86.00',
        approvalStatus: 'ACCEPTED',
        updated: '10 JUL 2025 11:08:03 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
      },
      {
        computedRiskRating: 'LOW',
        overrideRiskRating: 'LOW',
        riskScore: '86.00',
        approvalStatus: 'ACCEPTED',
        updated: '28 OCT 2024 14:36:15 BY MAU CHEE THAM',
      },
    ],
    Modification_Details: {
      submittedKycAt: '',
      createdBy: '28 OCT 2024 14:35:55 BY MAU CHEE THAM',
      lastModifiedBy: '10 JUL 2025 11:08:03 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
    },
  },
  {
    Metadata: {
      entityType: 'CORPORATE',
      caseId: '726795-M',
      customerId: '726795-M',
      caseStatus: 'COMPLETED',
      approvalStatus: 'ACCEPTED',
      riskRating: 'LOW',
      nextPeriodicReviewCycle: '14 APR 2028',
    },
    Entity_Information: {
      General_Details: {
        isActive: 'YES',
        name: 'MULTICARE PHARMACY (BAHAU) SDN. BHD.',
        alias: '',
        formerRegisteredName: '',
        emailAddress: '',
        phoneNumber: '',
        website: '',
        address: '',
        bankAccount: '',
        sourceOfFunds: '',
        natureOfBusinessRelationship: '',
        additionalInformation: '',
        onboardingMode: 'FACE-TO-FACE',
        paymentMode: 'UNKNOWN',
        productServiceComplexity: 'SIMPLE',
      },
      Corporate_Specific: {
        isIncorporated: 'YES',
        entityType: 'PRIVATE COMPANY LIMITED BY SHARES',
        ownershipStructureLayers: 'UNKNOWN',
        countryOfOperations: 'MALAYSIA',
        countryOfIncorporation: 'MALAYSIA',
        primaryBusinessActivity: 'OTHERS',
        incorporationNumber: '',
        dateOfIncorporation: '',
        dateOfIncorporationExpiry: '',
        imoNumber: '',
        isUltimateHoldingCompanyRegulatedOrListedInFATF: 'NO',
      },
      Individual_Specific: null,
    },
    Screening_And_Search_Conclusion: {
      Summary: {
        pep: 'NO',
        sanctions: 'NO',
        adverseNews: 'NO',
        ownRestrictedList: 'NO',
        noHit: 'YES',
        lastUpdated: '14 JUL 2025 17:49:10 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
      },
      Match_Details: [
        {
          sourceList: 'WORLD-CHECK',
          matchedIndicator: '☐',
          name: 'MULTICARE - SEGUROS DE SAUDE SA',
          categories: 'Regulatory Enforcement, PEP',
          countries: 'REGISTERED IN: PORTUGAL LOCATION: PORTUGAL',
          matchStrength: 'MEDIUM',
          matchType: '',
          comments: 'DIFFERENT NAME AND REGISTERED COUNTRY',
        },
        {
          sourceList: 'WORLD-CHECK',
          matchedIndicator: '☐',
          name: 'MULTICARTA',
          categories: 'Other Bodies, PEP, Sanctions',
          countries: 'RUSSIAN FEDERATION LOCATION: RUSSIAN FEDERATION',
          matchStrength: 'WEAK',
          matchType: '',
          comments: 'DIFFERENT NAME AND REGISTERED COUNTRY',
        },
      ],
    },
    Risk_Assessment: {
      Computed_Risk_Rating: 'LOW',
      Override_Risk_Rating: 'LOW',
      Total_Risk_Score_Percentage: 73.5,
      Risk_Categories: {
        Country_Risk: {
          cpi_CorruptionPerceptionsIndex_Score: 7.5,
          fatf_FinancialActionTaskForce_Score: 13.5,
          oecd_Score: 10.0,
        },
        Tax_Risk: {
          fsi_FinancialSecrecyIndex_Score: 0.83,
          fatca_Score: 2.5,
        },
        Screening_Risk: {
          pep_Sanctions_AdverseNews_Score: 25.0,
        },
        Structural_Risk: {
          industry_Score: 0.83,
          entityType_IndividualShareholding_Score: 3.33,
          occupation_Score: 0.0,
          ownershipLayers_Score: 0.0,
          onboardingMode_Score: 5.0,
        },
        Operational_Risk: {
          paymentMode_Score: 0.0,
          productServiceComplexity_Score: 5.0,
        },
      },
    },
    Approval_History: [
      {
        computedRiskRating: 'LOW',
        overrideRiskRating: 'LOW',
        riskScore: '73.50',
        approvalStatus: 'ACCEPTED',
        updated: '14 JUL 2025 17:49:15 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
      },
      {
        computedRiskRating: 'LOW',
        overrideRiskRating: 'LOW',
        riskScore: '73.50',
        approvalStatus: 'ACCEPTED',
        updated: '24 OCT 2024 17:09:11 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
      },
      {
        computedRiskRating: 'LOW',
        overrideRiskRating: 'LOW',
        riskScore: '73.05',
        approvalStatus: 'ACCEPTED',
        updated: '10 OCT 2023 09:10:42 BY AUDIT ARTEMIS 1',
      },
    ],
    Modification_Details: {
      submittedKycAt: '',
      createdBy: '10 OCT 2023 09:10:24 BY AUDIT ARTEMIS 1',
      lastModifiedBy: '14 JUL 2025 17:49:15 BY MUHAMMAD NUREMIR SYAFIQ BIN BAKRI',
    },
  },
];

const DEFAULT_EMAIL = 'user@artemis.com';
const DEFAULT_PASSWORD = 'user123';
const DEMO_EMAIL = 'phuupwint@demo.com';
const DEMO_PASSWORD = 'phuupwint123';

/**
 * Ensures the two demo accounts exist. Creates any missing user only; does not reset passwords for existing users.
 */
async function ensureDemoUsers() {
  let artemisUser = await User.findOne({ email: DEFAULT_EMAIL });
  if (!artemisUser) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    artemisUser = await User.create({
      email: DEFAULT_EMAIL,
      passwordHash,
      name: 'Default User',
      showRecordsTab: true,
    });
    console.log(`Created user: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`);
  } else {
    console.log(`User already exists (skipped): ${DEFAULT_EMAIL}`);
  }

  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) {
    const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    demoUser = await User.create({
      email: DEMO_EMAIL,
      passwordHash: demoHash,
      name: 'Phuu Pwint',
      showRecordsTab: false,
    });
    console.log(`Created user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (Records tab hidden)`);
  } else {
    console.log(`User already exists (skipped): ${DEMO_EMAIL}`);
  }

  return { artemisUser, demoUser };
}

async function seed() {
  await connectDb();

  const { artemisUser } = await ensureDemoUsers();

  /** Migrate legacy singleton AgentTriggerConfig _id "default" → per-user doc for user@artemis.com */
  try {
    const coll = mongoose.connection.db.collection('agenttriggerconfigs');
    const legacy = await coll.findOne({ _id: 'default' });
    if (legacy && artemisUser?._id) {
      await AgentTriggerConfig.findOneAndUpdate(
        { userId: artemisUser._id },
        {
          $set: {
            apiUrl: legacy.apiUrl ?? '',
            triggerToken: legacy.triggerToken ?? '',
            triggerMessage: legacy.triggerMessage ?? '',
          },
        },
        { upsert: true, new: true }
      );
      await coll.deleteOne({ _id: 'default' });
      console.log('Migrated legacy agent trigger config to user@artemis.com');
    }
  } catch (e) {
    console.warn('AgentTriggerConfig migration skipped:', e.message);
  }

  const caseIds = SEED_ARTEMIS.map((r) => r.Metadata.caseId);
  const removed = await ArtemisRecord.deleteMany({ 'metadata.caseId': { $in: caseIds } });
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} existing seed Artemis row(s) with same case IDs.`);

  for (const legacy of SEED_ARTEMIS) {
    const payload = fromLegacyPayload(legacy);
    const doc = new ArtemisRecord(payload);
    doc._searchText = buildSearchText(doc);
    await doc.save();
    console.log(`Artemis record created: ${payload.metadata.caseId} (${payload.metadata.entityType})`);
  }

  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
