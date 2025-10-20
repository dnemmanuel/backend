import winston from 'winston';

// Determine the log level based on NODE_ENV
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create Winston logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gosl-payroll-api' },
  transports: [
    // Write errors to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// In development, also log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// In production, log to console but without sensitive data
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.simple()
    ),
  }));
}

// Create a stream object for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper functions for common logging patterns
export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logError = (message, error = null, meta = {}) => {
  if (error) {
    logger.error(message, { ...meta, error: error.message, stack: error.stack });
  } else {
    logger.error(message, meta);
  }
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// Sanitize sensitive data from logs
export const sanitizeLogData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'jwt', 'secret', 'authorization'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

export default logger;
