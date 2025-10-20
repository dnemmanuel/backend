import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, HTTP_STATUS } from '../constants/index.js';
import { logWarn } from '../utils/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_GENERAL.WINDOW_MS,
  max: RATE_LIMITS.API_GENERAL.MAX_REQUESTS,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: RATE_LIMITS.API_GENERAL.MESSAGE,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logWarn('Rate limit exceeded for general API', {
      ip: req.ip,
      path: req.path,
    });
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      message: RATE_LIMITS.API_GENERAL.MESSAGE,
    });
  },
});

// Strict rate limiter for login endpoint
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS.LOGIN.WINDOW_MS,
  max: RATE_LIMITS.LOGIN.MAX_REQUESTS,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: RATE_LIMITS.LOGIN.MESSAGE,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
  handler: (req, res, next, options) => {
    logWarn('Rate limit exceeded for login', {
      ip: req.ip,
      username: req.body?.username || 'unknown',
    });
    
    // Calculate remaining time in seconds
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    // Set Retry-After header
    res.setHeader('Retry-After', retryAfter);
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      message: RATE_LIMITS.LOGIN.MESSAGE,
      retryAfter: retryAfter,
    });
  },
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMITS.FILE_UPLOAD.WINDOW_MS,
  max: RATE_LIMITS.FILE_UPLOAD.MAX_REQUESTS,
  message: {
    status: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: RATE_LIMITS.FILE_UPLOAD.MESSAGE,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Rate limit exceeded for file upload', {
      ip: req.ip,
      userId: req.user?._id || 'unknown',
    });
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      message: RATE_LIMITS.FILE_UPLOAD.MESSAGE,
    });
  },
});
