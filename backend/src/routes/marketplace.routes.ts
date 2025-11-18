/**
 * Marketplace API Routes
 */

import express from "express";
import * as marketplaceService from "../services/marketplace.service";

const router = express.Router();

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post("/listings", async (req, res) => {
  try {
    const { sellerAgentId, title, description, basePrice, expectedPrice, accountId, privateKey } = req.body;

    // Validation - use explicit undefined/null checks for numeric fields that can be 0
    if (
      sellerAgentId === undefined || sellerAgentId === null ||
      !title ||
      !description ||
      basePrice === undefined || basePrice === null ||
      expectedPrice === undefined || expectedPrice === null ||
      !accountId ||
      !privateKey
    ) {
      return res.status(400).json({
        error: "Missing required fields: sellerAgentId, title, description, basePrice, expectedPrice, accountId, privateKey",
      });
    }

    const result = await marketplaceService.createListing({
      sellerAgentId,
      title,
      description,
      basePrice: parseFloat(basePrice),
      expectedPrice: parseFloat(expectedPrice),
      accountId,
      privateKey,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/marketplace/listings:", error);
    res.status(500).json({ error: error.message || "Failed to create listing" });
  }
});

/**
 * GET /api/marketplace/listings/:id
 * Get listing details
 */
router.get("/listings/:id", async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);

    if (isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const listing = await marketplaceService.getListing(listingId);
    res.json(listing);
  } catch (error: any) {
    console.error(`Error in GET /api/marketplace/listings/${req.params.id}:`, error);
    res.status(500).json({ error: error.message || "Failed to get listing" });
  }
});

export default router;
