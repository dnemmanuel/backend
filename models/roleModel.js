import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  permissions: [{  // Add permissions field
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
  }],
}, { timestamps: true }); // Add createdAt and updatedAt fields

const Role = mongoose.model('Role', roleSchema);
export default Role;
