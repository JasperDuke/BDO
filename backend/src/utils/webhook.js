import axios from "axios";
import path from "node:path";
import crypto from "node:crypto";
import { AgentTriggerConfig, AGENT_TRIGGER_CONFIG_ID } from "../models/AgentTriggerConfig.js";

/**
 * Resolve webhook URL + token: integrated DB config first (both required), else env fallback.
 */
async function resolveTriggerCredentials() {
  try {
    const doc = await AgentTriggerConfig.findById(AGENT_TRIGGER_CONFIG_ID)
      .select("apiUrl triggerToken")
      .lean();
    const apiUrl = doc?.apiUrl?.trim();
    const triggerToken = doc?.triggerToken?.trim();
    if (apiUrl && triggerToken) {
      if (process.env.NODE_ENV === "development") {
        console.log("[webhook] Using Temporal Trigger config from database");
      }
      return { apiUrl, triggerToken, source: "database" };
    }
  } catch (err) {
    console.warn("[webhook] Could not read AgentTriggerConfig:", err.message);
  }

  const apiUrl = process.env.AGENT_API_URL?.trim();
  const triggerToken = process.env.AGENT_TRIGGER_TOKEN?.trim();
  if (apiUrl && triggerToken) {
    console.log(
      "[webhook] Using fallback AGENT_API_URL / AGENT_TRIGGER_TOKEN from process.env",
    );
    return { apiUrl, triggerToken, source: "env" };
  }

  return null;
}

/**
 * Trigger the Atenxion agent webhook after a user uploads screening files.
 * Uses dashboard “Temporal Trigger Setup” (DB) when both URL and token are set; otherwise env vars.
 *
 * @param {Object} params
 * @param {string} params.notificationEmail - Result notification email
 * @param {string[]} params.attachmentFilePaths - Absolute paths from multer (saved under public/uploads)
 */
export async function triggerAgentOnProposalSubmit({
  notificationEmail,
  attachmentFilePaths,
}) {
  const resolved = await resolveTriggerCredentials();

  if (!resolved) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[webhook] No trigger URL/token in database or env — skipping agent trigger",
      );
    }
    return;
  }

  const { apiUrl, triggerToken } = resolved;

  const eventId = `demoaml_event_${crypto.randomUUID()}`;

  const baseUrl = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  const filenames = attachmentFilePaths.map((f) => path.basename(f));
  const attachmentUrls = filenames.map(
    (filename) => `${baseUrl}/uploads/${filename}`,
  );
  console.log("[webhook] Attachment URLs", attachmentUrls);

  const payload = {
    event_id: eventId,
    email: notificationEmail,
    attachments: attachmentUrls,
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
