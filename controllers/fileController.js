// Example in a new 'controllers/fileController.js'
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb'; // Import ObjectId

// GET /api/files (List Files)
export const getFiles = async (req, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'pdfuploads',
        });
        
        // Find all files and convert the cursor to an array
        const files = await bucket.find({}).toArray();
        res.status(200).json(files);

    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Failed to fetch file list." });
    }
};

// GET /api/files/:fileId (View File)
export const getFile = async (req, res) => {
    try {
        const fileId = new ObjectId(req.params.fileId);
        
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'pdfuploads',
        });

        // Find file metadata to set headers
        const file = await bucket.find({ _id: fileId }).limit(1).toArray();

        if (!file || file.length === 0) {
            return res.status(404).json({ message: "File not found." });
        }
        
        // Set headers for file download/display
        res.set('Content-Type', file[0].contentType || 'application/pdf');
        res.set('Content-Disposition', `inline; filename="${file[0].metadata.originalName || file[0].filename}"`);

        // Create download stream and pipe it to the response
        bucket.openDownloadStream(fileId).pipe(res);

    } catch (error) {
        console.error("Error fetching file stream:", error);
        res.status(500).json({ message: "Failed to retrieve file stream." });
    }
};