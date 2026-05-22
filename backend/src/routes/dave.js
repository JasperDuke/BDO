import express from "express";
import fs from "fs";
import path from "path";

export const daveRouter = express.Router();

// The json files are located in the root of the BDO workspace
const assetDataPath = path.join(process.cwd(), "..", "asset_data.json");
const assetChangesPath = path.join(process.cwd(), "..", "asset_changes.json");
const ryb1240AssetDataPath = path.join(
  process.cwd(),
  "..",
  "RYB1240_asset_data.json",
);
const ryb1240AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "RYB1240_asset_changes.json",
);
const ryb1241AssetDataPath = path.join(
  process.cwd(),
  "..",
  "RYB1241_asset_data.json",
);
const ryb1241AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "RYB1241_asset_changes.json",
);
const ryj0116AssetDataPath = path.join(
  process.cwd(),
  "..",
  "RYJ0116_asset_data.json",
);
const ryj0116AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "RYJ0116_asset_changes.json",
);
const ryn0689AssetDataPath = path.join(
  process.cwd(),
  "..",
  "RYN0689_asset_data.json",
);
const ryn0689AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "RYN0689_asset_changes.json",
);
const rys1016AssetDataPath = path.join(
  process.cwd(),
  "..",
  "RYS1016_asset_data.json",
);
const rys1016AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "RYS1016_asset_changes.json",
);
const _2111AssetDataPath = path.join(
  process.cwd(),
  "..",
  "2111_asset_data.json",
);
const _2111AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "2111_asset_changes.json",
);
const _1116AssetDataPath = path.join(
  process.cwd(),
  "..",
  "1116_asset_data.json",
);
const _1116AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "1116_asset_changes.json",
);
const _1204AssetDataPath = path.join(
  process.cwd(),
  "..",
  "1204_asset_data.json",
);
const _1204AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "1204_asset_changes.json",
);
const _1458AssetDataPath = path.join(
  process.cwd(),
  "..",
  "1458_asset_data.json",
);
const _1458AssetChangesPath = path.join(
  process.cwd(),
  "..",
  "1458_asset_changes.json",
);
const getAssetJsonPath = (siteId, type) => {
  const normalizedSiteId = (siteId || "").toUpperCase();

  switch (normalizedSiteId) {
    case "RYB1240":
      return type === "changes"
        ? ryb1240AssetChangesPath
        : ryb1240AssetDataPath;
    case "RYB1241":
      return type === "changes"
        ? ryb1241AssetChangesPath
        : ryb1241AssetDataPath;
    case "RYJ0116":
      return type === "changes"
        ? ryj0116AssetChangesPath
        : ryj0116AssetDataPath;
    case "RYN0689":
      return type === "changes"
        ? ryn0689AssetChangesPath
        : ryn0689AssetDataPath;
    case "RYS1016":
      return type === "changes"
        ? rys1016AssetChangesPath
        : rys1016AssetDataPath;
    case "2111":
      return type === "changes" ? _2111AssetChangesPath : _2111AssetDataPath;
    case "1116":
      return type === "changes" ? _1116AssetChangesPath : _1116AssetDataPath;
    case "1204":
      return type === "changes" ? _1204AssetChangesPath : _1204AssetDataPath;
    case "1458":
      return type === "changes" ? _1458AssetChangesPath : _1458AssetDataPath;
    default:
      return type === "changes" ? assetChangesPath : assetDataPath;
  }
};

const extractCustomSiteId = (query = "") => {
  if (typeof query !== "string") return null;

  // Supports both:
  // "adapters_data.gui.custom_site_id" == "RYB1240"
  // \"adapters_data.gui.custom_site_id\" == \"RYB1240\"
  const match =
    query.match(/custom_site_id"\s*==\s*"([^"]+)"/) ||
    query.match(/custom_site_id\\+"\s*==\s*\\+"([^\\"]+)/);

  return match?.[1] || null;
};

// Middleware to enforce fixed API Key and Secret
daveRouter.use((req, res, next) => {
  const apiKey = req.headers["api-key"];
  const apiSecret = req.headers["api-secret"];

  if (
    apiKey !== "Qiszsuyl2xgAW_y9ahg5cwXm2pWb7NHKHsgvGJ7SIsU" ||
    apiSecret !== "Xdh_3Oq6-iQM2aBHpXKtSY_lqB69b9wMbTZ_rfoEXas"
  ) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or missing API Key/Secret" });
  }

  next();
});

// POST /api/v2/assets/devices
daveRouter.post("/assets/devices", (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: "Missing payload. DAVE API requires a query payload." });
    }

    if (!req.body.query) {
      return res
        .status(400)
        .json({ error: "Missing query parameter in payload." });
    }

    // Extract custom_site_id from the AQL query string
    // e.g. "adapters_data.gui.custom_site_id" == "RYN0615"
    const stationId = extractCustomSiteId(req.body.query);
    const selectedAssetDataPath = getAssetJsonPath(stationId, "data");

    const data = fs.readFileSync(selectedAssetDataPath, "utf-8");
    let parsedData = JSON.parse(data);

    if (stationId) {
      parsedData.assets = parsedData.assets.filter(
        (asset) => asset["adapters_data.gui.custom_site_id"] === stationId,
      );
    } else {
      // If no custom_site_id is specified in the query, return empty or all?
      // For safety in this mock, if they pass a query without site id, we'll just return what we have.
    }

    // Handle pagination limit
    const limit = req.body.page?.limit;
    if (limit && limit > 0) {
      parsedData.assets = parsedData.assets.slice(0, limit);
    }

    res.json(parsedData);
  } catch (error) {
    console.error("Error reading asset_data.json:", error);
    res
      .status(500)
      .json({ message: "Internal server error reading mock data" });
  }
});

// POST /api/v2/assets/devices/asset_investigation/:internal_axon_id
daveRouter.post(
  "/assets/devices/asset_investigation/:internal_axon_id",
  (req, res) => {
    try {
      const customSiteIdFromBody = req.body?.custom_site_id;
      const stationId =
        customSiteIdFromBody || extractCustomSiteId(req.body?.query);
      const selectedAssetChangesPath = getAssetJsonPath(stationId, "changes");

      const { internal_axon_id } = req.params;
      const data = fs.readFileSync(selectedAssetChangesPath, "utf-8");
      let parsedData = JSON.parse(data);

      // Filter investigation fields by the asset ID in the path
      if (parsedData.investigation_fields) {
        parsedData.investigation_fields =
          parsedData.investigation_fields.filter(
            (field) => field.asset_id === internal_axon_id,
          );
      }

      res.json(parsedData);
    } catch (error) {
      console.error("Error reading asset_changes.json:", error);
      res
        .status(500)
        .json({ message: "Internal server error reading mock data" });
    }
  },
);
