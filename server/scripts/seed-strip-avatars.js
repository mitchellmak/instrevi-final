require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

const buildAvatarUrl = (seed) => {
  const safeSeed = encodeURIComponent(seed || 'instrevi-user');
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${safeSeed}&size=128`;
};

async function seedStripAvatars() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instrevi');

  const userIds = await Post.distinct('user', {
    caption: { $regex: '^\\[STRIP-SEED\\]' },
  });

  if (!userIds.length) {
    console.log(
      JSON.stringify(
        {
          status: 'NO_STRIP_SEED_POSTS',
          usersMatched: 0,
          updatedUsers: 0,
        },
        null,
        2
      )
    );
    await mongoose.disconnect();
    return;
  }

  const users = await User.find({ _id: { $in: userIds } }).select('_id username profilePicture').sort({ createdAt: 1 });

  let updatedUsers = 0;
  const preview = [];

  for (const user of users) {
    const hasProfilePicture = typeof user.profilePicture === 'string' && user.profilePicture.trim().length > 0;
    const avatarUrl = buildAvatarUrl(user.username || String(user._id));

    if (!hasProfilePicture) {
      user.profilePicture = avatarUrl;
      await user.save();
      updatedUsers += 1;
    }

    preview.push({
      userId: String(user._id),
      username: user.username,
      profilePicture: hasProfilePicture ? user.profilePicture : avatarUrl,
      changed: !hasProfilePicture,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: 'OK',
        usersMatched: users.length,
        updatedUsers,
        alreadyHadProfilePicture: users.length - updatedUsers,
        preview,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

seedStripAvatars().catch(async (error) => {
  console.error('ERR', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
  }
  process.exit(1);
});
