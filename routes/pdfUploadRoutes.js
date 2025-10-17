import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { ObjectId } from "mongodb"; // Keep ObjectId for lookups
import { checkPermission } from "../middlewares/checkPermission.js";
import User from "../user/userModel.js"; // Mongoose User model

// Use Multer's memory storage to buffer the file
const storage = multer.memoryStorage();
const upload = multer({
  storage,
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
  }

  // Get direct references to the new collections
  const metadataCollection = conn.db.collection("pdf_metadata");
  const contentsCollection = conn.db.collection("pdf_contents");

  // ------------------------------------------
  // POST /upload-pdf (File Upload)
  // ------------------------------------------

  router.post(
    "/upload-pdf",
    checkPermission("upload_payroll_pdfs"),
    upload.single("pdfFile"),
    async (request, response, next) => {
      if (!request.file) {
        return response.status(400).json({
          message: "File upload failed or was rejected.",
        });
      }

      console.log("--- PDF UPLOAD DEBUG ---");
      console.log("request.user:", request.user);
      console.log("------------------------");

      let determinedUserId = "guest";
      const userIdentifier = request.user?._id || request.user?.id;

      if (userIdentifier) {
        determinedUserId = userIdentifier.toString();
      }

      // NO LONGER NEEDED: Filename generation is now only for metadata
      // const filename =
      //   crypto.randomBytes(16).toString("hex") +
      //   path.extname(request.file.originalname);

      const fileBuffer = request.file.buffer;

      try {
        // 1. Store the file content
        const contentResult = await contentsCollection.insertOne({
          data: fileBuffer, // MongoDB stores the buffer as BinData
          // Optional: You could store a generated filename here, but _id is the primary key
        });
        const pdfContentId = contentResult.insertedId; // This is the ID of the file content

        // 2. Store the file metadata, linked to the content
        const metadataDoc = {
          pdfContentId: pdfContentId, // Link to the content collection
          userId: determinedUserId,
          originalName: request.file.originalname,
          mimeType: request.file.mimetype, // Stored as contentType in GridFS, using mimeType here
          size: request.file.size,
          uploadDate: new Date(),
        };

        const metadataResult = await metadataCollection.insertOne(metadataDoc);
        const fileId = metadataResult.insertedId; // This is the ID of the metadata document

        response.status(201).json({
          message: "PDF file uploaded successfully.",
          // Return the metadata ID for lookups, as it's the primary way to reference the file externally
          fileId: fileId,
          pdfContentId: pdfContentId,
          filename: request.file.originalname,
        });
      } catch (error) {
        // You should add logic here to clean up the pdf_contents entry if the pdf_metadata insert fails.
        console.error("Error during file storage:", error);
        next(error);
      }
    },
    // Error middleware remains the same
    (error, request, response, next) => {
      // ... (Error handling logic remains unchanged) ...
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
