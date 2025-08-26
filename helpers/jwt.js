import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js';

const JWT_SECRET = Env.get('JWT_SECRET', 'your-secret-key');

/**
 * Generates a JSON Web Token (JWT) for a given payload.
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '2h',
  });
};