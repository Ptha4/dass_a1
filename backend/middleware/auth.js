const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

exports.protect = function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Optional auth: set req.user if valid token, otherwise continue without it
exports.optionalProtect = function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return next();
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
    } catch (err) { /* ignore */ }
    next();
};

// Admin middleware: check if user is admin
exports.requireAdmin = function (req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
};