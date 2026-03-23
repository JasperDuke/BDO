import axios from 'axios';

export async function postUploadWebhook(payload) {
  const url = process.env.WEBHOOK_URL;
  if (!url) {
    return { skipped: true, reason: 'WEBHOOK_URL not set' };
  }
  try {
    await axios.post(url, payload, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
