// middlewares/checkPermission.js

/**
 * Middleware to check if the authenticated user's assigned role
 * contains a specific, required permission key.
 * * @param {string} requiredPermissionKey The machine-readable key (e.g., 'create_user').
 * @returns {function} Express middleware function.
 */
export const checkPermission = (requiredPermissionKey) => {
  return (req, res, next) => {
    // 1. Initial Check: Ensure user data is populated from a preceding middleware (e.g., verifyToken)
    if (!req.user || !req.user.role || !req.user.role.permissions) {
      // This indicates a configuration error in the verifyToken middleware (it should populate role/permissions)
      console.error("Authorization Check Failed: User or Role permissions not loaded in req.user.");
      return res.status(403).json({ message: 'Access Denied: Insufficient user data for authorization check.' });
    }

    // 2. Permission Check: Check if the required key exists in the role's permissions array.
    // The permissions array contains populated objects, so we check the 'key' field.
    const hasPermission = req.user.role.permissions.some(p => p.key === requiredPermissionKey);

    if (hasPermission) {
      next(); // User has the required permission
    } else {
      // 3. Deny Access
      console.log(`Authorization Check Failed: User role missing permission: ${requiredPermissionKey}`);
      res.status(403).json({ 
          message: `Forbidden: Missing required permission - ${requiredPermissionKey}.` 
      });
    }
  };
};