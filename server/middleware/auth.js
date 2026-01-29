const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

module.exports = async function (req, res, next) { // Make the middleware async
  // Get token from header
  const authHeader = req.header('Authorization');
  console.log('Auth header:', authHeader);

  // Check if not token
  if (!authHeader) {
    console.log('No token');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token:', token);

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Fetch the user from the database to get up-to-date permissions
    const user = await User.findById(decoded.id).populate('permissions');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach the user object with populated permissions to req.user
    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions.map(p => p.name)
    };
    next();
  } catch (err) {
    console.log('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
