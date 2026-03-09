const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanUser = (user) => {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    profilePicture: user.profilePicture || '',
    isAdmin: Boolean(user.isAdmin),
    isBanned: Boolean(user.isBanned),
    bannedReason: user.bannedReason || '',
    bannedAt: user.bannedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

// Session info for admin UI bootstrapping
router.get('/session', auth, async (req, res) => {
  try {
    const [user, adminsCount] = await Promise.all([
      User.findById(req.user.userId).select('username email firstName middleName lastName profilePicture isAdmin isBanned createdAt updatedAt'),
      User.countDocuments({ isAdmin: true })
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: cleanUser(user),
      adminsCount,
      canBootstrap: adminsCount === 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// First admin bootstrap if no admins exist yet
router.post('/bootstrap', auth, async (req, res) => {
  try {
    const adminsCount = await User.countDocuments({ isAdmin: true });
    if (adminsCount > 0) {
      return res.status(403).json({ message: 'Admin bootstrap is disabled because admin accounts already exist' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isAdmin = true;
    await user.save();

    res.json({
      message: 'Admin access granted',
      user: cleanUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// All routes below require admin access
router.use(auth, requireAdmin);

router.get('/overview', async (req, res) => {
  try {
    const itemSort = req.query.itemSort === 'item' ? 'item' : 'rating';
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalReviews,
      totalUnboxing,
      totalBannedUsers,
      openReports,
      commentsAgg,
      averageRatingAgg,
      postsThisWeek,
      usersByFollowers,
      usersByLikes,
      topRatedItemsRaw,
      topActiveUsers
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ postType: 'review' }),
      Post.countDocuments({ postType: 'unboxing' }),
      User.countDocuments({ isBanned: true }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
      Post.aggregate([
        {
          $group: {
            _id: null,
            totalComments: {
              $sum: { $size: { $ifNull: ['$comments', []] } }
            }
          }
        }
      ]),
      Post.aggregate([
        {
          $match: {
            postType: 'review',
            rating: { $type: 'number' }
          }
        },
        {
          $group: {
            _id: null,
            averageReviewRating: { $avg: '$rating' }
          }
        }
      ]),
      Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.aggregate([
        {
          $addFields: {
            followersCount: { $size: { $ifNull: ['$followers', []] } }
          }
        },
        {
          $project: {
            _id: 1,
            username: 1,
            email: 1,
            profilePicture: 1,
            followersCount: 1,
            isAdmin: 1,
            isBanned: 1
          }
        },
        {
          $sort: {
            followersCount: -1,
            username: 1
          }
        },
        {
          $limit: 200
        }
      ]),
      Post.aggregate([
        {
          $group: {
            _id: '$user',
            likesReceived: {
              $sum: { $size: { $ifNull: ['$likes', []] } }
            },
            postsCount: { $sum: 1 }
          }
        },
        {
          $match: {
            _id: { $ne: null }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: '$user.username',
            email: '$user.email',
            profilePicture: '$user.profilePicture',
            likesReceived: 1,
            postsCount: 1
          }
        },
        {
          $sort: {
            likesReceived: -1,
            postsCount: -1,
            username: 1
          }
        },
        {
          $limit: 200
        }
      ]),
      Post.aggregate([
        {
          $match: {
            postType: 'review',
            rating: { $type: 'number' }
          }
        },
        {
          $project: {
            title: { $trim: { input: { $ifNull: ['$title', ''] } } },
            category: { $ifNull: ['$category', 'Uncategorized'] },
            rating: 1,
            createdAt: 1
          }
        },
        {
          $match: {
            title: { $ne: '' }
          }
        },
        {
          $group: {
            _id: {
              title: '$title',
              category: '$category'
            },
            averageRating: { $avg: '$rating' },
            totalRating: { $sum: '$rating' },
            ratingsCount: { $sum: 1 },
            lastReviewedAt: { $max: '$createdAt' }
          }
        },
        {
          $project: {
            _id: 0,
            title: '$_id.title',
            category: '$_id.category',
            normalizedTitle: { $toLower: '$_id.title' },
            normalizedCategory: { $toLower: '$_id.category' },
            averageRating: 1,
            totalRating: 1,
            ratingsCount: 1,
            lastReviewedAt: 1
          }
        },
        {
          $sort: itemSort === 'item'
            ? { normalizedTitle: 1, normalizedCategory: 1, averageRating: -1 }
            : { averageRating: -1, ratingsCount: -1, normalizedTitle: 1 }
        },
        {
          $limit: 200
        }
      ]),
      Post.aggregate([
        {
          $group: {
            _id: '$user',
            postsCount: { $sum: 1 },
            reviewsCount: {
              $sum: {
                $cond: [{ $eq: ['$postType', 'review'] }, 1, 0]
              }
            },
            unboxingCount: {
              $sum: {
                $cond: [{ $eq: ['$postType', 'unboxing'] }, 1, 0]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: '$user.username',
            email: '$user.email',
            postsCount: 1,
            reviewsCount: 1,
            unboxingCount: 1
          }
        },
        {
          $sort: {
            postsCount: -1,
            reviewsCount: -1,
            username: 1
          }
        },
        {
          $limit: 100
        }
      ])
    ]);

    const totalComments = commentsAgg[0]?.totalComments || 0;
    const averageReviewRatingRaw = averageRatingAgg[0]?.averageReviewRating || 0;
    const averageReviewRating = Number(averageReviewRatingRaw.toFixed(2));

    const topRatedItems = topRatedItemsRaw.map((item) => ({
      title: item.title,
      category: item.category,
      averageRating: Number((item.averageRating || 0).toFixed(2)),
      totalRating: item.totalRating,
      ratingsCount: item.ratingsCount,
      lastReviewedAt: item.lastReviewedAt
    }));

    res.json({
      totals: {
        totalUsers,
        totalPosts,
        totalReviews,
        totalUnboxing,
        totalBannedUsers
      },
      insights: {
        totalComments,
        averageReviewRating,
        postsThisWeek,
        openReports
      },
      usersByFollowers,
      usersByLikes,
      topRatedItems,
      topActiveUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const pipeline = [];

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      pipeline.push({
        $match: {
          $or: [
            { username: regex },
            { email: regex },
            { firstName: regex },
            { middleName: regex },
            { lastName: regex }
          ]
        }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'user',
          as: 'userPosts'
        }
      },
      {
        $addFields: {
          followersCount: { $size: { $ifNull: ['$followers', []] } },
          followingCount: { $size: { $ifNull: ['$following', []] } },
          postsCount: { $size: { $ifNull: ['$userPosts', []] } },
          reviewsCount: {
            $size: {
              $filter: {
                input: '$userPosts',
                as: 'post',
                cond: { $eq: ['$$post.postType', 'review'] }
              }
            }
          },
          unboxingCount: {
            $size: {
              $filter: {
                input: '$userPosts',
                as: 'post',
                cond: { $eq: ['$$post.postType', 'unboxing'] }
              }
            }
          },
          likesReceived: {
            $sum: {
              $map: {
                input: '$userPosts',
                as: 'post',
                in: { $size: { $ifNull: ['$$post.likes', []] } }
              }
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          emailVerificationToken: 0,
          emailVerificationExpires: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          followers: 0,
          following: 0,
          posts: 0,
          userPosts: 0
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      }
    );

    const users = await User.aggregate(pipeline);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userId = toObjectId(req.params.userId);

    const [user, posts, reports] = await Promise.all([
      User.findById(userId)
        .select('-password -emailVerificationToken -emailVerificationExpires -resetPasswordToken -resetPasswordExpires')
        .populate('bannedBy', 'username email'),
      Post.find({ user: userId })
        .select('postType title category caption rating likes comments createdAt')
        .sort({ createdAt: -1 }),
      Report.find({ targetUser: userId })
        .populate('reporter', 'username email')
        .populate('reviewedBy', 'username email')
        .sort({ createdAt: -1 })
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reviews = posts.filter((post) => post.postType === 'review');
    const unboxing = posts.filter((post) => post.postType === 'unboxing');
    const likesReceived = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const commentsReceived = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const ratingValues = reviews
      .map((post) => post.rating)
      .filter((value) => typeof value === 'number');
    const averageReviewRating = ratingValues.length
      ? Number((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(2))
      : 0;

    res.json({
      user: {
        ...user.toObject(),
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        postsCount: posts.length,
        reviewsCount: reviews.length,
        unboxingCount: unboxing.length,
        likesReceived,
        commentsReceived,
        averageReviewRating
      },
      recentPosts: posts.slice(0, 20),
      reports
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/users/:userId/ban', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { isBanned, reason = '' } = req.body;
    if (typeof isBanned !== 'boolean') {
      return res.status(400).json({ message: 'isBanned must be true or false' });
    }

    if (req.params.userId === String(req.user.userId) && isBanned) {
      return res.status(400).json({ message: 'You cannot ban your own admin account' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.isAdmin && isBanned) {
      return res.status(400).json({ message: 'Admin accounts cannot be banned from this action' });
    }

    targetUser.isBanned = isBanned;
    targetUser.bannedReason = isBanned ? String(reason || '').trim() : '';
    targetUser.bannedAt = isBanned ? new Date() : undefined;
    targetUser.bannedBy = isBanned ? req.user.userId : undefined;

    await targetUser.save();

    res.json({
      message: isBanned ? 'User banned' : 'User unbanned',
      user: cleanUser(targetUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (req.params.userId === String(req.user.userId)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.isAdmin) {
      const adminsCount = await User.countDocuments({ isAdmin: true });
      if (adminsCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin account' });
      }
    }

    const targetUserId = toObjectId(req.params.userId);
    const userPosts = await Post.find({ user: targetUserId }).select('_id');
    const userPostIds = userPosts.map((post) => post._id);

    await Promise.all([
      Post.deleteMany({ user: targetUserId }),
      Post.updateMany(
        {},
        {
          $pull: {
            likes: targetUserId,
            comments: { user: targetUserId }
          }
        }
      ),
      User.updateMany(
        {},
        {
          $pull: {
            followers: targetUserId,
            following: targetUserId,
            posts: { $in: userPostIds }
          }
        }
      ),
      Report.deleteMany({
        $or: [
          { targetUser: targetUserId },
          { reporter: targetUserId }
        ]
      }),
      User.findByIdAndDelete(targetUserId)
    ]);

    res.json({
      message: 'User deleted successfully',
      deletedUserId: req.params.userId,
      deletedPostsCount: userPostIds.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const status = String(req.query.status || 'all').trim();
    const match = {};

    if (status && status !== 'all') {
      match.status = status;
    }

    const reports = await Report.find(match)
      .populate('targetUser', 'username email profilePicture isBanned bannedReason bannedAt')
      .populate('targetPost', 'title postType category')
      .populate('reporter', 'username email')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const postType = String(req.query.postType || 'all').trim();

    const pipeline = [];

    if (postType && postType !== 'all') {
      pipeline.push({
        $match: {
          postType
        }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          commentsCount: { $size: { $ifNull: ['$comments', []] } }
        }
      }
    );

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: regex },
            { caption: regex },
            { category: regex },
            { postType: regex },
            { 'user.username': regex },
            { 'user.email': regex },
            { 'user.firstName': regex },
            { 'user.lastName': regex }
          ]
        }
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          postType: 1,
          title: 1,
          category: 1,
          caption: 1,
          image: 1,
          images: 1,
          video: 1,
          videos: 1,
          rating: 1,
          tags: 1,
          likesCount: 1,
          commentsCount: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: '$user._id',
            username: '$user.username',
            email: '$user.email',
            firstName: '$user.firstName',
            lastName: '$user.lastName'
          }
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 1000
      }
    );

    const posts = await Post.aggregate(pipeline);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/posts/:postId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const postId = toObjectId(req.params.postId);
    const existingPost = await Post.findById(postId).select('_id');

    if (!existingPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await Promise.all([
      Post.findByIdAndDelete(postId),
      User.updateMany(
        {},
        {
          $pull: {
            posts: postId
          }
        }
      ),
      Report.deleteMany({ targetPost: postId })
    ]);

    res.json({
      message: 'Post deleted successfully',
      deletedPostId: req.params.postId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { targetUserId, targetPostId, reporterId, reason = 'other', details = '' } = req.body;

    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: 'Valid targetUserId is required' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (targetPostId && !isValidObjectId(targetPostId)) {
      return res.status(400).json({ message: 'targetPostId is invalid' });
    }

    if (targetPostId) {
      const postExists = await Post.exists({ _id: targetPostId });
      if (!postExists) {
        return res.status(404).json({ message: 'Target post not found' });
      }
    }

    if (reporterId && !isValidObjectId(reporterId)) {
      return res.status(400).json({ message: 'reporterId is invalid' });
    }

    const report = await Report.create({
      targetUser: targetUserId,
      targetPost: targetPostId || undefined,
      reporter: reporterId || undefined,
      reason,
      details: String(details || '').trim()
    });

    const populatedReport = await Report.findById(report._id)
      .populate('targetUser', 'username email profilePicture isBanned')
      .populate('targetPost', 'title postType category')
      .populate('reporter', 'username email')
      .populate('reviewedBy', 'username email');

    res.status(201).json(populatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/reports/:reportId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const { status, actionTaken, adminNotes, banUser } = req.body;

    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (typeof status === 'string' && status.trim()) {
      report.status = status;
    }

    if (typeof actionTaken === 'string' && actionTaken.trim()) {
      report.actionTaken = actionTaken;
    }

    if (typeof adminNotes === 'string') {
      report.adminNotes = adminNotes.trim();
    }

    if (typeof banUser === 'boolean') {
      const targetUser = await User.findById(report.targetUser);
      if (targetUser) {
        if (banUser) {
          targetUser.isBanned = true;
          targetUser.bannedReason = report.reason;
          targetUser.bannedAt = new Date();
          targetUser.bannedBy = req.user.userId;
          report.actionTaken = actionTaken || 'user-banned';
        } else {
          targetUser.isBanned = false;
          targetUser.bannedReason = '';
          targetUser.bannedAt = undefined;
          targetUser.bannedBy = undefined;
          report.actionTaken = actionTaken || 'user-unbanned';
        }

        await targetUser.save();
      }
    }

    report.reviewedBy = req.user.userId;
    report.reviewedAt = new Date();

    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('targetUser', 'username email profilePicture isBanned bannedReason bannedAt')
      .populate('targetPost', 'title postType category')
      .populate('reporter', 'username email')
      .populate('reviewedBy', 'username email');

    res.json(populatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const adminUsers = await User.find({ isAdmin: true })
      .select('username email firstName middleName lastName profilePicture isAdmin isBanned createdAt')
      .sort({ createdAt: 1 });

    res.json(adminUsers.map(cleanUser));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admins', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    targetUser.isAdmin = true;
    await targetUser.save();

    res.json({
      message: 'Admin user added',
      user: cleanUser(targetUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admins/:userId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!targetUser.isAdmin) {
      return res.status(400).json({ message: 'User is not an admin' });
    }

    const adminsCount = await User.countDocuments({ isAdmin: true });
    if (adminsCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last admin user' });
    }

    targetUser.isAdmin = false;
    await targetUser.save();

    res.json({
      message: 'Admin user removed',
      user: cleanUser(targetUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
