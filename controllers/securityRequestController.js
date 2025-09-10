import SecurityRequest from "../models/securityRequestModel.js";

export const submitSecurityRequest = async (req, res) => {
  try {
    const { status, submissionDate, ...formData } = req.body; // Removed submittedByUserId from destructuring req.body

    console.log(
      "Backend: Received form submission request. req.body:",
      JSON.stringify(req.body, null, 2)
    );

    const newRequest = new SecurityRequest({
      status: status || "Pending HOD Review",
      submittedByUserId: req.user ? req.user.id : null, // Set submittedByUserId from req.user (authenticated user)
      submissionDate: submissionDate || Date.now(),
      ...formData,
    });

    console.log(
      "Backend: Mongoose newRequest instance before save:",
      JSON.stringify(newRequest, null, 2)
    );

    const savedRequest = await newRequest.save();

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


export const getSecurityRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userMinistry = req.user.ministry;
    let requests;
    
    // Define the base query filter
    let query = {};
    
    // If the user is an lvl-2 user, filter by their ministry
    if (userRole === "lvl-2") {
      query = { "requestorInfo.curMinistry": userMinistry };
      console.log(`Backend: Filtering requests for lvl-2 user by ministry: ${userMinistry}`);
    } else {
      // For s-admin and admin, no filtering is needed as they see all requests
      console.log(`Backend: Fetching all requests for role: ${userRole}`);
    }
    
    // Fetch security requests from the database with the determined query
    requests = await SecurityRequest.find(query).populate({
      path: "submittedBy",
      select: "username role ministry", // Populate with selected fields
    });

    if (requests.length === 0 && userRole === "lvl-2") {
      console.log("Backend: No requests found for this ministry.");
    }
    
    res.status(200).json(requests);
  } catch (error) {
    console.error("Backend: Error fetching security requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to update the status of a security request by ID
export const updateSecurityRequestStatus = async (req, res) => {
  try {
    const { id } = req.params; // Get the request ID from the URL parameters
    const { status } = req.body; // Get the new status from the request body

    // Validate if status is provided and is one of the allowed values (optional, but good practice)
    const allowedStatuses = [
      "Completed",
      "Approved",
      "Rejected",
      "Pending HOD Review",
      "Pending HCM Addition",
      "Pending FSM Addition",
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
