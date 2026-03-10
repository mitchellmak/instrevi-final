const express = require('express');
const upload = require('../middleware/upload');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const requireNotBanned = require('../middleware/requireNotBanned');
const {
  createNotification,
  extractMentionsFromText,
  extractUsernamesFromTagInput,
  parseKeywordTags,
  resolveUsersByUsernames,
  toIdString
} = require('../utils/notifications');

const router = express.Router();

const canonicalizeReviewCategory = (value) => {
  if (typeof value !== 'string') return '';

  const normalized = value.trim().toLowerCase();

  if (normalized === 'product' || normalized === 'products') return 'Products';
  if (normalized === 'service') return 'Service';
  if (normalized === 'food') return 'Food';
  if (normalized === 'place' || normalized === 'places' || normalized === 'establishment') return 'Establishment';

  return value.trim();
};

const normalizeSubjectToken = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const buildSubjectKey = (category, subjectName) => {
  const categoryToken = normalizeSubjectToken(canonicalizeReviewCategory(category));
  const nameToken = normalizeSubjectToken(subjectName);

  if (!categoryToken || !nameToken) return '';
  return `${categoryToken}__${nameToken}`;
};

const resolveReviewSubjectFromPost = (post) => {
  if (!post || post.postType !== 'review') return null;

  const category = canonicalizeReviewCategory(post.category);
  const subjectName = [post.subjectName, post.shopName, post.title]
    .find((value) => typeof value === 'string' && value.trim()) || '';

  if (!category || !subjectName) return null;

  const subjectKey = (typeof post.subjectKey === 'string' && post.subjectKey.trim())
    ? post.subjectKey.trim().toLowerCase()
    : buildSubjectKey(category, subjectName);

  if (!subjectKey) return null;

  return {
    category,
    subjectName: String(subjectName).trim(),
    subjectKey
  };
};

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
    const posts = await Post.find({ isDeleted: { $ne: true } })
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
      const subject = resolveReviewSubjectFromPost(post);
      return subject ? subject.subjectKey : null;
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

router.get('/reviews/subjects', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const categoryFilter = canonicalizeReviewCategory(typeof req.query.category === 'string' ? req.query.category : '');

    const limitRaw = Number.parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const reviewPosts = await Post.find({ postType: 'review', isDeleted: { $ne: true } })
      .select('postType title subjectName subjectKey shopName category rating createdAt image')
      .lean();

    const subjectsMap = new Map();

    for (const post of reviewPosts) {
      const subject = resolveReviewSubjectFromPost(post);
      if (!subject) continue;

      if (categoryFilter && subject.category !== categoryFilter) {
        continue;
      }

      if (
        q
        && !subject.subjectName.toLowerCase().includes(q)
        && !subject.category.toLowerCase().includes(q)
      ) {
        continue;
      }

      const existing = subjectsMap.get(subject.subjectKey) || {
        subjectKey: subject.subjectKey,
        subjectName: subject.subjectName,
        category: subject.category,
        reviewCount: 0,
        ratingTotal: 0,
        ratingsCount: 0,
        latestReviewAt: post.createdAt,
        previewImage: post.image || ''
      };

      existing.reviewCount += 1;

      if (typeof post.rating === 'number') {
        existing.ratingTotal += post.rating;
        existing.ratingsCount += 1;
      }

      if (!existing.latestReviewAt || new Date(post.createdAt).getTime() > new Date(existing.latestReviewAt).getTime()) {
        existing.latestReviewAt = post.createdAt;
      }

      if (!existing.previewImage && post.image) {
        existing.previewImage = post.image;
      }

      subjectsMap.set(subject.subjectKey, existing);
    }

    const subjects = Array.from(subjectsMap.values())
      .map((subject) => ({
        subjectKey: subject.subjectKey,
        subjectName: subject.subjectName,
        category: subject.category,
        reviewCount: subject.reviewCount,
        globalRating: subject.ratingsCount > 0
          ? Number((subject.ratingTotal / subject.ratingsCount).toFixed(2))
          : 0,
        ratingsCount: subject.ratingsCount,
        latestReviewAt: subject.latestReviewAt,
        previewImage: subject.previewImage
      }))
      .sort((a, b) => {
        if (q) {
          const aStartsWith = a.subjectName.toLowerCase().startsWith(q);
          const bStartsWith = b.subjectName.toLowerCase().startsWith(q);
          if (aStartsWith !== bStartsWith) {
            return aStartsWith ? -1 : 1;
          }
        }

        return (
          b.reviewCount - a.reviewCount
          || new Date(b.latestReviewAt).getTime() - new Date(a.latestReviewAt).getTime()
        );
      });

    return res.json({
      subjects: subjects.slice(0, limit),
      total: subjects.length,
      query: q,
      category: categoryFilter || null
    });
  } catch (error) {
    console.error('Review subjects query error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reviews/subjects/:subjectKey/reviews', async (req, res) => {
  try {
    const subjectKey = typeof req.params.subjectKey === 'string'
      ? req.params.subjectKey.trim().toLowerCase()
      : '';

    if (!subjectKey) {
      return res.status(400).json({ message: 'Subject key is required' });
    }

    const pageRaw = Number.parseInt(String(req.query.page || '1'), 10);
    const limitRaw = Number.parseInt(String(req.query.limit || '20'), 10);
    const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const categoryToken = subjectKey.split('__')[0] || '';
    const canonicalCategory = canonicalizeReviewCategory(categoryToken);

    const categoryCandidates = !canonicalCategory
      ? []
      : canonicalCategory === 'Establishment'
        ? ['Establishment', 'Places']
        : canonicalCategory === 'Products'
          ? ['Products', 'Product']
          : [canonicalCategory];

    const query = { postType: 'review', isDeleted: { $ne: true } };
    if (categoryCandidates.length > 0) {
      query.category = { $in: categoryCandidates };
    }

    const reviewPosts = await Post.find(query)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 });

    const matchedReviews = [];

    for (const post of reviewPosts) {
      const postObject = post.toObject();
      const subject = resolveReviewSubjectFromPost(postObject);

      if (!subject || subject.subjectKey !== subjectKey) {
        continue;
      }

      if (!postObject.user) {
        continue;
      }

      postObject.comments = Array.isArray(postObject.comments)
        ? postObject.comments.filter((comment) => comment && comment.user)
        : [];

      matchedReviews.push(postObject);
    }

    if (matchedReviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found for that subject' });
    }

    let totalRating = 0;
    let totalRatingsCount = 0;

    matchedReviews.forEach((review) => {
      if (typeof review.rating === 'number') {
        totalRating += review.rating;
        totalRatingsCount += 1;
      }
    });

    const globalRating = totalRatingsCount > 0
      ? Number((totalRating / totalRatingsCount).toFixed(2))
      : 0;

    const totalItems = matchedReviews.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;

    const reviews = matchedReviews
      .slice(startIndex, startIndex + limit)
      .map((review) => ({
        ...review,
        totalRating,
        totalRatingsCount
      }));

    const firstSubject = resolveReviewSubjectFromPost(matchedReviews[0]);

    return res.json({
      subject: {
        subjectKey,
        subjectName: firstSubject ? firstSubject.subjectName : (matchedReviews[0].title || 'Review subject'),
        category: firstSubject ? firstSubject.category : canonicalizeReviewCategory(matchedReviews[0].category),
        reviewCount: totalItems,
        globalRating,
        ratingsCount: totalRatingsCount
      },
      pagination: {
        page: safePage,
        limit,
        totalItems,
        totalPages
      },
      reviews
    });
  } catch (error) {
    console.error('Subject review list error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create post (supports review, unboxing, and general posts)
router.post('/', auth, requireNotBanned, uploadPostMedia, async (req, res) => {
  try {
    const {
      caption,
      postType,
      title,
      category,
      reviewCategory,
      subjectName,
      shopName,
      businessLocation,
      visitDate,
      visitTime,
      rating,
      stats,
      tags,
      friendsOrAnyone
    } = req.body;
    const resolvedCategory = canonicalizeReviewCategory(category || reviewCategory);
    
    const multiImageFiles = req.files && req.files.images ? req.files.images : [];
    const singleImageFiles = req.files && req.files.image ? req.files.image : [];
    const singleVideoFiles = req.files && req.files.video ? req.files.video : [];
    const multiVideoFiles = req.files && req.files.videos ? req.files.videos : [];
    const imageFiles = [...singleImageFiles, ...multiImageFiles];
    const videoFiles = [...singleVideoFiles, ...multiVideoFiles];

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(400).json({ message: 'At least one photo or video is required' });
    }

    if ((postType || 'general') === 'review' && !resolvedCategory) {
      return res.status(400).json({ message: 'Review category is required' });
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
    if (resolvedCategory) postData.category = resolvedCategory;
    if (typeof shopName === 'string' && shopName.trim()) postData.shopName = shopName.trim();
    if (typeof businessLocation === 'string' && businessLocation.trim()) postData.businessLocation = businessLocation.trim();
    if (typeof visitDate === 'string' && visitDate.trim()) postData.visitDate = visitDate.trim();
    if (typeof visitTime === 'string' && visitTime.trim()) postData.visitTime = visitTime.trim();
    if (uploadedVideos.length > 0) postData.video = uploadedVideos[0];
    if (uploadedVideos.length > 0) postData.videos = uploadedVideos;
    if (uploadedImages.length > 1) postData.images = uploadedImages;

    const parsedKeywordTags = parseKeywordTags(tags);
    if (parsedKeywordTags.length > 0) {
      postData.tags = parsedKeywordTags;
    }

    // Review-specific fields
    if (postType === 'review') {
      const resolvedSubjectName = [subjectName, shopName, title]
        .find((value) => typeof value === 'string' && value.trim());

      if (resolvedCategory && resolvedSubjectName) {
        postData.subjectName = resolvedSubjectName.trim();
        postData.subjectKey = buildSubjectKey(resolvedCategory, resolvedSubjectName);
      }

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

    try {
      const taggedUsernames = extractUsernamesFromTagInput(friendsOrAnyone);
      const captionMentionUsernames = extractMentionsFromText(caption).filter(
        (username) => !taggedUsernames.includes(username)
      );
      const usernamesToResolve = Array.from(new Set([...taggedUsernames, ...captionMentionUsernames]));

      if (usernamesToResolve.length > 0) {
        const taggedSet = new Set(taggedUsernames);
        const captionMentionSet = new Set(captionMentionUsernames);
        const matchedUsers = await resolveUsersByUsernames(usernamesToResolve);

        await Promise.all(
          matchedUsers.map(async (matchedUser) => {
            const normalizedUsername = String(matchedUser.username || '').trim().toLowerCase();
            if (!normalizedUsername) return;

            if (taggedSet.has(normalizedUsername)) {
              await createNotification({
                recipientId: matchedUser._id,
                actorId: req.user.userId,
                type: 'tag',
                postId: post._id,
                dedupeQuery: {
                  actor: req.user.userId,
                  post: post._id
                }
              });
              return;
            }

            if (captionMentionSet.has(normalizedUsername)) {
              await createNotification({
                recipientId: matchedUser._id,
                actorId: req.user.userId,
                type: 'mention',
                postId: post._id,
                dedupeQuery: {
                  actor: req.user.userId,
                  post: post._id
                }
              });
            }
          })
        );
      }
    } catch (notificationError) {
      console.error('Post mention/tag notification error:', notificationError);
    }

    const populatedPost = await Post.findById(post._id)
      .populate('user', 'username profilePicture firstName lastName email followers following');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Like/unlike post
router.post('/:postId/like', auth, requireNotBanned, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: { $ne: true }
    });
    
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

    if (!isLiked) {
      try {
        await createNotification({
          recipientId: post.user,
          actorId: userId,
          type: 'like',
          postId: post._id,
          dedupeQuery: {
            actor: userId,
            post: post._id
          }
        });
      } catch (notificationError) {
        console.error('Like notification error:', notificationError);
      }
    }
    
    res.json({ liked: !isLiked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:postId/comment', auth, requireNotBanned, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: { $ne: true }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.user.userId, // This would come from auth middleware
      text
    };

    post.comments.push(comment);
    await post.save();

    try {
      const latestComment = post.comments[post.comments.length - 1];
      const latestCommentId = latestComment ? latestComment._id : null;
      const commentSnippet = typeof text === 'string' ? text.trim().slice(0, 160) : '';

      await createNotification({
        recipientId: post.user,
        actorId: req.user.userId,
        type: 'comment',
        postId: post._id,
        commentId: latestCommentId,
        metadata: {
          snippet: commentSnippet
        }
      });

      const mentionedUsernames = extractMentionsFromText(text);

      if (mentionedUsernames.length > 0) {
        const postOwnerId = toIdString(post.user);
        const mentionedUsers = await resolveUsersByUsernames(mentionedUsernames);

        await Promise.all(
          mentionedUsers.map((mentionedUser) => {
            const mentionedUserId = toIdString(mentionedUser._id);

            if (!mentionedUserId || mentionedUserId === postOwnerId) {
              return Promise.resolve();
            }

            return createNotification({
              recipientId: mentionedUser._id,
              actorId: req.user.userId,
              type: 'mention',
              postId: post._id,
              commentId: latestCommentId,
              dedupeQuery: {
                actor: req.user.userId,
                commentId: latestCommentId
              }
            });
          })
        );
      }
    } catch (notificationError) {
      console.error('Comment notification error:', notificationError);
    }

    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'username profilePicture');

    res.status(201).json(populatedPost.comments[populatedPost.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
