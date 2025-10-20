import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js';
import User from '../user/userModel.js';
import { logError, logWarn, logDebug } from '../utils/logger.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logWarn('Auth attempt without valid Authorization header', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: ERROR_MESSAGES.UNAUTHORIZED 
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    logWarn('Auth header present but token empty', { ip: req.ip });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: ERROR_MESSAGES.TOKEN_INVALID 
    });
  }

  const jwtSecret = Env.get('JWT_SECRET');
  if (!jwtSecret) {
    logError('JWT_SECRET is not configured');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      message: ERROR_MESSAGES.CONFIG_ERROR 
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    
    logDebug('Token verified successfully', { userId: decoded._id });

    const user = await User.findById(decoded._id)
        .populate({
            path: 'role',
            populate: {
                path: 'permissions',
                select: 'key'
            }
        })
        .select('-password');
        
    if (!user) {
        logWarn('Valid token but user not found', { userId: decoded._id });
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          message: ERROR_MESSAGES.USER_NOT_FOUND 
        });
    }
    
    if (!user.isActive) {
        logWarn('Inactive user attempted access', { userId: user._id });
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          message: ERROR_MESSAGES.USER_INACTIVE 
        });
    }
    
    req.user = user;
    
    logDebug('User authenticated successfully', {
      userId: user._id,
      role: user.role?.name,
      permissionsCount: user.role?.permissions?.length || 0,
    });
    
    next();
  } catch (err) {
    logError('Token verification failed', err, {
      ip: req.ip,
      path: req.path,
    });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: ERROR_MESSAGES.TOKEN_EXPIRED 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: ERROR_MESSAGES.TOKEN_INVALID 
      });
    }
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: ERROR_MESSAGES.TOKEN_INVALID 
    });
  }
};