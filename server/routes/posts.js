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
const DEFAULT_FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.instrevi.com'
  : 'http://localhost:3000';

const MEDIA_FRAME_STYLES = new Set(['clean', 'polaroid', 'cinema', 'glow']);
const MEDIA_ASPECT_RATIOS = new Set(['original', 'square', 'portrait', 'landscape']);
const MEDIA_OVERLAY_POSITIONS = new Set(['top', 'center', 'bottom']);

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const roundRatingValue = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed);
};

const resolveReviewRating = (post) => {
  if (typeof post?.rating === 'number') {
    return post.rating;
  }

  // Backward compatibility for posts that might have stored customRating only.
  if (typeof post?.customRating === 'number') {
    return post.customRating;
  }

  return null;
};

const resolveFrontendBaseUrl = () => {
  const configuredValue = typeof process.env.FRONTEND_URL === 'string'
    ? process.env.FRONTEND_URL.trim()
    : '';

  if (!configuredValue) {
    return DEFAULT_FRONTEND_URL;
  }

  try {
    const parsed = new URL(configuredValue);
    const hasSupportedProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';

    if (!hasSupportedProtocol) {
      return DEFAULT_FRONTEND_URL;
    }

    return parsed.origin;
  } catch {
    return DEFAULT_FRONTEND_URL;
  }
};

const frontendBaseUrl = resolveFrontendBaseUrl();

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toPlainText = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/[\*_`~>#]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toSnippet = (value, maxChars = 220) => {
  const text = toPlainText(value);

  if (!text) {
    return '';
  }

  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars - 3).trim()}...`;
};

const pickShareImage = (post) => {
  const imageCandidates = [];

  if (Array.isArray(post?.images)) {
    imageCandidates.push(...post.images.filter((url) => typeof url === 'string' && url.trim()));
  }

  if (typeof post?.image === 'string' && post.image.trim()) {
    imageCandidates.push(post.image.trim());
  }

  const videoUrls = new Set([
    ...(Array.isArray(post?.videos) ? post.videos : []),
    post?.video,
  ].filter((url) => typeof url === 'string' && url.trim()));

  return imageCandidates.find((url) => !videoUrls.has(url)) || imageCandidates[0] || '';
};

const isCrawlerUserAgent = (userAgent) => /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|skypeuripreview|googlebot|bingbot|crawler|spider|bot/i.test(String(userAgent || ''));

const sanitizeMediaEditSetting = (value, fallbackKind) => {
  const record = value && typeof value === 'object' ? value : {};
  const kind = fallbackKind === 'video' ? 'video' : 'image';
  const trimStart = kind === 'video' ? clampNumber(record.trimStart, 0, 3600, 0) : 0;
  const trimEndRaw = kind === 'video' ? clampNumber(record.trimEnd, 0, 3600, 0) : 0;

  return {
    kind,
    frameStyle: MEDIA_FRAME_STYLES.has(record.frameStyle) ? record.frameStyle : 'clean',
    aspectRatio: MEDIA_ASPECT_RATIOS.has(record.aspectRatio) ? record.aspectRatio : 'original',
    zoom: clampNumber(record.zoom, 1, 2.4, 1),
    offsetX: clampNumber(record.offsetX, -40, 40, 0),
    offsetY: clampNumber(record.offsetY, -40, 40, 0),
    rotate: clampNumber(record.rotate, -180, 180, 0),
    brightness: clampNumber(record.brightness, 60, 150, 100),
    contrast: clampNumber(record.contrast, 60, 150, 100),
    saturation: clampNumber(record.saturation, 0, 170, 100),
    clarity: clampNumber(record.clarity, 0, 50, 0),
    overlayText: typeof record.overlayText === 'string' ? record.overlayText.trim().slice(0, 120) : '',
    overlayPosition: MEDIA_OVERLAY_POSITIONS.has(record.overlayPosition) ? record.overlayPosition : 'bottom',
    trimStart,
    trimEnd: trimEndRaw > trimStart ? trimEndRaw : 0,
  };
};

const buildMediaEditSettings = (rawValue, imageCount, videoCount) => {
  let parsed = [];

  if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsedValue = JSON.parse(rawValue);
      if (Array.isArray(parsedValue)) {
        parsed = parsedValue;
      }
    } catch (error) {
      console.error('Failed to parse mediaEditSettings:', error);
    }
  }

  const expectedKinds = [
    ...Array.from({ length: imageCount }, () => 'image'),
    ...Array.from({ length: videoCount }, () => 'video'),
  ];

  return expectedKinds.map((kind, index) => sanitizeMediaEditSetting(parsed[index], kind));
};

const removeTempFile = (filePath) => {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, (err) => {
    if (err) console.error('Failed to remove temp file:', err);
  });
};


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
    { name: 'videos', maxCount: 10 },
    { name: 'soundtrack', maxCount: 1 }
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
      if (!key) continue;

      const ratingValue = resolveReviewRating(post);
      if (ratingValue === null) continue;

      const current = reviewTotals.get(key) || { totalRating: 0, totalRatingsCount: 0 };
      current.totalRating += ratingValue;
      current.totalRatingsCount += 1;
      reviewTotals.set(key, current);
    }

    const postsWithTotals = postObjects.map((post) => {
      if (post.postType !== 'review') return post;

      const key = getReviewKey(post);
      const aggregate = key ? reviewTotals.get(key) : null;
      const fallbackRating = resolveReviewRating(post);
      const fallbackTotal = fallbackRating === null ? 0 : fallbackRating;

      return {
        ...post,
        totalRating: aggregate ? aggregate.totalRating : fallbackTotal,
        totalRatingsCount: aggregate ? aggregate.totalRatingsCount : (fallbackRating === null ? 0 : 1)
      };
    });

    res.json(postsWithTotals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/share/:postId', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      isDeleted: { $ne: true }
    })
      .populate('user', 'username')
      .lean();

    if (!post) {
      return res.status(404).type('html').send('<!doctype html><html><head><meta charset="utf-8"><title>Post Not Found</title></head><body><h1>Post not found</h1></body></html>');
    }

    const postId = String(post._id);
    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${requestBaseUrl}/api/posts/share/${encodeURIComponent(postId)}`;
    const openUrl = `${frontendBaseUrl}/feed#${encodeURIComponent(postId)}`;

    const postTypeLabel = post.postType === 'review'
      ? 'Review'
      : post.postType === 'unboxing'
        ? 'Unboxing'
        : 'Post';

    const title = typeof post.title === 'string' && post.title.trim()
      ? post.title.trim()
      : `${postTypeLabel} on Instrevi`;

    const ratingValue = resolveReviewRating(post);
    const ratingSigned = ratingValue === null
      ? ''
      : `${roundRatingValue(ratingValue) > 0 ? '+' : ''}${roundRatingValue(ratingValue)}`;
    const ratingStars = ratingValue === null
      ? ''
      : '★'.repeat(Math.min(5, Math.max(0, Math.abs(Math.round(ratingValue)))));

    const snippet = toSnippet(post.caption, 240);
    const authorName = post?.user && typeof post.user.username === 'string' && post.user.username.trim()
      ? post.user.username.trim()
      : 'Instrevi user';
    const description = [
      ratingValue !== null ? `Rating ${ratingSigned}${ratingStars ? ` ${ratingStars}` : ''}` : null,
      snippet || `${postTypeLabel} shared by ${authorName} on Instrevi.`
    ].filter(Boolean).join(' • ');

    const imageUrl = pickShareImage(post);
    const isCrawler = isCrawlerUserAgent(req.get('user-agent'));
    const twitterCard = imageUrl ? 'summary_large_image' : 'summary';

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)} | Instrevi</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Instrevi" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ''}

  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ''}

  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
    .wrap { max-width: 640px; margin: 0 auto; padding: 28px 18px 40px; }
    .card { background: #111827; border: 1px solid #374151; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.35); }
    .cover { width: 100%; height: auto; display: block; max-height: 360px; object-fit: cover; }
    .body { padding: 16px; }
    .kicker { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #93c5fd; font-weight: 700; margin-bottom: 8px; }
    h1 { margin: 0 0 8px; font-size: 22px; line-height: 1.25; color: #f8fafc; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 12px; font-size: 12px; color: #cbd5e1; margin-bottom: 10px; }
    .summary { margin: 0; color: #e5e7eb; font-size: 14px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .cta { margin-top: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #22d3ee; color: #0f172a; text-decoration: none; font-weight: 700; padding: 10px 16px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      ${imageUrl ? `<img class="cover" src="${escapeHtml(imageUrl)}" alt="Post preview" />` : ''}
      <div class="body">
        <div class="kicker">${escapeHtml(postTypeLabel)}</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
          ${ratingValue !== null ? `<span>Rating ${escapeHtml(ratingSigned)}${ratingStars ? ` ${escapeHtml(ratingStars)}` : ''}</span>` : ''}
          <span>By ${escapeHtml(authorName)}</span>
        </div>
        <p class="summary">${escapeHtml(snippet || `${postTypeLabel} on Instrevi`)}</p>
        <a class="cta" href="${escapeHtml(openUrl)}">Open on Instrevi</a>
      </div>
    </div>
  </div>
  ${isCrawler ? '' : `<script>setTimeout(function(){window.location.replace(${JSON.stringify(openUrl)});}, 1200);</script>`}
</body>
</html>`;

    return res.status(200).type('html').send(html);
  } catch (error) {
    console.error('Share preview error:', error);
    return res.status(500).type('html').send('<!doctype html><html><head><meta charset="utf-8"><title>Share Preview</title></head><body><h1>Unable to generate preview</h1></body></html>');
  }
});

router.get('/reviews/subjects', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const categoryFilter = canonicalizeReviewCategory(typeof req.query.category === 'string' ? req.query.category : '');

    const limitRaw = Number.parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const reviewPosts = await Post.find({ postType: 'review', isDeleted: { $ne: true } })
      .select('postType title subjectName subjectKey shopName category rating customRating createdAt image')
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

      const ratingValue = resolveReviewRating(post);
      if (ratingValue !== null) {
        existing.ratingTotal += ratingValue;
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
          ? roundRatingValue(subject.ratingTotal / subject.ratingsCount)
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
      const ratingValue = resolveReviewRating(review);
      if (ratingValue !== null) {
        totalRating += ratingValue;
        totalRatingsCount += 1;
      }
    });

    const globalRating = totalRatingsCount > 0
      ? roundRatingValue(totalRating / totalRatingsCount)
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
      friendsOrAnyone,
      mediaEditSettings,
      soundtrackVolume,
      customRating,
      customRatingName
    } = req.body;
    const resolvedPostType = postType || 'general';
    const resolvedCategory = canonicalizeReviewCategory(category || reviewCategory);
    
    const multiImageFiles = req.files && req.files.images ? req.files.images : [];
    const singleImageFiles = req.files && req.files.image ? req.files.image : [];
    const singleVideoFiles = req.files && req.files.video ? req.files.video : [];
    const multiVideoFiles = req.files && req.files.videos ? req.files.videos : [];
    const soundtrackFiles = req.files && req.files.soundtrack ? req.files.soundtrack : [];
    const imageFiles = [...singleImageFiles, ...multiImageFiles];
    const videoFiles = [...singleVideoFiles, ...multiVideoFiles];
    const storedMediaEditSettings = buildMediaEditSettings(mediaEditSettings, imageFiles.length, videoFiles.length);

    if (imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(400).json({ message: 'At least one photo or video is required' });
    }

    if (resolvedPostType === 'review' && !resolvedCategory) {
      return res.status(400).json({ message: 'Review category is required' });
    }

    // Upload media to Cloudinary
    const uploadedImages = [];
    const uploadedVideos = [];
    let uploadedSoundtrack = null;
    try {
      for (const file of imageFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'image'
        });
        uploadedImages.push(result.secure_url);
        removeTempFile(file.path);
      }

      for (const file of videoFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'video'
        });
        uploadedVideos.push(result.secure_url);
        removeTempFile(file.path);
      }

      if (soundtrackFiles[0]) {
        const soundtrackFile = soundtrackFiles[0];
        const result = await cloudinary.uploader.upload(soundtrackFile.path, {
          resource_type: 'video'
        });
        uploadedSoundtrack = {
          url: result.secure_url,
          originalName: typeof soundtrackFile.originalname === 'string' ? soundtrackFile.originalname.trim().slice(0, 200) : '',
          volume: clampNumber(soundtrackVolume, 0, 100, 70)
        };
        removeTempFile(soundtrackFile.path);
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
      postType: resolvedPostType
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
    if (storedMediaEditSettings.length > 0) postData.mediaEditSettings = storedMediaEditSettings;
    if (uploadedSoundtrack) postData.soundtrack = uploadedSoundtrack;

    const parsedKeywordTags = parseKeywordTags(tags);
    if (parsedKeywordTags.length > 0) {
      postData.tags = parsedKeywordTags;
    }

    // Review-specific fields
    if (resolvedPostType === 'review') {
      const resolvedSubjectName = [subjectName, shopName, title]
        .find((value) => typeof value === 'string' && value.trim());

      if (resolvedCategory && resolvedSubjectName) {
        postData.subjectName = resolvedSubjectName.trim();
        postData.subjectKey = buildSubjectKey(resolvedCategory, resolvedSubjectName);
      }

      if (rating !== undefined && rating !== null && rating !== '') {
        postData.rating = clampNumber(rating, -5, 5, 0);
      }

      if (customRating !== undefined && customRating !== null && customRating !== '') {
        postData.customRating = clampNumber(customRating, -5, 5, 0);
      }

      if (typeof customRatingName === 'string' && customRatingName.trim()) {
        postData.customRatingName = customRatingName.trim().slice(0, 80);
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
