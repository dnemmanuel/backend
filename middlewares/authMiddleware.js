import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js'; // Ensure this path is correct

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Backend verifyToken: Incoming Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Backend verifyToken: No Authorization header or malformed.');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Backend verifyToken: Extracted Token:', token ? token.substring(0, 30) + '...' : 'None');

  if (!token) {
    console.log('Backend verifyToken: Token is empty after splitting.');
    return res.status(401).json({ message: 'Unauthorized: Token is malformed' });
  }

  // --- CRITICAL DEBUG LOG FOR JWT_SECRET ---
  const jwtSecret = Env.get('JWT_SECRET');
  console.log('Backend verifyToken: JWT_SECRET being used:', jwtSecret);
  if (!jwtSecret) {
    console.error('Backend verifyToken: ERROR: JWT_SECRET is undefined or empty!');
    return res.status(500).json({ message: 'Server configuration error: JWT Secret missing.' });
  }
  // --- END CRITICAL DEBUG LOG ---

  try {
    const decoded = jwt.verify(token, jwtSecret); // Use the variable
    console.log('Backend verifyToken: Token decoded successfully!', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Backend verifyToken: Token verification failed:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export const authorise = (roles) => {
  console.log('Backend authorise: Middleware active.');
  return (req, res, next) => {
    console.log('Backend authorise: User role from token:', req.user ? req.user.role : 'N/A');
    console.log('Backend authorise: Required roles:', roles);
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('Backend authorise: Authorization failed for role.');
      return res.status(403).json({ message: 'Forbidden: You do not have the necessary role' });
    }
    console.log('Backend authorise: Authorization successful for role.');
    next();
  };
};
