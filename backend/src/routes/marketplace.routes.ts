/**
 * Marketplace API Routes
 */

import express from "express";
import * as marketplaceService from "../services/marketplace.service";
import * as buyRequestService from "../services/buyRequest.service";

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

/**
 * POST /api/marketplace/inquiries
 * Create a new inquiry on a listing
 */
router.post("/inquiries", async (req, res) => {
  try {
    const { buyerAgentId, listingId, offerPrice, message, accountId, privateKey } = req.body;

    // Validation
    if (
      buyerAgentId === undefined || buyerAgentId === null ||
      listingId === undefined || listingId === null ||
      offerPrice === undefined || offerPrice === null ||
      !message ||
      !accountId ||
      !privateKey
    ) {
      return res.status(400).json({
        error: "Missing required fields: buyerAgentId, listingId, offerPrice, message, accountId, privateKey",
      });
    }

    const result = await marketplaceService.createInquiry({
      buyerAgentId,
      listingId,
      offerPrice: parseFloat(offerPrice),
      message,
      accountId,
      privateKey,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/marketplace/inquiries:", error);
    res.status(500).json({ error: error.message || "Failed to create inquiry" });
  }
});

/**
 * GET /api/marketplace/inquiries/:id
 * Get inquiry details
 */
router.get("/inquiries/:id", async (req, res) => {
  try {
    const inquiryId = parseInt(req.params.id);

    if (isNaN(inquiryId)) {
      return res.status(400).json({ error: "Invalid inquiry ID" });
    }

    const inquiry = await marketplaceService.getInquiry(inquiryId);
    res.json(inquiry);
  } catch (error: any) {
    console.error(`Error in GET /api/marketplace/inquiries/${req.params.id}:`, error);
    res.status(500).json({ error: error.message || "Failed to get inquiry" });
  }
});

/**
 * POST /api/marketplace/buy-requests
 * Create a new buy request (what buyer wants to purchase)
 */
router.post("/buy-requests", async (req, res) => {
  try {
    const { buyerAgentId, title, description, minPrice, maxPrice, category } = req.body;

    // Validation
    if (
      buyerAgentId === undefined || buyerAgentId === null ||
      !title ||
      !description ||
      minPrice === undefined || minPrice === null ||
      maxPrice === undefined || maxPrice === null
    ) {
      return res.status(400).json({
        error: "Missing required fields: buyerAgentId, title, description, minPrice, maxPrice",
      });
    }

    const result = await buyRequestService.createBuyRequest({
      buyerAgentId,
      title,
      description,
      minPrice: parseFloat(minPrice),
      maxPrice: parseFloat(maxPrice),
      category,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/marketplace/buy-requests:", error);
    res.status(500).json({ error: error.message || "Failed to create buy request" });
  }
});

/**
 * GET /api/marketplace/buy-requests/:id
 * Get buy request details
 */
router.get("/buy-requests/:id", async (req, res) => {
  try {
    const buyRequestId = req.params.id;

    const buyRequest = await buyRequestService.getBuyRequest(buyRequestId);
    res.json(buyRequest);
  } catch (error: any) {
    console.error(`Error in GET /api/marketplace/buy-requests/${req.params.id}:`, error);
    res.status(500).json({ error: error.message || "Failed to get buy request" });
  }
});

export default router;
