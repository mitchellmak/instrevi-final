const Notification = require('../models/Notification');
const User = require('../models/User');

const toIdString = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return (value._id || value.id || '').toString();
  }

  return String(value);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeUsernameToken = (value) => {
  if (typeof value !== 'string') return '';

  const cleaned = value.trim().replace(/^@+/, '');

  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(cleaned)) {
    return '';
  }

  return cleaned.toLowerCase();
};

const extractMentionsFromText = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const usernames = new Set();
  const mentionRegex = /(^|[^a-zA-Z0-9._-])@([a-zA-Z0-9._-]{3,30})/g;

  let match = mentionRegex.exec(value);

  while (match) {
    const username = normalizeUsernameToken(match[2]);
    if (username) {
      usernames.add(username);
    }

    match = mentionRegex.exec(value);
  }

  return Array.from(usernames);
};

const extractUsernamesFromTagInput = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const usernames = new Set(extractMentionsFromText(value));
  const chunks = value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  chunks.forEach((chunk) => {
    const normalized = normalizeUsernameToken(chunk);
    if (normalized) {
      usernames.add(normalized);
    }
  });

  return Array.from(usernames);
};

const parseKeywordTags = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const tags = new Set();

  value.split(',').forEach((entry) => {
    const normalized = entry.trim().toLowerCase();

    if (!normalized || normalized.length > 40) {
      return;
    }

    tags.add(normalized);
  });

  return Array.from(tags).slice(0, 30);
};

const resolveUsersByUsernames = async (usernames) => {
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return [];
  }

  const normalizedUsernames = Array.from(
    new Set(
      usernames
        .map((username) => normalizeUsernameToken(username))
        .filter(Boolean)
    )
  ).slice(0, 40);

  if (normalizedUsernames.length === 0) {
    return [];
  }

  return User.find({
    $or: normalizedUsernames.map((username) => ({
      username: new RegExp(`^${escapeRegex(username)}$`, 'i')
    }))
  })
    .select('_id username profilePicture')
    .lean();
};

const createNotification = async ({
  recipientId,
  actorId,
  type,
  postId,
  commentId,
  message,
  metadata,
  dedupeQuery
}) => {
  const recipient = toIdString(recipientId);
  const actor = toIdString(actorId);

  if (!recipient || !type) {
    return null;
  }

  if (actor && recipient === actor) {
    return null;
  }

  if (dedupeQuery && typeof dedupeQuery === 'object' && Object.keys(dedupeQuery).length > 0) {
    const existingNotification = await Notification.findOne({
      recipient,
      type,
      isRead: false,
      ...dedupeQuery
    });

    if (existingNotification) {
      return existingNotification;
    }
  }

  const payload = {
    recipient,
    type,
    isRead: false
  };

  if (actor) payload.actor = actor;
  if (postId) payload.post = postId;
  if (commentId) payload.commentId = commentId;
  if (typeof message === 'string' && message.trim()) payload.message = message.trim();
  if (metadata && typeof metadata === 'object') payload.metadata = metadata;

  const notification = new Notification(payload);
  await notification.save();

  return notification;
};

module.exports = {
  toIdString,
  extractMentionsFromText,
  extractUsernamesFromTagInput,
  parseKeywordTags,
  resolveUsersByUsernames,
  createNotification
};
