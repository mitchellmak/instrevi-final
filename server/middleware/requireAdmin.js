const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.userId).select('isAdmin isBanned email username');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account is banned' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
