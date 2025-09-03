import mongoose from "mongoose";

const { Schema } = mongoose;

const securityRequestSchema = new Schema(
  {
    // Status for workflow management
    status: {
      type: String,
      required: true,
      enum: [
        "Pending Review",
        "Approved",
        "Rejected",
        "In Progress",
        "Completed",
      ],
      default: "Pending Review",
    },
    // Optional: Reference to the user who submitted the request
    // Requires your User model to be imported if you want to populate this.
    // For simplicity, we'll store the ID directly for now.
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a 'User' model
    },
    submittedByUserId: {
      // Store user ID if not referencing a Mongoose User object
      type: String,
      required: false, // Make true if user submission is always authenticated
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    // Requestor Information
    requestorInfo: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      contactNum: { type: String, required: true, trim: true },
      emID: { type: String, required: true, trim: true }, // Changed to String as it might not always be just numbers
      curMinistry: { type: String, required: true, trim: true },
      prevMinistry: { type: String, trim: true },
      position: { type: String, trim: true },
      existingEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^\S+@\S+\.\S+$/,
      }, // Basic email regex
    },
    // Email Security Requests
    emailSecurity: {
      requestedEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^\S+@\S+\.\S+$/,
      },
      existingEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^\S+@\S+\.\S+$/,
      },
      // 👇 These MUST be Boolean types for checkboxes
      createEmailAccount: { type: Boolean, default: false },
      resetEmailPassword: { type: Boolean, default: false },
      unlockEmailAccount: { type: Boolean, default: false },
      requestAlias: {
        existingEmail: {
          type: String,
          trim: true,
          lowercase: true,
          match: /^\S+@\S+\.\S+$/,
        },
        alias: {
          type: String,
          trim: true,
          lowercase: true,
          match: /^\S+@\S+\.\S+$/,
        },
      },
      requestForwarding: {
        from: {
          type: String,
          trim: true,
          lowercase: true,
          match: /^\S+@\S+\.\S+$/,
        },
        to: {
          type: String,
          trim: true,
          lowercase: true,
          match: /^\S+@\S+\.\S+$/,
        },
      },
      addToList: { type: String, trim: true },
      removeFromList: { type: String, trim: true },
      closeEmail: { type: Boolean, default: false }, // 👇 This one too
      addToGroup: { type: String, trim: true },
      removeFromGroup: [{ type: String, trim: true }],
      modifyAccount: [{ type: String, trim: true }],
      createDistributionList: [{ type: String, trim: true }],
    },
    // Network Security Requests
    networkSecurity: {
      networkUsername: { type: String, trim: true },
      requestNetworkAccess: { type: String, trim: true },
      changeNetworkPermissions: { type: String, trim: true },
      setupSharedDriveAccess: { type: String, trim: true },
      removeNetworkAccess: { type: String, trim: true },
    },
    // CloudSuite Security Requests
    cloudSuiteSecurity: {
      requestCloudSuiteAccess: {
        buyerRole: { type: Boolean, default: false },
        payableProcessorRole: { type: Boolean, default: false },
        matcherRole: { type: Boolean, default: false },
        staffAccountantRole: { type: Boolean, default: false },
        approverRole: { type: Boolean, default: false },
        VotesRole: { type: Boolean, default: false },
        approverGroup: { type: String, trim: true },
        processLevel: { type: String, trim: true },
        otherRole: { type: String, trim: true },
        userWithSameRole: { type: String, trim: true },
      },
      addCloudSuitePermissions: {
        buyerRole: { type: Boolean, default: false },
        payableProcessorRole: { type: Boolean, default: false },
        matcherRole: { type: Boolean, default: false },
        staffAccountantRole: { type: Boolean, default: false },
        approverRole: { type: Boolean, default: false },
        VotesRole: { type: Boolean, default: false },
        approverGroup: { type: String, trim: true },
        processLevel: { type: String, trim: true },
        otherRole: { type: String, trim: true },
        userWithSameRole: { type: String, trim: true },
      },
      modifyCloudSuitePermissions: { type: String, trim: true },
      revokeCloudSuiteAccess: { type: String, trim: true },
    },
    // VPN Security Requests
    vpnSecurity: {
      requestVpnAccess: { type: String, trim: true },
      resetVpnPassword: { type: String, trim: true },
      configureVpnClient: { type: String, trim: true },
    },
    // You might want to store selected options as well for easier processing/filtering
    selectedOptionsSummary: [
      {
        label: String,
        categoryName: String,
        categoryId: String,
        modelName: String,
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const SecurityRequest = mongoose.model(
  "SecurityRequest",
  securityRequestSchema
);

export default SecurityRequest;
