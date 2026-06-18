/**
 * Upload filename rules (by file type):
 * - Excel (.xlsx): must include KYC
 * - PDF (.pdf, .md): must include one of AR, AF, AFS, SSM (short or long form)
 */

import path from "node:path";

/** @typedef {"pdf" | "excel"} UploadFileKind */

export const EXCEL_REQUIRED_TOKEN = "KYC";

/** Short codes + accepted long-form phrases for PDF uploads. */
export const PDF_DOCUMENT_TYPES = [
  { code: "AR", longForms: ["annual return"] },
  { code: "AF", longForms: [] },
  {
    code: "AFS",
    longForms: ["audited financial statements", "audited financial statement"],
  },
  {
    code: "SSM",
    longForms: [
      "suruhanjaya syarikat malaysia",
      "companies commission of malaysia",
    ],
  },
];

/** Match a token delimited by non-letters only (underscores/hyphens/spaces are OK). */
function alphaBoundedTokenPattern(token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i");
}

const EXCEL_NAME_PATTERN = alphaBoundedTokenPattern(EXCEL_REQUIRED_TOKEN);

/** Match multi-word long forms with space, hyphen, or underscore separators. */
function longFormPhrasePattern(...words) {
  const separator = "[-\\s_]+";
  const body = words
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(separator);
  return new RegExp(body, "i");
}

function shortCodePattern(code) {
  return alphaBoundedTokenPattern(code);
}

function buildPdfNamePatterns() {
  const patterns = [];
  for (const { code, longForms } of PDF_DOCUMENT_TYPES) {
    patterns.push(shortCodePattern(code));
    for (const phrase of longForms) {
      patterns.push(longFormPhrasePattern(...phrase.split(/\s+/)));
    }
  }
  return patterns;
}

const PDF_NAME_PATTERNS = buildPdfNamePatterns();

/**
 * @param {string} originalName
 * @param {string} [mimetype]
 * @returns {UploadFileKind | null}
 */
export function getUploadFileKind(originalName, mimetype = "") {
  const ext = path.extname(String(originalName || "")).toLowerCase();

  if (
    ext === ".xlsx" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "excel";
  }

  if (
    ext === ".pdf" ||
    ext === ".md" ||
    mimetype === "application/pdf" ||
    mimetype === "text/markdown"
  ) {
    return "pdf";
  }

  return null;
}

export function excelUploadFileNameValidationMessage() {
  return `Excel file name must include ${EXCEL_REQUIRED_TOKEN}.`;
}

function formatPdfTypeHint({ code, longForms }) {
  if (!longForms.length) return code;
  return `${code} (${longForms.join(" / ")})`;
}

export function pdfUploadFileNameValidationMessage() {
  const hints = PDF_DOCUMENT_TYPES.map(formatPdfTypeHint);
  return `PDF file name must include one of: ${hints.join(", ")}.`;
}

/** @param {UploadFileKind} kind */
export function uploadFileNameValidationMessage(kind) {
  return kind === "excel"
    ? excelUploadFileNameValidationMessage()
    : pdfUploadFileNameValidationMessage();
}

export function isAllowedExcelUploadFileName(originalName) {
  const name = String(originalName ?? "").trim();
  if (!name) return false;
  return EXCEL_NAME_PATTERN.test(name);
}

export function isAllowedPdfUploadFileName(originalName) {
  const name = String(originalName ?? "").trim();
  if (!name) return false;
  return PDF_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * @param {string} originalName
 * @param {UploadFileKind} kind
 */
export function isAllowedUploadFileName(originalName, kind) {
  if (kind === "excel") return isAllowedExcelUploadFileName(originalName);
  if (kind === "pdf") return isAllowedPdfUploadFileName(originalName);
  return false;
}
