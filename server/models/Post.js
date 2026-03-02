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
  category: {
    type: String,
    enum: [
      'Product', 'Food', 'Hotel', 'Homestay', 'Restaurant', 'Cafe',
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
    min: 1,
    max: 5
  },
  stats: [{
    label: String,
    value: Number
  }],
  tags: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
