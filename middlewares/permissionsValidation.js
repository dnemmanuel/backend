import { body } from 'express-validator';

export const permissionValidation = [
    // --- Key Validation ---
    body('key')
        .trim()
        .notEmpty().withMessage('Permission Key is required.')
        .isLength({ min: 3, max: 100 }).withMessage('Key must be between 3 and 100 characters.')
        // Enforces a standard for permission keys (e.g., 'manage_users', 'view_payroll')
        .matches(/^[a-z0-9_]+$/).withMessage('Key must be lowercase, alphanumeric, and can only contain underscores (_).'),
    
    // --- Name Validation ---
    body('name')
        .trim()
        .notEmpty().withMessage('Permission Name is required.')
        .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters.'),

    // --- Description Validation ---
    body('description')
        .optional({ checkFalsy: true }) // Allows it to be an empty string
        .trim()
        .isLength({ max: 250 }).withMessage('Description cannot exceed 250 characters.'),
];