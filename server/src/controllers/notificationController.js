
const prisma = require("../utils/prisma");

const getNotifications = async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        readAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notifications.",
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        readAt: true,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    if (notification.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot modify another user's notification.",
      });
    }

    const updatedNotification = notification.readAt
      ? notification
      : await prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
        });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: "Unread notifications marked as read.",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
