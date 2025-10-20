import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { ObjectId } from "mongodb";
import { checkPermission } from "../middlewares/checkPermission.js";
import { uploadLimiter } from "../middlewares/rateLimiter.js";
import User from "../user/userModel.js";
import { FILE_UPLOAD, HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES, PERMISSIONS } from "../constants/index.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";

// Use Multer's memory storage to buffer the file
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE, // 10MB
    files: 1, // Only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      logWarn('Invalid file type attempted', {
        mimeType: file.mimetype,
        userId: req.user?._id,
      });
      cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
      return;
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
      logWarn('Invalid file extension attempted', {
        extension: ext,
        userId: req.user?._id,
      });
      cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
      return;
    }
    
    cb(null, true);
  },
});

export const createPdfUploadRouter = (conn) => {
  const router = express.Router();

  if (!conn || !conn.db) {
    throw new Error(
      "Mongoose connection object or its native database object is required."
    );
  }

  // Get direct references to the new collections
  const metadataCollection = conn.db.collection("pdf_metadata");
  const contentsCollection = conn.db.collection("pdf_contents");

  // ------------------------------------------
  // POST /upload-pdf (File Upload)
  // ------------------------------------------

  router.post(
    "/upload-pdf",
    // TEMPORARILY DISABLED - Rate limiting paused for development
    // uploadLimiter,
    checkPermission(PERMISSIONS.UPLOAD_PAYROLL_PDFS),
    upload.single("pdfFile"),
    async (request, response, next) => {
      if (!request.file) {
        return response.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
        });
      }

      const determinedUserId = request.user?._id?.toString() || "guest";
      
      logInfo('PDF upload initiated', {
        userId: determinedUserId,
        filename: request.file.originalname,
        size: request.file.size,
      });

      // NO LONGER NEEDED: Filename generation is now only for metadata
      // const filename =
      //   crypto.randomBytes(16).toString("hex") +
      //   path.extname(request.file.originalname);

      const fileBuffer = request.file.buffer;

      try {
        // Validate file size (double-check despite multer limit)
        if (fileBuffer.length > FILE_UPLOAD.MAX_SIZE) {
          return response.status(HTTP_STATUS.BAD_REQUEST).json({
            message: ERROR_MESSAGES.FILE_TOO_LARGE,
          });
        }

        // 1. Store the file content
        const contentResult = await contentsCollection.insertOne({
          data: fileBuffer,
          uploadDate: new Date(),
        });
        const pdfContentId = contentResult.insertedId;

        // 2. Store the file metadata, linked to the content
        const metadataDoc = {
          pdfContentId: pdfContentId,
          userId: determinedUserId,
          originalName: request.file.originalname,
          mimeType: request.file.mimetype,
          size: request.file.size,
          uploadDate: new Date(),
        };

        const metadataResult = await metadataCollection.insertOne(metadataDoc);
        const fileId = metadataResult.insertedId;

        logInfo('PDF uploaded successfully', {
          fileId: fileId.toString(),
          userId: determinedUserId,
          filename: request.file.originalname,
          size: request.file.size,
        });

        response.status(HTTP_STATUS.CREATED).json({
          message: SUCCESS_MESSAGES.FILE_UPLOADED,
          fileId: fileId,
          pdfContentId: pdfContentId,
          filename: request.file.originalname,
        });
      } catch (error) {
        logError('Error during file storage', error, {
          userId: determinedUserId,
          filename: request.file?.originalname,
        });
        
        // Attempt cleanup if metadata insert failed
        if (error.message.includes('metadata')) {
          try {
            await contentsCollection.deleteOne({ _id: pdfContentId });
          } catch (cleanupError) {
            logError('Failed to cleanup orphaned file content', cleanupError);
          }
        }
        
        next(error);
      }
    },
    (error, request, response, next) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return response.status(HTTP_STATUS.BAD_REQUEST).json({
            message: ERROR_MESSAGES.FILE_TOO_LARGE,
          });
        }
        return response.status(HTTP_STATUS.BAD_REQUEST).json({
          message: `File upload error: ${error.message}`,
        });
      }
      
      if (error.message === ERROR_MESSAGES.INVALID_FILE_TYPE) {
        return response.status(HTTP_STATUS.BAD_REQUEST).json({
          message: ERROR_MESSAGES.INVALID_FILE_TYPE,
        });
      }
      
      logError('Unhandled PDF upload error', error);
      response.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: ERROR_MESSAGES.FILE_UPLOAD_FAILED,
      });
    }
  );

  // ------------------------------------------
  // GET /api/pdfs/ (List Files with Username Lookup)
  // ------------------------------------------

  router.get("/", async (req, res) => {
    try {
      // 1. Fetch all file metadata from the new collection
      const filesMetadata = await metadataCollection.find({}).toArray();
      // ... (Steps 2 through 6 for user lookup remain the same,
      // but ensure you are accessing the user ID from the metadata document correctly)

      // Update the logic to align with new fields:
      const stringUserIds = filesMetadata
        .map((file) => file.userId) // Field is now just 'userId'
        .filter((id) => id && id !== "guest");

      // ... (Steps 3, 4, 5 for Mongoose lookup remain the same) ...

      // 6. Combine file metadata with user data
      const filesWithUsernames = filesMetadata.map((file) => {
        const userId = file.userId;
        let uploaderDisplay = "Guest";

        const user = userMap[userId];
        if (user) {
          uploaderDisplay =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.username;
        }
        return {
          ...file,
          uploaderDisplay: uploaderDisplay,
        };
      });

      res.status(200).json(filesWithUsernames);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch file list." });
    }
  });

  // ------------------------------------------
  // GET /api/pdfs/:fileId (View Single File Stream)
  // ------------------------------------------

  router.get("/:fileId", async (req, res) => {
    try {
      const fileId = new ObjectId(req.params.fileId);

      // 1. Find the metadata document using the external fileId
      const metadataDoc = await metadataCollection.findOne({
        _id: fileId,
      });

      if (!metadataDoc) {
        return res.status(404).json({ message: "File not found." });
      }

      const pdfContentId = metadataDoc.pdfContentId;

      // 2. Fetch the binary data using the pdfContentId link
      const contentDoc = await contentsCollection.findOne({
        _id: pdfContentId,
      });

      if (!contentDoc || !contentDoc.data) {
        return res.status(500).json({ message: "File content missing." });
      }

      // 3. Set headers and send the binary data as a response
      res.set("Content-Type", metadataDoc.mimeType || "application/pdf");
      res.set(
        "Content-Disposition",
        `inline; filename="${metadataDoc.originalName}"`
      );

      // Send the BinData buffer (convert the BSON BinData back to a Node.js Buffer for the response)
      res.send(contentDoc.data.buffer);
    } catch (error) {
      console.error("Error fetching file stream:", error);
      if (error.name === "BSONTypeError") {
        return res.status(400).json({ message: "Invalid File ID format." });
      }
      res.status(500).json({ message: "Failed to retrieve file stream." });
    }
  });

  // ------------------------------------------
  // DELETE /api/pdfs/:fileId (Delete File)
  // ------------------------------------------

  router.delete(
    "/:fileId",
    checkPermission("delete_payroll_pdfs"),
    async (req, res) => {
      try {
        const fileId = new ObjectId(req.params.fileId);

        // 1. Find the metadata document to get the content ID
        const metadataDoc = await metadataCollection.findOne({
          _id: fileId,
        });

        if (!metadataDoc) {
          return res.status(404).json({ message: "File not found." });
        }

        const pdfContentId = metadataDoc.pdfContentId;

        // 2. Delete the content document
        const contentDeleteResult = await contentsCollection.deleteOne({
          _id: pdfContentId,
        });

        // 3. Delete the metadata document
        const metadataDeleteResult = await metadataCollection.deleteOne({
          _id: fileId,
        });

        // OPTIONAL: Basic check if anything was deleted
        if (
          metadataDeleteResult.deletedCount === 0 &&
          contentDeleteResult.deletedCount === 0
        ) {
          return res
            .status(404)
            .json({ message: "File not found during deletion attempt." });
        }

        // 4. Success: 204 No Content
        res.status(204).send();
      } catch (error) {
        console.error("Error deleting file:", error);
        if (error.name === "BSONTypeError") {
          return res.status(400).json({ message: "Invalid File ID format." });
        }
        res
          .status(500)
          .json({ message: "Failed to delete file due to a server error." });
      }
    }
  );

  return router;
};
