import mongoose, { Schema, model } from 'mongoose';

const systemEventSchema = new Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User', // This is the critical reference to the User model
    required: false, // Set to true if an event MUST always be linked to a user
  },
  performedByName: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default model('SystemEvent', systemEventSchema);
