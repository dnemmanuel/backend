import mongoose, { Schema } from 'mongoose';

const SubmissionSchema = new Schema(
  {
    // Form metadata
    formType: {
      type: String,
      required: true,
      enum: ['NewHire', 'EmployeeProfileUpdate', 'PayrollDataChange'],
      trim: true,
    },
    
    // Submission tracking
    submissionNumber: {
      type: String,
      unique: true,
      // Not required here - will be auto-generated in pre-save hook
    },
    
    status: {
      type: String,
      required: true,
      enum: ['Submitted', 'Pending', 'Approved', 'Rejected', 'Processed'],
      default: 'Submitted',
    },
    
    // Submitter information
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    submitterMinistry: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Destination folder
    targetFolder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      required: true,
    },
    
    currentFolder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      required: true,
    },
    
    // Form data (flexible schema to accommodate different form types)
    formData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    
    // Attachments
    attachments: [
      {
        fileId: String, // Unique identifier for the file
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // Workflow tracking
    workflowHistory: [
      {
        action: {
          type: String,
          enum: ['Submitted', 'Moved', 'Approved', 'Rejected', 'Processed'],
        },
        performedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        performedByName: String,
        fromStatus: String,
        toStatus: String,
        fromFolder: {
          type: Schema.Types.ObjectId,
          ref: 'Folder',
        },
        toFolder: {
          type: Schema.Types.ObjectId,
          ref: 'Folder',
        },
        comments: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // Review notes
    reviewNotes: {
      type: String,
      trim: true,
    },
    
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    reviewedAt: {
      type: Date,
    },
    
    // Processing information
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries (submissionNumber already indexed via unique: true)
SubmissionSchema.index({ submittedBy: 1, status: 1 });
SubmissionSchema.index({ submitterMinistry: 1, status: 1 });
SubmissionSchema.index({ currentFolder: 1, status: 1 });
SubmissionSchema.index({ status: 1, createdAt: -1 });

// Generate unique submission number
SubmissionSchema.pre('save', async function (next) {
  if (this.isNew && !this.submissionNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Count submissions today to generate unique number
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    
    this.submissionNumber = `SUB-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Submission = mongoose.model('Submission', SubmissionSchema);

export default Submission;
