/**
 * Authentication middleware and utilities for VAL
 * Placeholder implementation for demonstration
 */

const jwt = require('jsonwebtoken');

// Mock user database
const users = [
  {
    id: 'user-1',
    email: 'john@gemsquash.com',
    name: 'John Consultant',
    role: 'consultant',
    password: 'password123' // In production, this would be hashed
  },
  {
    id: 'user-3',
    email: 'admin@gemsquash.com',
    name: 'Admin User',
    role: 'admin',
    password: 'admin123'
  }
];

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'val-secret-key-change-in-production';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid access token'
    });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Your access token is invalid or has expired'
    });
  }

  req.user = user;
  next();
}

/**
 * Role-based authorization middleware
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

/**
 * Mock login function
 */
function login(email, password) {
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token: generateToken(user)
  };
}

/**
 * Mock user registration
 */
function register(userData) {
  // Check if user already exists
  const existingUser = users.find(u => u.email === userData.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser = {
    id: `user-${users.length + 1}`,
    email: userData.email,
    name: userData.name,
    role: userData.role || 'consultant',
    password: userData.password // In production, hash this
  };

  users.push(newUser);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = newUser;

  return {
    user: userWithoutPassword,
    token: generateToken(newUser)
  };
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get all users (admin only)
 */
function getAllUsers() {
  return users.map(({ password, ...user }) => user);
}

/**
 * Update user role (admin only)
 */
function updateUserRole(userId, newRole) {
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error('User not found');
  }

  const validRoles = ['consultant', 'admin'];
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role');
  }

  user.role = newRole;

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Permission check functions
 */
const permissions = {
  // Can view all clients
  canViewAllClients: (user) => ['consultant', 'admin'].includes(user.role),

  // Can create new clients
  canCreateClients: (user) => ['consultant', 'admin'].includes(user.role),

  // Can delete clients
  canDeleteClients: (user) => ['consultant', 'admin'].includes(user.role),

  // Can view system settings
  canViewSettings: (user) => ['admin'].includes(user.role),

  // Can manage users
  canManageUsers: (user) => ['admin'].includes(user.role),

  // Can access all client data
  canAccessAllClientData: (user) => ['consultant', 'admin'].includes(user.role)
};

/**
 * Check user permissions
 */
function checkPermission(user, permission) {
  if (permissions[permission]) {
    return permissions[permission](user);
  }
  return false;
}

/**
 * Middleware to check specific permissions
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!checkPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}

/**
 * Rate limiting for auth endpoints
 */
const authAttempts = new Map();

function rateLimitAuth(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!authAttempts.has(clientIp)) {
    authAttempts.set(clientIp, { attempts: 0, resetTime: now + windowMs });
  }

  const clientData = authAttempts.get(clientIp);

  if (now > clientData.resetTime) {
    clientData.attempts = 0;
    clientData.resetTime = now + windowMs;
  }

  if (clientData.attempts >= maxAttempts) {
    const remainingTime = Math.ceil((clientData.resetTime - now) / 1000 / 60);
    return res.status(429).json({
      error: 'Too many attempts',
      message: `Too many authentication attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60
    });
  }

  clientData.attempts += 1;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authorizeRole,
  login,
  register,
  getUserById,
  getAllUsers,
  updateUserRole,
  checkPermission,
  requirePermission,
  rateLimitAuth,
  permissions
};