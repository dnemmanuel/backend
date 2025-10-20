import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js';
import { JWT_EXPIRY } from '../constants/index.js';
import { logError } from '../utils/logger.js';

// CRITICAL: Validate JWT_SECRET exists on module load
const JWT_SECRET = Env.get('JWT_SECRET');

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  const error = new Error(
    'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set or is too short. ' +
    'Please set a strong JWT_SECRET (at least 32 characters) in your .env file.'
  );
  logError('JWT_SECRET validation failed', error);
  throw error;
}

/**
 * Generates a JSON Web Token (JWT) for a given payload.
 * @param {Object} payload - The data to encode in the token
 * @param {string} [expiresIn] - Optional expiry time (defaults to constant)
 * @returns {string} The signed JWT token
 */
export const generateToken = (payload, expiresIn = JWT_EXPIRY) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
};

/**
 * Verifies a JWT token and returns the decoded payload.
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};