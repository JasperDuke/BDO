import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000;

export function uploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads');
}

export function resultsDir(userId) {
  return path.join(uploadsRoot(), userId, 'results');
}

export function resultFilenamesForEvent(eventId) {
  const safe = String(eventId).replace(/[^\w.\-]+/g, '_');
  return {
    pdf: `${safe}.pdf`,
    xlsx: `${safe}.xlsx`,
  };
}

export function resultFilePaths(userId, eventId) {
  const dir = resultsDir(userId);
  const { pdf, xlsx } = resultFilenamesForEvent(eventId);
  return {
    pdfFilename: pdf,
    xlsxFilename: xlsx,
    pdfPath: path.join(dir, pdf),
    xlsxPath: path.join(dir, xlsx),
  };
}

export async function downloadResultFile(url, destPath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Empty response body');
    }

    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await pipeline(response.body, fs.createWriteStream(destPath));
  } finally {
    clearTimeout(timer);
  }
}

export async function deleteStoredResultFiles(userId, pdfFilename, xlsxFilename) {
  const dir = resultsDir(userId);
  const targets = [pdfFilename, xlsxFilename].filter(Boolean);

  await Promise.all(
    targets.map(async (name) => {
      const filePath = path.join(dir, name);
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }),
  );
}
