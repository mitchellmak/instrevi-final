const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const toIdString = (value) => {
  if (!value) return '';
  return value.toString();
};

const createRelationshipSets = (currentUser) => {
  const followingSet = new Set((currentUser.following || []).map((entry) => toIdString(entry._id || entry)));
  const followerSet = new Set((currentUser.followers || []).map((entry) => toIdString(entry._id || entry)));
  const friendSet = new Set((currentUser.friends || []).map((entry) => toIdString(entry._id || entry)));
  const outgoingFriendRequestSet = new Set((currentUser.friendRequestsSent || []).map((entry) => toIdString(entry._id || entry)));
  const incomingFriendRequestSet = new Set((currentUser.friendRequestsReceived || []).map((entry) => toIdString(entry._id || entry)));

  return {
    followingSet,
    followerSet,
    friendSet,
    outgoingFriendRequestSet,
    incomingFriendRequestSet
  };
};

const mapNetworkUser = (userDoc, relationshipSets) => {
  if (!userDoc || !userDoc._id) return null;

  const userId = toIdString(userDoc._id);
  const isFollowing = relationshipSets.followingSet.has(userId);
  const isFollower = relationshipSets.followerSet.has(userId);
  const isFriend = relationshipSets.friendSet.has(userId);
  const hasOutgoingFriendRequest = relationshipSets.outgoingFriendRequestSet.has(userId);
  const hasIncomingFriendRequest = relationshipSets.incomingFriendRequestSet.has(userId);

  return {
    id: userId,
    username: userDoc.username,
    firstName: userDoc.firstName || '',
    lastName: userDoc.lastName || '',
    profilePicture: userDoc.profilePicture || '',
    followersCount: Array.isArray(userDoc.followers) ? userDoc.followers.length : 0,
    followingCount: Array.isArray(userDoc.following) ? userDoc.following.length : 0,
    isFollowing,
    isFollower,
    isFriend,
    hasOutgoingFriendRequest,
    hasIncomingFriendRequest
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uploadProfilePicture = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max upload size is 200MB.' });
    }

    return res.status(400).json({ message: err.message || 'Profile picture upload failed' });
  });
};

// Get current user's friends/followers/following network
router.get('/network', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId)
      .populate('followers', 'username firstName lastName profilePicture followers following')
      .populate('following', 'username firstName lastName profilePicture followers following')
      .populate('friends', 'username firstName lastName profilePicture followers following')
      .populate('friendRequestsReceived', 'username firstName lastName profilePicture followers following')
      .populate('friendRequestsSent', 'username firstName lastName profilePicture followers following');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const relationships = createRelationshipSets(currentUser);
    const followers = (currentUser.followers || [])
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));

    const following = (currentUser.following || [])
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));

    const friends = (currentUser.friends || [])
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));

    const incomingFriendRequests = (currentUser.friendRequestsReceived || [])
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));

    const outgoingFriendRequests = (currentUser.friendRequestsSent || [])
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));

    res.json({
      followers,
      following,
      friends,
      incomingFriendRequests,
      outgoingFriendRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Discover users to follow/add
router.get('/discover', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId).select('followers following friends friendRequestsSent friendRequestsReceived');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const query = rawQuery ? escapeRegex(rawQuery) : '';
    const criteria = {
      _id: { $ne: currentUser._id }
    };

    if (query) {
      criteria.$or = [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ];
    }

    const users = await User.find(criteria)
      .select('username firstName lastName profilePicture followers following')
      .sort({ username: 1 })
      .limit(50);

    const relationships = createRelationshipSets(currentUser);
    const results = users
      .map((entry) => mapNetworkUser(entry, relationships))
      .filter(Boolean);

    res.json({ users: results });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await Post.find({ user: req.params.userId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        followersCount: user.followers.length,
        followingCount: user.following.length
      },
      posts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow/unfollow user
router.post('/:userId/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.userId); // From auth middleware

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToFollow._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const isFollowing = currentUser.following.some(
      (entry) => toIdString(entry) === toIdString(userToFollow._id)
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(userToFollow._id);
      userToFollow.followers.pull(currentUser._id);
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      following: !isFollowing,
      followersCount: userToFollow.followers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a friend request
router.post('/:userId/friend-request', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const targetUser = await User.findById(req.params.userId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (toIdString(currentUser._id) === toIdString(targetUser._id)) {
      return res.status(400).json({ message: 'Cannot send a friend request to yourself' });
    }

    const isAlreadyFriend = currentUser.friends.some(
      (entry) => toIdString(entry) === toIdString(targetUser._id)
    );

    if (isAlreadyFriend) {
      return res.status(400).json({ message: 'Already friends' });
    }

    const hasOutgoing = currentUser.friendRequestsSent.some(
      (entry) => toIdString(entry) === toIdString(targetUser._id)
    );

    if (hasOutgoing) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    const hasIncoming = currentUser.friendRequestsReceived.some(
      (entry) => toIdString(entry) === toIdString(targetUser._id)
    );

    if (hasIncoming) {
      currentUser.friendRequestsReceived.pull(targetUser._id);
      targetUser.friendRequestsSent.pull(currentUser._id);

      const alreadyFriendCurrent = currentUser.friends.some(
        (entry) => toIdString(entry) === toIdString(targetUser._id)
      );
      const alreadyFriendTarget = targetUser.friends.some(
        (entry) => toIdString(entry) === toIdString(currentUser._id)
      );

      if (!alreadyFriendCurrent) {
        currentUser.friends.push(targetUser._id);
      }

      if (!alreadyFriendTarget) {
        targetUser.friends.push(currentUser._id);
      }

      await currentUser.save();
      await targetUser.save();

      return res.json({
        status: 'accepted',
        message: 'Friend request accepted'
      });
    }

    currentUser.friendRequestsSent.push(targetUser._id);
    targetUser.friendRequestsReceived.push(currentUser._id);

    await currentUser.save();
    await targetUser.save();

    res.json({
      status: 'sent',
      message: 'Friend request sent'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel an outgoing friend request
router.delete('/:userId/friend-request', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const targetUser = await User.findById(req.params.userId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.friendRequestsSent.pull(targetUser._id);
    targetUser.friendRequestsReceived.pull(currentUser._id);

    await currentUser.save();
    await targetUser.save();

    res.json({
      status: 'cancelled',
      message: 'Friend request cancelled'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept an incoming friend request
router.post('/:userId/friend-request/accept', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const requestUser = await User.findById(req.params.userId);

    if (!currentUser || !requestUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasIncoming = currentUser.friendRequestsReceived.some(
      (entry) => toIdString(entry) === toIdString(requestUser._id)
    );

    if (!hasIncoming) {
      return res.status(400).json({ message: 'No incoming friend request found' });
    }

    currentUser.friendRequestsReceived.pull(requestUser._id);
    requestUser.friendRequestsSent.pull(currentUser._id);

    const alreadyFriends = currentUser.friends.some(
      (entry) => toIdString(entry) === toIdString(requestUser._id)
    );

    if (!alreadyFriends) {
      currentUser.friends.push(requestUser._id);
    }

    const reverseAlreadyFriends = requestUser.friends.some(
      (entry) => toIdString(entry) === toIdString(currentUser._id)
    );

    if (!reverseAlreadyFriends) {
      requestUser.friends.push(currentUser._id);
    }

    await currentUser.save();
    await requestUser.save();

    res.json({
      status: 'accepted',
      message: 'Friend request accepted'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline an incoming friend request
router.post('/:userId/friend-request/decline', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const requestUser = await User.findById(req.params.userId);

    if (!currentUser || !requestUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    currentUser.friendRequestsReceived.pull(requestUser._id);
    requestUser.friendRequestsSent.pull(currentUser._id);

    await currentUser.save();
    await requestUser.save();

    res.json({
      status: 'declined',
      message: 'Friend request declined'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a follower from current user's followers list
router.delete('/:userId/follower', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const followerUser = await User.findById(req.params.userId);

    if (!currentUser || !followerUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (toIdString(currentUser._id) === toIdString(followerUser._id)) {
      return res.status(400).json({ message: 'Cannot remove yourself as follower' });
    }

    currentUser.followers.pull(followerUser._id);
    followerUser.following.pull(currentUser._id);

    await currentUser.save();
    await followerUser.save();

    res.json({
      removed: true,
      followersCount: currentUser.followers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend relationship (both directions)
router.delete('/:userId/friend', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const friendUser = await User.findById(req.params.userId);

    if (!currentUser || !friendUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (toIdString(currentUser._id) === toIdString(friendUser._id)) {
      return res.status(400).json({ message: 'Cannot remove yourself as friend' });
    }

    currentUser.friends.pull(friendUser._id);
    friendUser.friends.pull(currentUser._id);

    await currentUser.save();
    await friendUser.save();

    res.json({ removed: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, uploadProfilePicture, async (req, res) => {
  try {
    const { username, bio, firstName, middleName, lastName, email } = req.body;
    const userId = req.user.userId; // From auth middleware

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (firstName !== undefined) user.firstName = firstName;
    if (middleName !== undefined) user.middleName = middleName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      user.profilePicture = result.secure_url;

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to remove temp file:', err);
      });
    }

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
