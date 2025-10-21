import Submission from './submissionModel.js';
import Folder from '../folder/folderModel.js';
import { logSystemEvent } from '../controllers/systemEventController.js';
import path from 'path';
import fs from 'fs';

/**
 * Create a new submission
 * POST /api/submissions
 */
export const createSubmission = async (req, res) => {
  try {
    console.log('📥 Received submission request:', {
      formType: req.body.formType,
      targetFolderId: req.body.targetFolderId,
      hasFormData: !!req.body.formData,
      user: req.user?.username
    });

    const { formType, targetFolderId, formData, payrollPeriod, attachments } = req.body;

    if (!formType || !targetFolderId || !formData) {
      console.error('❌ Missing required fields:', { formType, targetFolderId, hasFormData: !!formData });
      return res.status(400).json({
        message: 'Missing required fields: formType, targetFolderId, formData',
      });
    }

    // Log attachments if present
    if (attachments && attachments.length > 0) {
      console.log('📎 Attachments received:', attachments.length, 'files');
    }

    // Verify target folder exists
    const targetFolder = await Folder.findById(targetFolderId);
    if (!targetFolder) {
      console.error('❌ Target folder not found:', targetFolderId);
      return res.status(404).json({ message: 'Target folder not found' });
    }

    console.log('✅ Target folder found:', targetFolder.name);

    // Get submitter info
    const submitterMinistry = req.user.ministry || 'Unknown Ministry';
    const submitterId = req.user._id;
    const submitterName = req.user.username;

    console.log('👤 Submitter info:', { submitterId, submitterName, submitterMinistry });

    // Prepare attachments if provided
    const submissionAttachments = attachments && attachments.length > 0
      ? attachments.map(att => ({
          filename: att.name,
          originalName: att.name,
          mimetype: att.type,
          size: att.size,
          path: '', // Will be updated when file storage is implemented
          uploadedAt: new Date()
        }))
      : [];

    // Create submission
    const submission = new Submission({
      formType,
      submittedBy: submitterId,
      submitterMinistry,
      targetFolder: targetFolderId,
      currentFolder: targetFolderId,
      formData,
      attachments: submissionAttachments,
      status: 'Submitted',
      workflowHistory: [
        {
          action: 'Submitted',
          performedBy: submitterId,
          performedByName: submitterName,
          toStatus: 'Submitted',
          toFolder: targetFolderId,
          comments: `Initial submission to ${targetFolder.name}`,
          timestamp: new Date(),
        },
      ],
    });

    console.log('💾 Attempting to save submission...');
    await submission.save();
    console.log('✅ Submission saved successfully');

    // Log event
    try {
      await logSystemEvent(
        submitterId,
        submitterName,
        'Submission Created',
        `Created ${formType} submission ${submission.submissionNumber}`,
        submission._id
      );
    } catch (logError) {
      console.warn('⚠️ Failed to log system event:', logError.message);
    }

    console.log(`✅ Submission created: ${submission.submissionNumber} by ${submitterName}`);

    res.status(201).json({
      message: 'Submission created successfully',
      submission: {
        _id: submission._id,
        submissionNumber: submission.submissionNumber,
        formType: submission.formType,
        status: submission.status,
        createdAt: submission.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: 'Failed to create submission', error: error.message });
  }
};

/**
 * Get all submissions (with filtering)
 * GET /api/submissions
 */
export const getAllSubmissions = async (req, res) => {
  try {
    const {
      status,
      formType,
      ministry,
      folderId,
      startDate,
      endDate,
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (formType) query.formType = formType;
    if (ministry) query.submitterMinistry = ministry;
    if (folderId) query.currentFolder = folderId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Permission check - users can only see their own submissions unless admin
    const userRole = req.user.role?.name;
    if (userRole !== 's-admin' && userRole !== 'admin') {
      query.submittedBy = req.user._id;
    }

    const submissions = await Submission.find(query)
      .populate('submittedBy', 'username firstName lastName ministry')
      .populate('targetFolder', 'name page')
      .populate('currentFolder', 'name page')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
};

/**
 * Get single submission by ID
 * GET /api/submissions/:id
 */
export const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id)
      .populate('submittedBy', 'username firstName lastName ministry')
      .populate('targetFolder', 'name page')
      .populate('currentFolder', 'name page')
      .populate('reviewedBy', 'username firstName lastName')
      .populate('processedBy', 'username firstName lastName')
      .populate('workflowHistory.performedBy', 'username')
      .populate('workflowHistory.fromFolder', 'name')
      .populate('workflowHistory.toFolder', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Permission check
    const userRole = req.user.role?.name;
    const isOwner = submission.submittedBy._id.toString() === req.user._id.toString();
    
    if (userRole !== 's-admin' && userRole !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Failed to fetch submission' });
  }
};

/**
 * Update submission status
 * PUT /api/submissions/:id/status
 */
export const updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, newFolderId } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const oldStatus = submission.status;
    const oldFolder = submission.currentFolder;

    // Update status
    submission.status = status;

    // Update folder if provided
    if (newFolderId) {
      const newFolder = await Folder.findById(newFolderId);
      if (!newFolder) {
        return res.status(404).json({ message: 'Target folder not found' });
      }
      submission.currentFolder = newFolderId;
    }

    // Add to workflow history
    submission.workflowHistory.push({
      action: status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Moved',
      performedBy: req.user._id,
      performedByName: req.user.username,
      fromStatus: oldStatus,
      toStatus: status,
      fromFolder: oldFolder,
      toFolder: newFolderId || oldFolder,
      comments: comments || '',
      timestamp: new Date(),
    });

    // Update review info if approved or rejected
    if (status === 'Approved' || status === 'Rejected') {
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
      submission.reviewNotes = comments;
    }

    // Update processed info if processed
    if (status === 'Processed') {
      submission.processedBy = req.user._id;
      submission.processedAt = new Date();
    }

    await submission.save();

    // Log event
    await logSystemEvent(
      req.user._id,
      req.user.username,
      'Submission Updated',
      `Updated submission ${submission.submissionNumber} status to ${status}`,
      submission._id
    );

    console.log(`✅ Submission ${submission.submissionNumber} updated to ${status} by ${req.user.username}`);

    res.status(200).json({
      message: 'Submission status updated successfully',
      submission,
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ message: 'Failed to update submission' });
  }
};

/**
 * Get submissions by folder
 * GET /api/submissions/folder/:folderId
 */
export const getSubmissionsByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const submissions = await Submission.find({ currentFolder: folderId })
      .populate('submittedBy', 'username firstName lastName ministry')
      .sort({ createdAt: -1 });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions by folder:', error);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
};

/**
 * Delete submission (admin only)
 * DELETE /api/submissions/:id
 */
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findByIdAndDelete(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Log event
    await logSystemEvent(
      req.user._id,
      req.user.username,
      'Submission Deleted',
      `Deleted submission ${submission.submissionNumber}`,
      submission._id
    );

    res.status(200).json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ message: 'Failed to delete submission' });
  }
};

/**
 * Upload files and return file metadata
 * POST /api/submissions/upload
 */
export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Return file metadata that can be attached to submission
    const fileMetadata = req.files.map(file => ({
      fileId: file.filename, // Unique filename generated by multer
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date()
    }));

    console.log(`✅ Uploaded ${fileMetadata.length} files successfully`);

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: fileMetadata
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
};

/**
 * Download a file from a submission
 * GET /api/submissions/:submissionId/files/:fileId/download
 */
export const downloadFile = async (req, res) => {
  try {
    const { submissionId, fileId } = req.params;

    // Find submission and verify file exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Find the file in attachments
    const file = submission.attachments.find(att => att.fileId === fileId || att.filename === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if file exists on disk
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    const filePath = file.path || path.join(UPLOAD_DIR, 'submissions', file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found on disk:', filePath);
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`📥 Downloading file: ${file.originalName} from submission ${submissionId}`);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

/**
 * View a file from a submission (inline, not download)
 * GET /api/submissions/:submissionId/files/:fileId/view
 */
export const viewFile = async (req, res) => {
  try {
    const { submissionId, fileId } = req.params;

    // Find submission and verify file exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Find the file in attachments
    const file = submission.attachments.find(att => att.fileId === fileId || att.filename === fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if file exists on disk
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    const filePath = file.path || path.join(UPLOAD_DIR, 'submissions', file.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found on disk:', filePath);
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`👁️ Viewing file: ${file.originalName} from submission ${submissionId}`);
  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).json({ message: 'Failed to view file' });
  }
};
