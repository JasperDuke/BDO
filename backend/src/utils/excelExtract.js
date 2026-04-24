import path from "node:path";
import XLSX from "xlsx";

/**
 * @param {Express.Multer.File} file
 */
export function isXlsxFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  return (
    ext === ".xlsx" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * @param {Express.Multer.File} file
 */
export function isPdfFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  return ext === ".pdf" || file.mimetype === "application/pdf";
}

/**
 * @param {Express.Multer.File} file
 */
export function isMdFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  return ext === ".md" || file.mimetype === "text/markdown";
}

/**
 * Read one .xlsx from disk: every sheet → array of row objects (first row = headers).
 * Sheet names are used as keys on the returned object.
 *
 * @param {string} absPath
 * @returns {Record<string, Array<Record<string, unknown>>>}
 */
export function extractXlsxAllSheets(absPath) {
  const workbook = XLSX.readFile(absPath, {
    type: "file",
    cellDates: true,
    cellNF: false,
    cellText: false,
  });
  const out = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
      blankrows: false,
    });
    out[sheetName] = rows;
  }
  return out;
}
