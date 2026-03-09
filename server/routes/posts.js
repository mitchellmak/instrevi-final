const express = require('express');
const upload = require('../middleware/upload');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup for file upload (already imported above)

const uploadPostMedia = (req, res, next) => {
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
    { name: 'videos', maxCount: 10 }
  ])(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max upload size is 200MB.' });
    }

    return res.status(400).json({ message: err.message || 'Media upload failed' });
  });
};

// Get all posts (feed)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 });

    const postObjects = posts
      .filter((post) => post.user)
      .map((post) => {
        const postObject = post.toObject();
        postObject.comments = Array.isArray(postObject.comments)
          ? postObject.comments.filter((comment) => comment && comment.user)
          : [];
        return postObject;
      });
    const reviewTotals = new Map();

    const getReviewKey = (post) => {
      if (!post || post.postType !== 'review') return null;
      const title = typeof post.title === 'string' ? post.title.trim().toLowerCase() : '';
      const category = typeof post.category === 'string' ? post.category.trim().toLowerCase() : '';
      if (!title || !category) return null;
      return `${category}|${title}`;
    };

    for (const post of postObjects) {
      const key = getReviewKey(post);
      if (!key || typeof post.rating !== 'number') continue;

      const current = reviewTotals.get(key) || { totalRating: 0, totalRatingsCount: 0 };
      current.totalRating += post.rating;
      current.totalRatingsCount += 1;
      reviewTotals.set(key, current);
    }

    const postsWithTotals = postObjects.map((post) => {
      if (post.postType !== 'review') return post;

      const key = getReviewKey(post);
      const aggregate = key ? reviewTotals.get(key) : null;
      const fallbackTotal = typeof post.rating === 'number' ? post.rating : 0;

      return {
        ...post,
        totalRating: aggregate ? aggregate.totalRating : fallbackTotal,
        totalRatingsCount: aggregate ? aggregate.totalRatingsCount : (typeof post.rating === 'number' ? 1 : 0)
      };
    });

    res.json(postsWithTotals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create post (supports review, unboxing, and general posts)
router.post('/', auth, uploadPostMedia, async (req, res) => {
  try {
    const { caption, postType, title, category, rating, stats } = req.body;
    
    const multiImageFiles = req.files && req.files.images ? req.files.images : [];
    const singleImageFiles = req.files && req.files.image ? req.files.image : [];
    const singleVideoFiles = req.files && req.files.video ? req.files.video : [];
    const multiVideoFiles = req.files && req.files.videos ? req.files.videos : [];
    const imageFiles = [...singleImageFiles, ...multiImageFiles];
    const videoFiles = [...singleVideoFiles, ...multiVideoFiles];

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(400).json({ message: 'At least one photo or video is required' });
    }

    // Upload media to Cloudinary
    const uploadedImages = [];
    const uploadedVideos = [];
    try {
      for (const file of imageFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'image'
        });
        uploadedImages.push(result.secure_url);

        // Remove temporary file from server
        fs.unlink(file.path, (err) => {
          if (err) console.error('Failed to remove temp file:', err);
        });
      }

      for (const file of videoFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'video'
        });
        uploadedVideos.push(result.secure_url);

        // Remove temporary file from server
        fs.unlink(file.path, (err) => {
          if (err) console.error('Failed to remove temp file:', err);
        });
      }
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload media: ' + uploadError.message });
    }

    // Create post object based on type
    const postData = {
      caption,
      image: uploadedImages[0] || uploadedVideos[0],
      user: req.user.userId,
      postType: postType || 'general'
    };

    // Add optional fields based on post type
    if (title) postData.title = title;
    if (category) postData.category = category;
    if (uploadedVideos.length > 0) postData.video = uploadedVideos[0];
    if (uploadedVideos.length > 0) postData.videos = uploadedVideos;
    if (uploadedImages.length > 1) postData.images = uploadedImages;

    // Review-specific fields
    if (postType === 'review') {
      if (rating !== undefined && rating !== null && rating !== '') {
        postData.rating = parseInt(rating, 10);
      }
      if (stats) {
        try {
          postData.stats = JSON.parse(stats);
        } catch (e) {
          console.error('Failed to parse stats:', e);
        }
      }
    }

    // Create post
    const post = new Post(postData);
    await post.save();
    
    // Add post to user's posts array
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { posts: post._id }
    });

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username profilePicture firstName lastName email followers following');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Like/unlike post
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.userId; // This would come from auth middleware
    
    // Check if user already liked the post
    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      post.likes.pull(userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();
    
    res.json({ liked: !isLiked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.user.userId, // This would come from auth middleware
      text
    };

    post.comments.push(comment);
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'username profilePicture');

    res.status(201).json(populatedPost.comments[populatedPost.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
