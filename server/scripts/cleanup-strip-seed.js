require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

const buildAvatarUrl = (seed) => {
  const safeSeed = encodeURIComponent(seed || 'instrevi-user');
  return `https://api.dicebear.com/9.x/thumbs/png?seed=${safeSeed}&size=128`;
};

async function cleanupStripSeed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instrevi');

  const seedPosts = await Post.find({ caption: { $regex: '^\\[STRIP-SEED\\]' } }).select('_id user');
  const postIds = seedPosts.map((post) => post._id);
  const seedUserIds = Array.from(new Set(seedPosts.map((post) => String(post.user))));

  let postsRemoved = 0;
  if (postIds.length > 0) {
    const deleteResult = await Post.deleteMany({ _id: { $in: postIds } });
    postsRemoved = deleteResult.deletedCount || 0;

    await User.updateMany(
      { posts: { $in: postIds } },
      { $pull: { posts: { $in: postIds } } }
    );
  }

  let avatarsReset = 0;
  let avatarsSkipped = 0;

  if (seedUserIds.length > 0) {
    const users = await User.find({ _id: { $in: seedUserIds } }).select('_id username profilePicture');

    for (const user of users) {
      const expectedAvatar = buildAvatarUrl(user.username || String(user._id));
      const currentAvatar = typeof user.profilePicture === 'string' ? user.profilePicture.trim() : '';

      if (currentAvatar && currentAvatar === expectedAvatar) {
        user.profilePicture = '';
        await user.save();
        avatarsReset += 1;
      } else {
        avatarsSkipped += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'OK',
        postsMatched: postIds.length,
        postsRemoved,
        usersMatched: seedUserIds.length,
        avatarsReset,
        avatarsSkipped,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

cleanupStripSeed().catch(async (error) => {
  console.error('ERR', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
  }
  process.exit(1);
});
