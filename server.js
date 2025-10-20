import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import mongoose from "mongoose";
import { connectDB } from "./database/connect.js";
import { Env } from "./helpers/env.js";
import { verifyToken } from "./middlewares/authMiddleware.js";
import { checkPermission } from "./middlewares/checkPermission.js";
import { apiLimiter, loginLimiter } from "./middlewares/rateLimiter.js";
import { seedSuperAdminUser } from "./database/seeders/s_adminSeeder.js";
import { seedPermissions } from "./database/seeders/permissionsSeeder.js";
import { seedGroups } from "./database/seeders/groupSeeder.js";
import logger, { logInfo, logError, logWarn } from "./utils/logger.js";
import { SYSTEM_USER_ID, CRON_SCHEDULES, HTTP_STATUS } from "./constants/index.js";

// Imports for Automated Folder Creation
import cron from "node-cron";
import { generateArchiveFoldersCore } from "./folder/folderController.js";

// IMPORTANT: Load ALL Mongoose models FIRST to ensure schemas are registered
import * as models from "./models/index.js";

// Now import controllers and routes that use these models
import { createPdfUploadRouter } from "./routes/pdfUploadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./user/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import folderRoutes from "./folder/folderRoutes.js";
import folderReadRoutes from "./folder/folderReadRoutes.js";
import { createUser } from "./user/userController.js";
import { getSystemEvents, logSystemEvent } from "./controllers/systemEventController.js";

// Validate critical environment variables on startup
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logError(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
    'Please check your .env file.'
  );
  process.exit(1);
}

// AUTOMATED CRON JOB SETUP
const setupCronJobs = () => {
  // PRODUCTION: Use CRON_SCHEDULES.MONTHLY_FOLDER_GENERATION for monthly execution
  // TESTING: Use CRON_SCHEDULES.DAILY_TEST for daily testing
  const schedule = process.env.NODE_ENV === 'production' 
    ? CRON_SCHEDULES.MONTHLY_FOLDER_GENERATION 
    : CRON_SCHEDULES.DAILY_TEST;
  
  cron.schedule(
    schedule,
    async () => {
      const jobStartTime = new Date();
      logInfo(
        `[Cron Job] Starting payroll folder generation at ${jobStartTime.toISOString()}`
      );

      // Log the start of the system job
      if (typeof logSystemEvent === "function") {
        logSystemEvent(
          SYSTEM_USER_ID,
          "System Automated Job",
          "Starting scheduled payroll archive folder generation."
        );
      } else {
        logWarn("logSystemEvent function not available. System event not logged.");
      }

      try {
        const result = await generateArchiveFoldersCore(
          SYSTEM_USER_ID,
          "System Automated Job"
        );

        logInfo(
          `[Cron Job] Payroll folder generation complete. Created: ${result.createdCount}, Skipped: ${result.skippedCount}`
        );

        // Log the successful completion
        if (typeof logSystemEvent === "function") {
          logSystemEvent(
            SYSTEM_USER_ID,
            "System Automated Job",
            `Successfully completed payroll folder generation. Created ${result.createdCount} folders.`
          );
        }
      } catch (error) {
        logError(
          "[Cron Job] ERROR during payroll folder generation",
          error
        );

        // Log the failure
        if (typeof logSystemEvent === "function") {
          logSystemEvent(
            SYSTEM_USER_ID,
            "System Automated Job",
            `FAILED to complete payroll folder generation: ${error.message}`
          );
        }
      }
    },
    {
      scheduled: true,
      timezone: "America/St_Lucia",
    }
  );

  logInfo(
    `[Cron Job] Payroll Folder Generation scheduler active. ` +
    `Schedule: ${schedule} (${process.env.NODE_ENV === 'production' ? 'Production: 2:00 AM on 1st of month' : 'Testing: Daily at 11:34 PM'})`
  );
};

connectDB()
  .then(async () => {
    logInfo("Successfully connected to MongoDB");

    // Run the seeder functions
    await seedPermissions();
    await seedSuperAdminUser();
    await seedGroups();

    const app = express();

    // Security Middleware
    app.use(helmet({
      contentSecurityPolicy: false, // Disable for API, or configure as needed
      crossOriginEmbedderPolicy: false,
    }));

    // CORS Configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:5173', 'http://localhost:3000'];
    
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          logWarn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    // Body parsing middleware with size limits
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    
    // Sanitize data to prevent NoSQL injection
    app.use(mongoSanitize());
    
    // Compression
    app.use(compression());
    
    // General API rate limiting (applies to all routes)
    // TEMPORARILY DISABLED - Rate limiting paused for development
    // app.use('/api/', apiLimiter);

    // Health check endpoint (no auth required)
    app.get('/health', (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Authentication routes (with rate limiting on login)
    // TEMPORARILY DISABLED - Rate limiting paused for development
    // app.use("/api/auth/login", loginLimiter);
    app.use("/api/auth", authRoutes);

    // User routes (includes createUser with authentication)
    app.use("/users", verifyToken, userRoutes);

    // Role routes
    app.use("/roles", roleRoutes);

    // Permission routes
    app.use("/permissions", verifyToken, permissionRoutes);

    // Folder Read Route (Accessible to all authenticated users for reading)
    app.use("/api/folders", verifyToken, folderReadRoutes);

    // Group Management Routes
    app.use(
      "/api/groups",
      verifyToken,
      checkPermission("view_all_folders"),
      groupRoutes
    );

    // Folder Management Routes
    app.use(
      "/api/folders/manage",
      verifyToken,
      checkPermission("view_all_folders"),
      folderRoutes
    );

    // PDF Upload Route
    const pdfRouter = createPdfUploadRouter(mongoose.connection);
    app.use("/api/pdfs", verifyToken, pdfRouter);

    // System Events Route
    app.get(
      "/api/system-events",
      verifyToken,
      checkPermission("view_system_events"), // Requires 'view_system_events' permission
      getSystemEvents
    );

    // Root endpoint
    app.get("/", (req, res) => {
      res.json({
        message: "GOSL Payroll API",
        version: "1.0.0",
        status: "running"
      });
    });
    
    // 404 handler
    app.use((req, res) => {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        message: "Route not found",
        path: req.path
      });
    });
    
    // Global error handler
    app.use((err, req, res, next) => {
      logError('Unhandled error', err, {
        path: req.path,
        method: req.method,
      });
      
      res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      });
    });

    const PORT = Env.get("PORT", 3000);
    const server = app.listen(PORT, () => {
      logInfo(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      
      // WARNING: Rate limiting is temporarily disabled
      console.log('\n' + '='.repeat(80));
      console.log('⚠️  WARNING: RATE LIMITING IS DISABLED FOR DEVELOPMENT');
      console.log('='.repeat(80));
      console.log('The following rate limiters are currently DISABLED:');
      console.log('  • General API Rate Limiter (/api/*)');
      console.log('  • Login Rate Limiter (/api/auth/login)');
      console.log('  • Upload Rate Limiter (PDF uploads)');
      console.log('\n📝 TODO: Re-enable rate limiting before deploying to production!');
      console.log('   Location: server.js (lines 172, 184) and pdfUploadRoutes.js (line 66)');
      console.log('='.repeat(80) + '\n');
      
      setupCronJobs();
    });
    
    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logInfo(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logInfo('HTTP server closed');
        
        try {
          await mongoose.connection.close();
          logInfo('MongoDB connection closed');
          process.exit(0);
        } catch (err) {
          logError('Error during shutdown', err);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logError('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled Rejection at:', reason);
    });
    
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  })
  .catch((error) => {
    logError("Failed to connect to MongoDB", error);
    process.exit(1);
  });
