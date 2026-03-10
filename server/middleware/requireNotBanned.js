const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentUser = await User.findById(req.user.userId).select('isBanned');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (currentUser.isBanned) {
      return res.status(403).json({ message: 'Your account is banned from this action' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
