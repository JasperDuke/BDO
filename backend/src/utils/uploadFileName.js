/** Document-type tokens required in uploaded file names (at least one). */
export const ALLOWED_UPLOAD_NAME_TOKENS = ["SSM", "AF", "AR", "KYC", "AFS"];

const ALLOWED_NAME_PATTERNS = [
  /\bSSM/i,
  /\bKYC/i,
  /\bAFS/i,
  /\bAF\b/i,
  /\bAR\b/i,
];

export function uploadFileNameValidationMessage() {
  return `File name must include one of: ${ALLOWED_UPLOAD_NAME_TOKENS.join(", ")}.`;
}

/** True when the original client filename contains a required document-type token. */
export function isAllowedUploadFileName(originalName) {
  const name = String(originalName ?? "").trim();
  if (!name) return false;
  return ALLOWED_NAME_PATTERNS.some((pattern) => pattern.test(name));
}
