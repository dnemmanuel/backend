import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { GridFSBucket, ObjectId } from "mongodb";
import User from "../user/userModel.js"; // Mongoose User model

// Use Multer's memory storage to buffer the file before passing it to GridFSBucket
const storage = multer.memoryStorage();
const upload = multer({
  storage, // Keep fileFilter for immediate rejection of non-PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are permitted."), false);
    } else {
      cb(null, true);
    }
  },
});

export const createPdfUploadRouter = (conn) => {
  const router = express.Router();

  if (!conn || !conn.db) {
    throw new Error(
      "Mongoose connection object or its native database object is required."
    );
  } // Initialize GridFSBucket using the native database object (conn.db)

  const bucket = new GridFSBucket(conn.db, {
    bucketName: "pdfuploads",
  }); // ------------------------------------------ // POST /upload-pdf (File Upload) // ------------------------------------------

  router.post(
    "/upload-pdf",
    upload.single("pdfFile"),
    async (request, response, next) => {
      if (!request.file) {
        return response.status(400).json({
          message: "File upload failed or was rejected.",
        });
      } // Debugging log remains for verification

      console.log("--- PDF UPLOAD DEBUG ---");
      console.log("request.user:", request.user);
      console.log("------------------------"); // CRITICAL FIX: Robustly determine the userId. Check for _id first, then id.
      let determinedUserId = "guest"; // Check for the ID on both possible fields (_id from JWT payload, or id from Mongoose virtual property)
      const userIdentifier = request.user?._id || request.user?.id;

      if (userIdentifier) {
        determinedUserId = userIdentifier.toString();
      } // Generate a unique filename and metadata

      const filename =
        crypto.randomBytes(16).toString("hex") +
        path.extname(request.file.originalname);
      const metadata = {
        userId: determinedUserId, // Use the determined ID (now guaranteed a string or "guest")
        originalName: request.file.originalname,
      };

      const uploadStream = bucket.openUploadStream(filename, {
        metadata: metadata,
        contentType: request.file.mimetype,
      });

      const fileId = uploadStream.id;

      try {
        await new Promise((resolve, reject) => {
          uploadStream.end(request.file.buffer, (error) => {
            if (error) {
              bucket.delete(fileId, (deleteError) => {
                console.error(
                  "GridFS stream error. Deleted partial file:",
                  deleteError
                );
                reject(new Error("File streaming failed."));
              });
            } else {
              resolve();
            }
          });
        });

        response.status(201).json({
          message: "PDF file uploaded successfully.",
          fileId: fileId,
          filename: filename,
        });
      } catch (error) {
        next(error);
      }
    }, // Error middleware
    (error, request, response, next) => {
      if (error instanceof multer.MulterError) {
        return response.status(400).json({
          message: "Multer error during upload.",
          error: error.message,
        });
      } else if (error && error.message === "Only PDF files are permitted.") {
        return response
          .status(400)
          .json({ message: error.message, error: "FILE_TYPE_REJECTED" });
      } else if (error) {
        return response.status(500).json({
          message: error.message || "An unknown error occurred during upload.",
        });
      }
      next();
    }
  ); // ------------------------------------------ // GET /api/pdfs/ (List Files with Username Lookup) // ------------------------------------------

  router.get("/", async (req, res) => {
    try {
      // 1. Fetch all file metadata from GridFS
      const filesMetadata = await bucket.find({}).toArray(); // 2. Extract all unique User IDs (as strings) that are not 'guest' and not null
      const stringUserIds = filesMetadata
        .map((file) => file.metadata?.userId)
        .filter((id) => id && id !== "guest"); // 3. Convert unique string IDs to ObjectId instances for Mongoose
      const objectUserIds = stringUserIds
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch (e) {
            return null;
          }
        })
        .filter((id) => id); // 4. Fetch all relevant users in a single query

      const users = await User.find({ _id: { $in: objectUserIds } })
        .select("firstName lastName username")
        .exec(); // 5. Create a map for quick lookup: { userId_string: userData }

      const userMap = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {}); // 6. Combine file metadata with user data

      const filesWithUsernames = filesMetadata.map((file) => {
        const userId = file.metadata?.userId;
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
  }); // ------------------------------------------ // GET /api/pdfs/:fileId (View Single File Stream) // ------------------------------------------

  router.get("/:fileId", async (req, res) => {
    try {
      // Convert fileId string to ObjectId
      const fileId = new ObjectId(req.params.fileId); // Find file metadata to set headers
      const file = await bucket.find({ _id: fileId }).limit(1).toArray();

      if (!file || file.length === 0) {
        return res.status(404).json({ message: "File not found." });
      } // Set headers for file display
      res.set("Content-Type", file[0].contentType || "application/pdf");
      res.set(
        "Content-Disposition",
        `inline; filename="${
          file[0].metadata?.originalName || file[0].filename
        }"`
      ); // Create download stream and pipe it to the response

      bucket.openDownloadStream(fileId).pipe(res);
    } catch (error) {
      console.error("Error fetching file stream:", error); // Handle invalid ObjectId format
      if (error.name === "BSONTypeError") {
        return res.status(400).json({ message: "Invalid File ID format." });
      }
      res.status(500).json({ message: "Failed to retrieve file stream." });
    }
  }); // ------------------------------------------ // DELETE /api/pdfs/:fileId (Delete File) // ------------------------------------------

  router.delete("/:fileId", async (req, res) => {
    try {
      // 1. Convert fileId string to ObjectId
      const fileId = new ObjectId(req.params.fileId); // 2. Check if the file exists before attempting to delete to return a proper 404

      const file = await bucket.find({ _id: fileId }).limit(1).toArray();
      if (file.length === 0) {
        return res.status(404).json({ message: "File not found." });
      } // 3. Attempt deletion using GridFSBucket

      await bucket.delete(fileId); // 4. Success: 204 No Content (Standard for successful deletion)

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting file:", error); // Handle invalid ObjectId format

      if (error.name === "BSONTypeError") {
        return res.status(400).json({ message: "Invalid File ID format." });
      } // Generic server error

      res
        .status(500)
        .json({ message: "Failed to delete file due to a server error." });
    }
  });

  return router;
};
