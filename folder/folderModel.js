import mongoose, { Schema } from "mongoose";

const FolderSchema = new Schema(
  {
    // The main title displayed on the dashboard card
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    // The internal route path (e.g., '/payroll-archive', '/payroll-archive/2025')
    page: {
      type: String,
      required: true,
      trim: true,
    },
    // The group identifier (e.g., 'Finance', 'Payroll', 'PayrollArchive')
    group: {
      type: String,
      required: true,
      trim: true,
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
    // The ministry or organization associated with the Folder
    ministry: {
      type: String,
      trim: true,
      default: "",
    },
    // Array of roles required to see and access this Folder/card
    requiredRole: {
      type: [String],
      required: true,
      // You may want to add validation here to ensure roles exist in your system
      // enum: ['s-admin', 'admin', 'lvl-1', ...],
      default: ["s-admin"],
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
    // Optional: for logging which user created the card
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Folder = mongoose.model("Folder", FolderSchema);

export default Folder;
