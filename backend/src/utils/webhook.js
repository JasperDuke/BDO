import axios from "axios";
import path from "node:path";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { AgentTriggerConfig } from "../models/AgentTriggerConfig.js";
import { DEFAULT_AGENT_TRIGGER_MESSAGE } from "./agentTriggerDefaults.js";

/**
 * Load URL, token, and message for this uploader: DB per userId first; message prefers DB, then env, then default.
 */
async function resolveTriggerConfig(userId) {
  let doc;
  try {
    const uid =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    doc = await AgentTriggerConfig.findOne({ userId: uid })
      .select("apiUrl triggerToken triggerMessage")
      .lean();
  } catch (err) {
    console.warn("[webhook] Could not read AgentTriggerConfig:", err.message);
    doc = null;
  }

  const dbMessage =
    doc?.triggerMessage != null ? String(doc.triggerMessage).trim() : "";
  const message =
    dbMessage ||
    process.env.AGENT_TRIGGER_MESSAGE?.trim() ||
    DEFAULT_AGENT_TRIGGER_MESSAGE;

  const apiUrlDb = doc?.apiUrl?.trim();
  const tokenDb = doc?.triggerToken?.trim();
  if (apiUrlDb && tokenDb) {
    if (process.env.NODE_ENV === "development") {
      console.log("[webhook] Using Temporal Trigger config from database");
    }
    return {
      apiUrl: apiUrlDb,
      triggerToken: tokenDb,
      message,
      source: "database",
    };
  }

  const apiUrl = process.env.AGENT_API_URL?.trim();
  const triggerToken = process.env.AGENT_TRIGGER_TOKEN?.trim();
  if (apiUrl && triggerToken) {
    console.log(
      "[webhook] Using fallback AGENT_API_URL / AGENT_TRIGGER_TOKEN from process.env",
    );
    return { apiUrl, triggerToken, message, source: "env" };
  }

  return null;
}

/**
 * Trigger the Atenxion agent webhook after a user uploads screening files.
 *
 * @param {Object} params
 * @param {string} params.notificationEmail - Result notification email
 * @param {string[]} params.attachmentFilePaths - Absolute paths for webhook `attachments` URLs: all files if Records tab off; PDF and MD-only if Records tab on (xlsx sent only via extractedExcelData)
 * @param {string} params.userId - Upload owner id (for public attachment URLs)
 * @param {Array<{ originalFileName: string, sheets?: Record<string, unknown[]>, error?: string }>} [params.extractedExcelData] - One entry per .xlsx when Records on: `sheets` maps tab name → row objects; `originalFileName` is the upload’s real client filename
 */
export async function triggerAgentOnProposalSubmit({
  notificationEmail,
  attachmentFilePaths,
  userId,
  extractedExcelData,
}) {
  const resolved = await resolveTriggerConfig(userId);

  if (!resolved) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[webhook] No trigger URL/token in database or env — skipping agent trigger",
      );
    }
    return;
  }

  const { apiUrl, triggerToken, message } = resolved;

  const eventId = `demoaml_event_${crypto.randomUUID()}`;

  const baseUrl = (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  const filenames = attachmentFilePaths.map((f) => path.basename(f));
  const attachmentUrls = filenames.map(
    (filename) => `${baseUrl}/uploads/${userId}/${filename}`,
  );
  console.log("[webhook] Attachment URLs", attachmentUrls);

  const payload = {
    event_id: eventId,
    email: notificationEmail,
    attachments: attachmentUrls,
    message,
  };
  if (Array.isArray(extractedExcelData) && extractedExcelData.length > 0) {
    payload.extractedExcelData = extractedExcelData;
  }
  console.log(extractedExcelData);
  const timeoutMs = extractedExcelData?.length > 0 ? 120000 : 10000;

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: triggerToken,
        "Content-Type": "application/json",
      },
      timeout: timeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
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
