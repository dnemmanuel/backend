import mongoose from 'mongoose';
import { ObjectId } from 'mongodb'; // Import ObjectId

// Get direct references to the collections
const getCollections = () => {
    const db = mongoose.connection.db;
    return {
        metadataCollection: db.collection('pdf_metadata'),
        contentsCollection: db.collection('pdf_contents'),
    };
};

// GET /api/files (List Files)
export const getFiles = async (req, res) => {
    try {
        const { metadataCollection } = getCollections();
        
        // Find all metadata files
        const files = await metadataCollection.find({}).toArray();
        res.status(200).json(files);

    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Failed to fetch file list." });
    }
};

// GET /api/files/:fileId (View File)
export const getFile = async (req, res) => {
    try {
        const { metadataCollection, contentsCollection } = getCollections();
        const fileId = new ObjectId(req.params.fileId);
        
        // 1. Find the metadata document
        const metadataDoc = await metadataCollection.findOne({ _id: fileId });

        if (!metadataDoc) {
            return res.status(404).json({ message: "File not found." });
        }
        
        const pdfContentId = metadataDoc.pdfContentId;

        // 2. Fetch the binary data
        const contentDoc = await contentsCollection.findOne({ _id: pdfContentId });

        if (!contentDoc || !contentDoc.data) {
            return res.status(500).json({ message: "File content missing." });
        }
        
        // Set headers for file download/display
        res.set('Content-Type', metadataDoc.mimeType || 'application/pdf');
        res.set('Content-Disposition', `inline; filename="${metadataDoc.originalName}"`);

        // Send the binary data
        res.send(contentDoc.data.buffer);

    } catch (error) {
        console.error("Error fetching file stream:", error);
        res.status(500).json({ message: "Failed to retrieve file stream." });
    }
};