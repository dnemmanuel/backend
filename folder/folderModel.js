import mongoose, { Schema } from "mongoose";

const FolderSchema = new Schema(
  {
    // The main title displayed on the dashboard card
    // Note: Not globally unique - same name allowed in different locations
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // The internal route path (e.g., '/payroll-archive', '/payroll-archive/2025')
    // Must be globally unique across all folders
    page: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    // The parent group identifier where this folder belongs (e.g., 'Finance', 'Payroll')
    group: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional: The child group this folder houses (for folders that contain subfolders of a different group)
    // DEPRECATED: Use parent-child folder relationships instead
    childGroup: {
      type: String,
      trim: true,
      default: null,
    },
    // Reference to parent folder (null for root-level folders)
    parentFolder: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    // NEW: Explicitly store the path of the parent folder/page. 
    // This allows for hierarchical querying. (e.g., '/payroll-archive' or '/payroll-archive/2025')
    parentPath: {
      type: String,
      trim: true,
      default: "/",
    },
    // The descriptive text below the main title
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    // Display label shown on the folder card (e.g., "GOSL", "Public Sector")
    label: {
      type: String,
      trim: true,
      default: "",
    },
    // Ministry filter for restricting folder visibility to specific ministries/agencies
    ministryFilter: {
      type: String,
      trim: true,
      default: "",
    },
    // DEPRECATED: Old ministry field kept for backward compatibility
    ministry: {
      type: String,
      trim: true,
      default: "",
    },
    // Array of permission keys required to see and access this Folder/card
    requiredPermissions: {
      type: [String],
      // Note: required is set to false here to allow for folders accessible by anyone (if array is empty).
      required: false,
      default: ["view_folder"], // A sensible default permission key
    },
    // Status of the card: if false, it won't be displayed
    isActive: {
      type: Boolean,
      default: true,
    },
    // Theme for styling (e.g., 'blue', 'green', 'orange')
    theme: {
      type: String,
      trim: true,
      default: "gray",
    },
    // Sort order for display in dashboards
    sortOrder: {
      type: Number,
      default: 0,
    },
    // Optional: for logging which user created the card
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance on complex queries
// Note: Single field indexes created automatically by unique: true and index: true in schema

// IMPORTANT: Compound unique index - allows same name in different locations
// but prevents duplicate names within the same parent folder
FolderSchema.index({ name: 1, parentFolder: 1 }, { unique: true });

FolderSchema.index({ parentPath: 1, group: 1 });
FolderSchema.index({ parentFolder: 1, isActive: 1 }); // For querying children of a folder
FolderSchema.index({ group: 1, isActive: 1 });
FolderSchema.index({ isActive: 1 });

const Folder = mongoose.model("Folder", FolderSchema);

export default Folder;