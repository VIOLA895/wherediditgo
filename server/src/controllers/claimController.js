
const prisma = require("../utils/prisma");

// Submit a claim for a lost or found item
const createClaim = async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log("Content-Type:", req.headers["content-type"]);
console.log("Received body:", req.body);

    // Safely read the request body
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a message explaining your claim.",
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Your claim message must be at least 10 characters long.",
      });
    }

    // Find the item being claimed
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        title: true,
        type: true,
        userId: true,
        status: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item listing not found.",
      });
    }

    // Prevent users from claiming their own listings
    if (item.userId === req.userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot claim your own listing.",
      });
    }

    // Only open listings can receive claims
    if (item.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: "This listing is no longer open for claims.",
      });
    }

    // Create the claim
    const claim = await prisma.claim.create({
      data: {
        message: message.trim(),
        itemId: item.id,
        claimantId: req.userId,
      },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
          },
        },
        item: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Claim submitted successfully.",
      claim,
    });
  } catch (error) {
    // Prevent duplicate claims for the same item
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a claim for this listing.",
      });
    }

    console.error("Create claim error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit claim.",
    });
  }
};

// Get claims submitted for an item (listing owner only)
const getItemClaims = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item listing not found.",
      });
    }

    if (item.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the listing owner can view its claims.",
      });
    }

    const claims = await prisma.claim.findMany({
      where: { itemId },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: claims.length,
      claims,
    });
  } catch (error) {
    console.error("Get item claims error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve claims.",
    });
  }
};

const reviewClaim = async (req, res) => {
  try {
    const { itemId, claimId } = req.params;
    const { status } = req.body || {};

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id: claimId },
        include: {
          item: {
            select: {
              id: true,
              title: true,
              userId: true,
              status: true,
            },
          },
        },
      });

      if (!claim || claim.itemId !== itemId) {
        return {
          error: true,
          statusCode: 404,
          message: "Claim not found for this listing.",
        };
      }

      // Only the listing owner can review claims.
      if (claim.item.userId !== req.userId) {
        return {
          error: true,
          statusCode: 403,
          message: "Only the listing owner can review claims.",
        };
      }

      if (claim.status !== "PENDING") {
        return {
          error: true,
          statusCode: 409,
          message: "This claim has already been reviewed.",
        };
      }

      if (status === "APPROVED" && claim.item.status !== "OPEN") {
        return {
          error: true,
          statusCode: 409,
          message: "This item is no longer open for claims.",
        };
      }

      // Update the selected claim.
      const updatedClaim = await tx.claim.update({
        where: { id: claimId },
        data: { status },
        include: {
          claimant: {
            select: { id: true, name: true },
          },
          item: {
            select: { id: true, title: true, type: true, status: true },
          },
        },
      });

      if (status === "APPROVED") {
        // Mark the item as claimed.
        await tx.item.update({
          where: { id: itemId },
          data: { status: "CLAIMED" },
        });

        // Reject other pending claims for the same item.
        await tx.claim.updateMany({
          where: {
            itemId,
            id: { not: claimId },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });
      }

      return { claim: updatedClaim };
    });

    if (result.error) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Claim ${status.toLowerCase()} successfully.`,
      claim: result.claim,
    });
  } catch (error) {
    console.error("Review claim error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to review claim.",
    });
  }
};

module.exports = {
  createClaim,
  getItemClaims,
  reviewClaim,
};
