
const express = require("express");

const {
  createClaim,
  getItemClaims,
  reviewClaim,
} = require("../controllers/claimController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Submit a claim for an item.
router.post("/:itemId", authMiddleware, createClaim);

// View claims for an item (listing owner only).
router.get("/:itemId", authMiddleware, getItemClaims);

// Approve or reject a claim (listing owner only).
router.patch("/:itemId/:claimId", authMiddleware, reviewClaim);

module.exports = router;
