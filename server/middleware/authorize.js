const authorize = (permissions) => {
  return (req, res, next) => {
    console.log('User role:', req.user.role);
    console.log('User permissions:', req.user.permissions);
    console.log('Required permissions:', permissions);

    if (req.user.role === 'Admin') {
      return next();
    }

    if (!permissions || permissions.length === 0) {
      return next();
    }

    const hasPermission = permissions.some(p => req.user.permissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

module.exports = authorize;
