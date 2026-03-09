const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    enum: ['explicit', 'hate', 'spam', 'harassment', 'violence', 'other'],
    default: 'other'
  },
  details: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'reviewing', 'resolved', 'dismissed'],
    default: 'open'
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'post-removed', 'user-banned', 'user-unbanned'],
    default: 'none'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
