// Backend Application Constants

// ===== STORAGE KEYS =====
export const TOKEN_KEY = 'jwt_token';
export const USER_ROLE_KEY = 'user_role';
export const USER_ID_KEY = 'user_id';
export const USERNAME_KEY = 'username';
export const PERMISSIONS_KEY = 'user_permissions';
export const ROLE_ID_KEY = 'role_id';

// ===== SYSTEM USER =====
// Placeholder ID for system-generated actions (cron jobs, automated tasks)
export const SYSTEM_USER_ID = '000000000000000000000000';
export const SYSTEM_USER_NAME = 'System Automated Job';

// ===== PERMISSION KEYS =====
// User Management
export const PERMISSIONS = {
  // User Management
  VIEW_USER_MANAGER: 'view_user_manager',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // Role Management
  VIEW_ROLES: 'view_roles',
  CREATE_ROLE: 'create_role',
  UPDATE_ROLE: 'update_role',
  DELETE_ROLE: 'delete_role',
  
  // Permission Management
  VIEW_PERMISSIONS: 'view_permissions',
  MANAGE_PERMISSIONS: 'manage_permissions',
  
  // Folder Management
  VIEW_FOLDER: 'view_folder',
  VIEW_ALL_FOLDERS: 'view_all_folders',
  CREATE_FOLDER: 'create_folder',
  UPDATE_FOLDER: 'update_folder',
  DELETE_FOLDER: 'delete_folder',
  
  // Payroll & PDFs
  PAYROLL_VIEW: 'payroll_view',
  UPLOAD_PAYROLL_PDFS: 'upload_payroll_pdfs',
  DOWNLOAD_PAYROLL_PDFS: 'download_payroll_pdfs',
  DELETE_PAYROLL_PDFS: 'delete_payroll_pdfs',
  
  // System
  VIEW_SYSTEM_EVENTS: 'view_system_events',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
};

// ===== FOLDER GROUPS =====
export const FOLDER_GROUPS = {
  PAYROLL_ARCHIVE: 'PayrollArchive',
  FINANCE: 'Finance',
  HRM: 'HRM Public Service',
  GENERAL: 'General',
};

// ===== FOLDER THEMES =====
export const FOLDER_THEMES = {
  BLUE: 'blue',
  GREEN: 'green',
  RED: 'red',
  ORANGE: 'orange',
  PURPLE: 'purple',
  GRAY: 'gray',
};

// ===== ROLES =====
export const ROLES = {
  SUPER_ADMIN: 's-admin',
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

// ===== JWT =====
export const JWT_EXPIRY = '2h';
export const JWT_REFRESH_EXPIRY = '7d';

// ===== FILE UPLOAD =====
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_MIME_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf'],
};

// ===== CRON SCHEDULES =====
export const CRON_SCHEDULES = {
  // Runs at 2:00 AM on the 1st day of every month
  MONTHLY_FOLDER_GENERATION: '0 2 1 * *',
  // For testing: every day at 11:34 PM
  DAILY_TEST: '34 23 * * *',
};

// ===== HTTP STATUS CODES =====
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// ===== RATE LIMITING =====
export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5, // 5 attempts per window
    MESSAGE: 'Too many login attempts. Please try again in 15 minutes.',
  },
  API_GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // 100 requests per window
    MESSAGE: 'Too many requests. Please try again later.',
  },
  FILE_UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 50, // 50 uploads per hour
    MESSAGE: 'Too many file uploads. Please try again later.',
  },
};

// ===== VALIDATION =====
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    // Regex: At least 1 uppercase, 1 lowercase, 1 number, 1 special char
    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    MESSAGE: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
  },
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid username or password',
  UNAUTHORIZED: 'Unauthorized: No token provided',
  TOKEN_EXPIRED: 'Unauthorized: Token expired',
  TOKEN_INVALID: 'Unauthorized: Invalid token',
  FORBIDDEN: 'Forbidden: Insufficient permissions',
  
  // Users
  USER_NOT_FOUND: 'User not found',
  USER_EXISTS: 'Username or email already exists',
  USER_INACTIVE: 'User account is inactive',
  
  // Roles & Permissions
  ROLE_NOT_FOUND: 'Role not found',
  PERMISSION_NOT_FOUND: 'Permission not found',
  MISSING_PERMISSION: 'Missing required permission',
  
  // Folders
  FOLDER_NOT_FOUND: 'Folder not found',
  FOLDER_EXISTS: 'Folder already exists',
  
  // Files
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_UPLOAD_FAILED: 'File upload failed',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD_MISSING: 'Required field is missing',
  
  // Server
  INTERNAL_ERROR: 'Internal server error',
  DB_CONNECTION_ERROR: 'Database connection error',
  CONFIG_ERROR: 'Server configuration error',
};

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  ROLE_CREATED: 'Role created successfully',
  ROLE_UPDATED: 'Role updated successfully',
  FOLDER_CREATED: 'Folder created successfully',
  FOLDER_UPDATED: 'Folder updated successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully',
};
