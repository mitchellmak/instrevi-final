const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ['review', 'unboxing', 'general'],
    default: 'general'
  },
  title: {
    type: String,
    maxlength: 200
  },
  subjectName: {
    type: String,
    maxlength: 200,
    trim: true
  },
  subjectKey: {
    type: String,
    maxlength: 260,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Product', 'Products', 'Service', 'Food', 'Establishment', 'Places', 'Hotel', 'Homestay', 'Restaurant', 'Cafe',
      'Electronics', 'Fashion', 'Beauty', 'Sports', 'Books', 'Movies',
      'Music', 'Travel', 'Technology', 'Automotive', 'Home & Garden',
      'Health & Wellness', 'Entertainment', 'Business', 'Education', 'Other'
    ]
  },
  caption: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  image: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  video: {
    type: String
  },
  videos: [{
    type: String
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Review-specific fields
  rating: {
    type: Number,
    min: -5,
    max: 5
  },
  stats: [{
    label: String,
    value: Number
  }],
  shopName: {
    type: String,
    maxlength: 200,
    trim: true
  },
  businessLocation: {
    type: String,
    maxlength: 260,
    trim: true
  },
  visitDate: {
    type: String,
    maxlength: 40,
    trim: true
  },
  visitTime: {
    type: String,
    maxlength: 40,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedReason: {
    type: String,
    maxlength: 500,
    default: ''
  },
  tags: [String]
}, {
  timestamps: true
});

postSchema.index({ postType: 1, subjectKey: 1, createdAt: -1 });
postSchema.index({ postType: 1, category: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
