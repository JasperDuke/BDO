import axios from "axios";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Trigger the Atenxion agent webhook after a user uploads screening files.
 * Sends only when AGENT_API_URL and AGENT_TRIGGER_TOKEN are set.
 *
 * @param {Object} params
 * @param {string} params.notificationEmail - Result notification email
 * @param {string[]} params.attachmentFilePaths - Absolute paths from multer (saved under public/uploads)
 */
export async function triggerAgentOnProposalSubmit({
  notificationEmail,
  attachmentFilePaths,
}) {
  const apiUrl = process.env.AGENT_API_URL;
  const triggerToken = process.env.AGENT_TRIGGER_TOKEN;

  if (!apiUrl || !triggerToken) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[webhook] AGENT_API_URL or AGENT_TRIGGER_TOKEN missing – skipping agent trigger",
      );
    }
    return;
  }

  const eventId = `demoaml_event_${crypto.randomUUID()}`;

  const baseUrl = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  const filenames = attachmentFilePaths.map((f) => path.basename(f));
  const attachmentUrls = filenames.map(
    (filename) => `${baseUrl}/uploads/${filename}`,
  );
  console.log("Urls", attachmentUrls);
  const attachments = attachmentUrls;

  const payload = {
    event_id: eventId,
    email: notificationEmail,
    attachments,
    message:
      "What is this file about? Please analyze the data and extract the main keyword data.",
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: triggerToken,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[webhook] Agent triggered successfully:",
        eventId,
        response.data,
      );
    }
    return response.data;
  } catch (err) {
    console.error(
      "[webhook] Failed to trigger agent:",
      err.response?.data || err.message,
    );
    throw err;
  }
}
