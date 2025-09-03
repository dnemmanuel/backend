// models/index.js
import User from './userModel.js';
import SystemEvent from './systemEventModel.js';
// Import all other Mongoose models here if you have them, e.g.:
// import Role from './roleModel.js';
// import Permission from './permissionModel.js';
// import SecurityRequest from './securityRequestModel.js';

export {
  User,
  SystemEvent,
  // Export all other models here
  // Role,
  // Permission,
  // SecurityRequest,
};

// This file simply ensures all model schemas are registered with Mongoose
// as soon as this file is imported anywhere in your application.
