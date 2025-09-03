import SecurityRequest from "../models/securityRequestModel.js";
import { sendEmail } from "../utils/emailService.js";

export const submitSecurityRequest = async (req, res) => {
  try {
    const { status, submissionDate, ...formData } = req.body; // Removed submittedByUserId from destructuring req.body

    console.log(
      "Backend: Received form submission request. req.body:",
      JSON.stringify(req.body, null, 2)
    );

    const newRequest = new SecurityRequest({
      status: status || "Pending Review",
      submittedByUserId: req.user ? req.user.id : null, // Set submittedByUserId from req.user (authenticated user)
      submissionDate: submissionDate || Date.now(),
      ...formData,
    });

    console.log(
      "Backend: Mongoose newRequest instance before save:",
      JSON.stringify(newRequest, null, 2)
    );

    const savedRequest = await newRequest.save();

    // After successfully saving the form, send an email to the requestor.
    // const requestorEmail = req.body.requestorInfo.existingEmail;
    const sendTo = 'dinnel.emmanuel@govt.lc'
    const subject = "Security Request Submitted: Reference " + newRequest._id;
    const htmlBody = `
      <h1>Security Request Submission</h1>
      <p>Dear ${req.body.requestorInfo.firstName},</p>
      <p>Your security request has been successfully submitted and is pending review. The reference number is: <strong>${newRequest._id}</strong>.</p>
      <p>We will notify you once the status of your request has been updated.</p>
      <p>Best regards,<br>The Security Team</p>
    `;

    await sendEmail(sendTo, subject, htmlBody);

    console.log(
      "Backend: Mongoose savedRequest instance after save:",
      JSON.stringify(savedRequest, null, 2)
    );

    res.status(201).json({
      message: "Security request submitted successfully!",
      request: savedRequest,
    });
  } catch (error) {
    console.error("Backend: Error submitting security request:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      console.error("Backend: Mongoose Validation Errors:", messages);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res
      .status(500)
      .json({ message: "Internal server error during submission." });
  }
};
// Controller to get all security requests
export const getSecurityRequests = async (req, res) => {
  try {
    // Find all security requests in the database
    const requests = await SecurityRequest.find({}); // Find all documents

    console.log(
      "Backend: Fetched security requests:",
      requests.length,
      "documents."
    );

    res.status(200).json(requests); // Send them as a JSON array
  } catch (error) {
    console.error("Backend: Error fetching security requests:", error);
    res
      .status(500)
      .json({ message: "Internal server error while fetching requests." });
  }
};

// Controller to update the status of a security request by ID
export const updateSecurityRequestStatus = async (req, res) => {
  try {
    const { id } = req.params; // Get the request ID from the URL parameters
    const { status } = req.body; // Get the new status from the request body

    // Validate if status is provided and is one of the allowed values (optional, but good practice)
    const allowedStatuses = [
      "Pending Review",
      "Approved",
      "Rejected",
      "In Progress",
      "Completed",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ message: "Invalid or missing status provided." });
    }

    // Find the request by ID and update its status
    const updatedRequest = await SecurityRequest.findByIdAndUpdate(
      id,
      { status: status },
      { new: true, runValidators: true } // 'new: true' returns the updated document; 'runValidators' runs schema validators
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Security request not found." });
    }

    console.log(`Backend: Updated request ${id} status to ${status}.`);
    res.status(200).json({
      message: "Security request status updated successfully!",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Backend: Error updating security request status:", error);
    res
      .status(500)
      .json({ message: "Internal server error while updating status." });
  }
};

// Controller to get a single security request by ID
export const getSecurityRequestById = async (req, res) => {
  try {
    const { id } = req.params; // Get the ID from the URL parameters

    const request = await SecurityRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Security request not found." });
    }

    console.log(`Backend: Fetched request with ID: ${id}.`);
    res.status(200).json(request);
  } catch (error) {
    console.error("Backend: Error fetching security request by ID:", error);
    // Handle invalid ID format (e.g., if it's not a valid MongoDB ObjectId string)
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid request ID format." });
    }
    res
      .status(500)
      .json({ message: "Internal server error while fetching request by ID." });
  }
};

export const deleteSecurityRequest = async (req, res) => {
  try {
    const { id } = req.params; // Get the request ID from the URL parameters

    const deletedRequest = await SecurityRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({ message: "Security request not found." });
    }

    console.log(`Backend: Deleted request with ID: ${id}.`);
    res.status(200).json({ message: "Security request deleted successfully!" });
  } catch (error) {
    console.error("Backend: Error deleting security request:", error);
    // Handle invalid ID format
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid request ID format." });
    }
    res
      .status(500)
      .json({ message: "Internal server error while deleting request." });
  }
};
