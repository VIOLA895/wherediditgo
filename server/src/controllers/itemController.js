
const prisma = require("../utils/prisma");

const createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      dateOccurred,
      imageUrl,
      contactInfo,
    } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !location?.trim() ||
      !["LOST", "FOUND"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, description, location, and a valid type (LOST or FOUND) are required.",
      });
    }

    const validCategories = [
      "ELECTRONICS",
      "CLOTHING",
      "BAGS",
      "DOCUMENTS",
      "JEWELRY",
      "KEYS",
      "PETS",
      "BOOKS",
      "ACCESSORIES",
      "OTHER",
    ];

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item category.",
      });
    }

    if (dateOccurred && Number.isNaN(Date.parse(dateOccurred))) {
      return res.status(400).json({
        success: false,
        message: "dateOccurred must be a valid date.",
      });
    }

    const item = await prisma.item.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        type,
        category: category || "OTHER",
        location: location.trim(),
        dateOccurred: dateOccurred ? new Date(dateOccurred) : null,
        imageUrl: imageUrl || null,
        contactInfo: contactInfo || null,
        userId: req.userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Item listing created successfully.",
      item,
    });
  } catch (error) {
    console.error("Create item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create item listing.",
    });
  }
};

const getItems = async (req, res) => {
  try {
    const { type, category, status, location, search } = req.query;

    const validTypes = ["LOST", "FOUND"];
    const validStatuses = ["OPEN", "CLAIMED", "RESOLVED"];
    const validCategories = [
      "ELECTRONICS",
      "CLOTHING",
      "BAGS",
      "DOCUMENTS",
      "JEWELRY",
      "KEYS",
      "PETS",
      "BOOKS",
      "ACCESSORIES",
      "OTHER",
    ];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type filter.",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter.",
      });
    }

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category filter.",
      });
    }

    const where = {
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(location && {
        location: { contains: location, mode: "insensitive" },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get items error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve item listings.",
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item listing not found.",
      });
    }

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    console.error("Get item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve item listing.",
    });
  }
};


const updateItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      dateOccurred,
      imageUrl,
      contactInfo,
      status,
    } = req.body;

    const existingItem = await prisma.item.findUnique({
      where: { id: req.params.id },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item listing not found.",
      });
    }

    if (existingItem.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own listings.",
      });
    }

    const validTypes = ["LOST", "FOUND"];
    const validCategories = [
      "ELECTRONICS", "CLOTHING", "BAGS", "DOCUMENTS", "JEWELRY",
      "KEYS", "PETS", "BOOKS", "ACCESSORIES", "OTHER",
    ];
    const validStatuses = ["OPEN", "CLAIMED", "RESOLVED"];

    if (type !== undefined && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type.",
      });
    }

    if (category !== undefined && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item category.",
      });
    }

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item status.",
      });
    }

    if (
      (title !== undefined && !title.trim()) ||
      (description !== undefined && !description.trim()) ||
      (location !== undefined && !location.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and location cannot be empty.",
      });
    }

    if (
      dateOccurred !== undefined &&
      dateOccurred !== null &&
      Number.isNaN(Date.parse(dateOccurred))
    ) {
      return res.status(400).json({
        success: false,
        message: "dateOccurred must be a valid date.",
      });
    }

    const data = {};

    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (type !== undefined) data.type = type;
    if (category !== undefined) data.category = category;
    if (location !== undefined) data.location = location.trim();
    if (status !== undefined) data.status = status;
    if (dateOccurred !== undefined) {
      data.dateOccurred = dateOccurred ? new Date(dateOccurred) : null;
    }
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (contactInfo !== undefined) data.contactInfo = contactInfo || null;

    const item = await prisma.item.update({
      where: { id: req.params.id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Item listing updated successfully.",
      item,
    });
  } catch (error) {
    console.error("Update item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update item listing.",
    });
  }
};

const deleteItem = async (req, res) => {
  try {
    const existingItem = await prisma.item.findUnique({
      where: { id: req.params.id },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item listing not found.",
      });
    }

    if (existingItem.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own listings.",
      });
    }

    await prisma.item.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({
      success: true,
      message: "Item listing deleted successfully.",
    });
  } catch (error) {
    console.error("Delete item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete item listing.",
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
};
