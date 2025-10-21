import express from 'express';
import {
  createSubmission,
  getAllSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  getSubmissionsByFolder,
  deleteSubmission,
  uploadFiles,
  downloadFile,
  viewFile,
} from './submissionController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/submissions
 * Create a new submission
 */
router.post('/', createSubmission);

/**
 * GET /api/submissions
 * Get all submissions (with optional filters)
 * Query params: status, formType, ministry, folderId, startDate, endDate
 */
router.get('/', getAllSubmissions);

/**
 * GET /api/submissions/:id
 * Get single submission by ID
 */
router.get('/:id', getSubmissionById);

/**
 * PUT /api/submissions/:id/status
 * Update submission status (approve, reject, move)
 */
router.put('/:id/status', updateSubmissionStatus);

/**
 * GET /api/submissions/folder/:folderId
 * Get all submissions in a specific folder
 */
router.get('/folder/:folderId', getSubmissionsByFolder);

/**
 * DELETE /api/submissions/:id
 * Delete a submission (admin only)
 */
router.delete('/:id', deleteSubmission);

/**
 * POST /api/submissions/upload
 * Upload files for a submission
 */
router.post('/upload', upload.array('files', 10), uploadFiles);

/**
 * GET /api/submissions/:submissionId/files/:fileId/download
 * Download a file from a submission
 */
router.get('/:submissionId/files/:fileId/download', downloadFile);

/**
 * GET /api/submissions/:submissionId/files/:fileId/view
 * View a file from a submission (inline, not download)
 */
router.get('/:submissionId/files/:fileId/view', viewFile);

export default router;
