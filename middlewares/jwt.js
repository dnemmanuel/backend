import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js'; 

const JWT_SECRET = Env.get('JWT_SECRET', 'your-secret-key');

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in your environment.');
  throw new Error('JWT_SECRET is required');
}

/**
 * Middleware to verify a JSON Web Token (JWT) from the request's Authorization header.
 * If the token is valid, it adds the token's payload to the request object as `req.user`.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The next middleware function.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Token missing' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token part

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Check for specific JWT errors
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Token expired' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
      } else {
        return res.status(500).json({ message: 'Internal server error during token verification' });
      }
    }

    // If the token is valid, attach the decoded payload to the request object
    req.user = decoded; // IMPORTANT: Now you have user data in req.user
    next();
  });
};