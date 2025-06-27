import mongoose, { Schema, model } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      required: true,
      enum: ["s-admin", "admin", "lvl-1", "lvl-2", "lvl-3", "lvl-4"], // Define allowed roles
      default: "admin",
    },
    email: {
      // Added email
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail, // Use validator.isEmail
        message: "Invalid email address",
      },
    },
    firstName: {
      // Added firstName
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      // Added lastName
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    isActive: {
      //Added isActive
      type: Boolean,
      default: true,
    },
    lastLogin: {
      // Added lastLogin
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    return next(err);
  }
});

const user = model("user", userSchema);

export default user;
