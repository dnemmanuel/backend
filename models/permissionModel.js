import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  description: {
    type: String,
    required: false, // Description is optional
    trim: true,
    maxlength: 250,
  },
}, { timestamps: true }); // Add createdAt and updatedAt fields

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
