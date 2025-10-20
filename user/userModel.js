import mongoose, { Schema, model } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import { VALIDATION } from "../constants/index.js";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: VALIDATION.USERNAME.MIN_LENGTH,
      maxlength: VALIDATION.USERNAME.MAX_LENGTH,
    },
    password: {
      type: String,
      required: true,
      minlength: VALIDATION.PASSWORD.MIN_LENGTH,
      // Note: No maxlength here because hashed passwords will be longer
      select: false, 
    },
    role: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Role', 
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: "Invalid email address",
      },
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    ministry: {
      type: String,
      trim: true,
      required: [true, "Ministry is required for the user"],
      index: true,
    },
    // Array of permission keys required to see and access this Folder/card
    requiredPermissions: {
      type: [String],
      // Note: required is set to false here to allow for folders accessible by anyone (if array is empty).
      required: false,
      default: ["test"], // A sensible default permission key
    },
  },
  {
    timestamps: true,
  }
);

// Additional indexes for better query performance
// Note: username, email, role, and ministry already have index: true in field definition
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public user data (without sensitive info)
userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default model("User", userSchema);