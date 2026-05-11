import express from "express";
import fs from "fs";
import path from "path";

export const daveRouter = express.Router();

// The json files are located in the root of the BDO workspace
const assetDataPath = path.join(process.cwd(), "..", "asset_data.json");
const assetChangesPath = path.join(process.cwd(), "..", "asset_changes.json");

// POST /api/v2/assets/devices
daveRouter.post("/assets/devices", (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Missing payload. DAVE API requires a query payload." });
    }

    if (!req.body.query) {
      return res.status(400).json({ error: "Missing query parameter in payload." });
    }

    const data = fs.readFileSync(assetDataPath, "utf-8");
    let parsedData = JSON.parse(data);

    // Extract custom_site_id from the AQL query string
    // e.g. "adapters_data.gui.custom_site_id" == "RYN0615"
    const siteIdMatch = req.body.query.match(/custom_site_id\\?"\s*==\s*\\?"([^\\"]+)\\?"/);
    if (siteIdMatch && siteIdMatch[1]) {
      const stationId = siteIdMatch[1];
      parsedData.assets = parsedData.assets.filter(
        (asset) => asset["adapters_data.gui.custom_site_id"] === stationId
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
    res.status(500).json({ message: "Internal server error reading mock data" });
  }
});

// POST /api/v2/assets/devices/asset_investigation/:internal_axon_id
daveRouter.post("/assets/devices/asset_investigation/:internal_axon_id", (req, res) => {
  try {
    const { internal_axon_id } = req.params;
    const data = fs.readFileSync(assetChangesPath, "utf-8");
    let parsedData = JSON.parse(data);

    // Filter investigation fields by the asset ID in the path
    if (parsedData.investigation_fields) {
      parsedData.investigation_fields = parsedData.investigation_fields.filter(
        (field) => field.asset_id === internal_axon_id
      );
    }

    res.json(parsedData);
  } catch (error) {
    console.error("Error reading asset_changes.json:", error);
    res.status(500).json({ message: "Internal server error reading mock data" });
  }
});
