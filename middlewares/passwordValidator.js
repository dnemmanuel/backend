import { VALIDATION, HTTP_STATUS } from '../constants/index.js';

/**
 * Middleware to validate password strength
 * Ensures passwords meet security requirements
 */
export const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Password is required',
    });
  }
  
  // Check minimum length
  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters long`,
    });
  }
  
  // Check maximum length
  if (password.length > VALIDATION.PASSWORD.MAX_LENGTH) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: `Password must not exceed ${VALIDATION.PASSWORD.MAX_LENGTH} characters`,
    });
  }
  
  // Check complexity (uppercase, lowercase, number, special char)
  if (!VALIDATION.PASSWORD.REGEX.test(password)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: VALIDATION.PASSWORD.MESSAGE,
      requirements: {
        minLength: VALIDATION.PASSWORD.MIN_LENGTH,
        uppercase: 'At least one uppercase letter (A-Z)',
        lowercase: 'At least one lowercase letter (a-z)',
        number: 'At least one number (0-9)',
        specialChar: 'At least one special character (@$!%*?&#)',
      },
    });
  }
  
  next();
};

/**
 * Middleware to check if password confirmation matches
 */
export const validatePasswordConfirmation = (req, res, next) => {
  const { password, passwordConfirmation } = req.body;
  
  if (passwordConfirmation && password !== passwordConfirmation) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: 'Password and password confirmation do not match',
    });
  }
  
  next();
};
