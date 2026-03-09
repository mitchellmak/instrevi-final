require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

async function seedStripPosts() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instrevi');

  const users = await User.find({}).select('_id username').sort({ createdAt: 1 }).limit(8);
  if (users.length === 0) {
    console.log('NO_USERS');
    await mongoose.disconnect();
    return;
  }

  const oldSeedPosts = await Post.find({ caption: { $regex: '^\\[STRIP-SEED\\]' } }).select('_id');
  const oldSeedIds = oldSeedPosts.map((post) => post._id);

  if (oldSeedIds.length > 0) {
    await Post.deleteMany({ _id: { $in: oldSeedIds } });
    await User.updateMany(
      { posts: { $in: oldSeedIds } },
      { $pull: { posts: { $in: oldSeedIds } } }
    );
  }

  const placeholders = [
    'https://placehold.co/1200x800?text=Instrevi+1',
    'https://placehold.co/1200x800?text=Instrevi+2',
    'https://placehold.co/1200x800?text=Instrevi+3',
    'https://placehold.co/1200x800?text=Instrevi+4',
    'https://placehold.co/1200x800?text=Instrevi+5',
    'https://placehold.co/1200x800?text=Instrevi+6',
  ];

  const now = Date.now();
  const docs = [];

  users.forEach((user, index) => {
    const baseOffset = (users.length - index) * 60 * 60 * 1000;
    const reviewDate = new Date(now - baseOffset - 20 * 60 * 1000);
    const unboxingDate = new Date(now - baseOffset);

    const otherUserIds = users
      .filter((candidate) => String(candidate._id) !== String(user._id))
      .map((candidate) => candidate._id);

    const reviewLikes = otherUserIds.slice(0, Math.min(otherUserIds.length, (index % 4) + 1));
    const unboxingLikes = otherUserIds.slice(0, Math.min(otherUserIds.length, (index % 3) + 1));

    docs.push({
      postType: 'review',
      title: `Seed Review ${index + 1}`,
      category: 'Food',
      caption: `[STRIP-SEED] @${user.username} review sample`,
      image: placeholders[index % placeholders.length],
      user: user._id,
      rating: (index % 5) + 1,
      likes: reviewLikes,
      createdAt: reviewDate,
      updatedAt: reviewDate,
    });

    docs.push({
      postType: 'unboxing',
      title: `Seed Unboxing ${index + 1}`,
      category: 'Product',
      caption: `[STRIP-SEED] @${user.username} unboxing sample`,
      image: placeholders[(index + 1) % placeholders.length],
      user: user._id,
      likes: unboxingLikes,
      createdAt: unboxingDate,
      updatedAt: unboxingDate,
    });
  });

  const inserted = await Post.insertMany(docs, { ordered: false });
  const idsByUser = new Map();

  inserted.forEach((post) => {
    const key = String(post.user);
    if (!idsByUser.has(key)) {
      idsByUser.set(key, []);
    }
    idsByUser.get(key).push(post._id);
  });

  await Promise.all(
    users.map((user) =>
      User.updateOne(
        { _id: user._id },
        { $addToSet: { posts: { $each: idsByUser.get(String(user._id)) || [] } } }
      )
    )
  );

  console.log(
    JSON.stringify(
      {
        status: 'OK',
        usersSeeded: users.length,
        postsInserted: inserted.length,
        oldSeedPostsRemoved: oldSeedIds.length,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

seedStripPosts().catch(async (error) => {
  console.error('ERR', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
  }
  process.exit(1);
});
