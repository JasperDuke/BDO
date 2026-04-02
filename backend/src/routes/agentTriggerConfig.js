import { Router } from "express";
import { requireAuth } from "../middleware/authJwt.js";
import { AgentTriggerConfig } from "../models/AgentTriggerConfig.js";

export const agentTriggerConfigRouter = Router();
agentTriggerConfigRouter.use(requireAuth);

function isValidHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function dtoFromDoc(doc) {
  if (!doc) {
    return {
      apiUrl: "",
      tokenConfigured: false,
      token: "",
      message: "",
      updatedAt: null,
    };
  }
  const token = doc.triggerToken != null ? String(doc.triggerToken).trim() : "";
  return {
    apiUrl: doc.apiUrl?.trim() || "",
    tokenConfigured: Boolean(token),
    token,
    message: doc.triggerMessage != null ? String(doc.triggerMessage) : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

agentTriggerConfigRouter.get("/", async (req, res) => {
  try {
    const doc = await AgentTriggerConfig.findOne({
      userId: req.user._id,
    }).lean();
    res.json(dtoFromDoc(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load trigger config" });
  }
});

agentTriggerConfigRouter.put("/", async (req, res) => {
  try {
    const apiUrl = String(req.body?.apiUrl ?? "").trim();
    const triggerTokenRaw = req.body?.triggerToken;
    const messageRaw = req.body?.message;
    const triggerMessage =
      typeof messageRaw === "string" ? messageRaw.trim() : "";

    if (!apiUrl) {
      return res.status(400).json({ message: "Endpoint URL is required" });
    }
    if (!isValidHttpUrl(apiUrl)) {
      return res
        .status(400)
        .json({ message: "Endpoint URL must be a valid http(s) URL" });
    }

    const $set = { apiUrl, triggerMessage };
    if (typeof triggerTokenRaw === "string" && triggerTokenRaw.trim() !== "") {
      $set.triggerToken = triggerTokenRaw.trim();
    }

    const doc = await AgentTriggerConfig.findOneAndUpdate(
      { userId: req.user._id },
      { $set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(dtoFromDoc(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save trigger config" });
  }
});
