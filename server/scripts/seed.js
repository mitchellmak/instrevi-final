require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const user = await User.findOne({ email: 'dev+local@instrevi.test' });
  if (!user) {
    console.error('Test user not found. Create the test user first via /api/auth/register');
    process.exit(1);
  }

  const post = new Post({
    caption: 'Welcome — sample post (seeded)',
    image: 'https://placehold.co/600x400',
    user: user._id,
  });

  await post.save();
  user.posts.push(post._id);
  await user.save();

  console.log('Seeded post:', post._id.toString());
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});