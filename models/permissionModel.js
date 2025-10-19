import mongoose, { Schema } from 'mongoose';

const permissionSchema = new Schema({
  // The unique key for authorization checks (e.g., 'view_user_manager')
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  // A brief, descriptive name for display in the UI (e.g., 'View User Management Page')
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  // A longer explanation of what this permission grants
  description: {
    type: String,
    trim: true,
    maxlength: 250,
    required: true
  },
}, { timestamps: true });

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;