import jwt from 'jsonwebtoken';
import { Env } from '../helpers/env.js';
import User from '../user/userModel.js'; // 💡 Import User model

export const verifyToken = async (req, res, next) => { // 💡 MUST be async
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

  const jwtSecret = Env.get('JWT_SECRET');
  console.log('Backend verifyToken: JWT_SECRET being used:', jwtSecret);
  if (!jwtSecret) {
    console.error('Backend verifyToken: ERROR: JWT_SECRET is undefined or empty!');
    return res.status(500).json({ message: 'Server configuration error: JWT Secret missing.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    // 💡 FIX 1: Log the correct property name to verify the ID extraction
    console.log('Backend verifyToken: Decoded Token Payload (User ID):', decoded._id); 

    // 🛑 CRITICAL FIX 2: Ensure the Mongoose query uses the correct payload property: decoded._id
    const user = await User.findById(decoded._id)
        .populate({
            path: 'role',
            populate: {
                path: 'permissions',
                select: 'key' // We only need the key to perform authorization checks
            }
        })
        .select('-password'); // Exclude password
        
    if (!user) {
        // This should now only trigger if the user was deleted but the token is still valid.
        return res.status(401).json({ message: 'Unauthorized: User associated with token not found.' });
    }
    
    // Attach the fully populated user (including role and permissions) to the request
    req.user = user; 
    
    next();
  } catch (err) {
    // 🛑 NEW DEBUG LOGGING: CHECK THE EXCEPTION
    console.error('Backend verifyToken: Mongoose Query/Token verification failed:', err.message, err); 
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    // Handle case where JWT is invalid or Mongoose population failed
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
 
export const authorise = (roles) => {
// ... (The old authorise logic is now obsolete and should be replaced by checkPermission)
// For safety, you should remove this function entirely once you've replaced all its uses.
  console.log('Backend authorise: Middleware active. ⚠️ This function is deprecated! Use checkPermission.');
  return (req, res, next) => {
    console.log('Backend authorise: User role from token:', req.user ? req.user.role : 'N/A');
    console.log('Backend authorise: Required roles:', roles);
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('Backend authorise: Authorization failed for role:', req.user ? req.user.role : 'N/A');
      return res.status(403).json({ message: 'Forbidden: Access denied for this role.' });
    }
    next();
  };
};