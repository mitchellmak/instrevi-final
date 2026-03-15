const mongoose = require('mongoose');

const mediaEditSettingSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  frameStyle: {
    type: String,
    enum: ['clean', 'polaroid', 'cinema', 'glow'],
    default: 'clean',
  },
  aspectRatio: {
    type: String,
    enum: ['original', 'square', 'portrait', 'landscape'],
    default: 'original',
  },
  zoom: {
    type: Number,
    min: 1,
    max: 2.4,
    default: 1,
  },
  offsetX: {
    type: Number,
    min: -40,
    max: 40,
    default: 0,
  },
  offsetY: {
    type: Number,
    min: -40,
    max: 40,
    default: 0,
  },
  rotate: {
    type: Number,
    min: -180,
    max: 180,
    default: 0,
  },
  brightness: {
    type: Number,
    min: 60,
    max: 150,
    default: 100,
  },
  contrast: {
    type: Number,
    min: 60,
    max: 150,
    default: 100,
  },
  saturation: {
    type: Number,
    min: 0,
    max: 170,
    default: 100,
  },
  clarity: {
    type: Number,
    min: 0,
    max: 50,
    default: 0,
  },
  overlayText: {
    type: String,
    maxlength: 120,
    default: '',
  },
  overlayPosition: {
    type: String,
    enum: ['top', 'center', 'bottom'],
    default: 'bottom',
  },
  trimStart: {
    type: Number,
    min: 0,
    max: 3600,
    default: 0,
  },
  trimEnd: {
    type: Number,
    min: 0,
    max: 3600,
    default: 0,
  },
}, { _id: false });

const soundtrackSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    maxlength: 200,
    default: '',
  },
  volume: {
    type: Number,
    min: 0,
    max: 100,
    default: 70,
  },
}, { _id: false });

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
      'Electronics', 'Fashion', 'Beauty', 'Sports', 'Books', 'Gaming', 'Toys', 'Movies',
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
  mediaEditSettings: {
    type: [mediaEditSettingSchema],
    default: [],
  },
  soundtrack: {
    type: soundtrackSchema,
    default: null,
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
    min: -5,
    max: 5
  },
  customRating: {
    type: Number,
    min: -5,
    max: 5
  },
  customRatingName: {
    type: String,
    maxlength: 80,
    trim: true,
    default: ''
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
