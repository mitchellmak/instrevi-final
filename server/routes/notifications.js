const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

const REQUEST_TYPES = ['friend_request', 'friend_request_accepted'];
const MENTION_TYPES = ['mention', 'tag'];
const VALID_FILTERS = ['all', 'requests', 'mentions', 'activity'];

const getFilterValue = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'all';
  return VALID_FILTERS.includes(normalized) ? normalized : 'all';
};

const getTypeFilterQuery = (filter) => {
  if (filter === 'requests') {
    return { type: { $in: REQUEST_TYPES } };
  }

  if (filter === 'mentions') {
    return { type: { $in: MENTION_TYPES } };
  }

  if (filter === 'activity') {
    return {
      type: {
        $nin: [...REQUEST_TYPES, ...MENTION_TYPES]
      }
    };
  }

  return {};
};

router.get('/', auth, async (req, res) => {
  try {
    const pageRaw = Number.parseInt(String(req.query.page || '1'), 10);
    const limitRaw = Number.parseInt(String(req.query.limit || '20'), 10);
    const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const filter = getFilterValue(req.query.filter);
    const query = {
      recipient: req.user.userId,
      ...getTypeFilterQuery(filter)
    };

    const unreadQueryBase = {
      recipient: req.user.userId,
      isRead: false
    };

    const [notifications, totalItems, unreadCount, requestsUnreadCount, mentionsUnreadCount, activityUnreadCount] = await Promise.all([
      Notification.find(query)
        .populate('actor', 'username profilePicture')
        .populate('post', 'title image postType')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments(unreadQueryBase),
      Notification.countDocuments({
        ...unreadQueryBase,
        type: { $in: REQUEST_TYPES }
      }),
      Notification.countDocuments({
        ...unreadQueryBase,
        type: { $in: MENTION_TYPES }
      }),
      Notification.countDocuments({
        ...unreadQueryBase,
        type: {
          $nin: [...REQUEST_TYPES, ...MENTION_TYPES]
        }
      })
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const unreadCountsByFilter = {
      all: unreadCount,
      requests: requestsUnreadCount,
      mentions: mentionsUnreadCount,
      activity: activityUnreadCount
    };

    return res.json({
      notifications,
      filter,
      unreadCount,
      filteredUnreadCount: unreadCountsByFilter[filter],
      unreadCountsByFilter,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const filter = getFilterValue(req.query.filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.userId,
      isRead: false,
      ...getTypeFilterQuery(filter)
    });

    return res.json({ unreadCount, filter });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    const updateResult = await Notification.updateMany(
      {
        recipient: req.user.userId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return res.json({
      updatedCount: typeof updateResult.modifiedCount === 'number'
        ? updateResult.modifiedCount
        : 0
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.json({
      id: notification._id,
      isRead: notification.isRead,
      readAt: notification.readAt
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
