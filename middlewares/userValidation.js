// middlewares/userValidation.js

import { body } from 'express-validator';

export const createUserValidation = [
    // Username validation
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required.')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters.')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),

    // Password validation
    body('password')
        .notEmpty().withMessage('Password is required.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),

    // Email validation
    body('email')
        .isEmail().withMessage('Invalid email address.')
        .normalizeEmail(),

    // First Name validation
    body('firstName')
        .trim()
        .notEmpty().withMessage('First Name is required.')
        .isLength({ max: 50 }).withMessage('First Name cannot exceed 50 characters.'),

    // Last Name validation
    body('lastName')
        .trim()
        .notEmpty().withMessage('Last Name is required.')
        .isLength({ max: 50 }).withMessage('Last Name cannot exceed 50 characters.'),

    // Role validation (Assuming role is an ObjectId string)
    body('role')
        .isMongoId().withMessage('Invalid Role ID format.'),
 
    // Ministry validation
    body('ministry')
        .trim()
        .notEmpty().withMessage('Ministry is required.'),
];