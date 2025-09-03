import SystemEvent from '../models/systemEventModel.js';

export const logSystemEvent = async (performedBy, performedByName, action) => {
  // ... (existing logSystemEvent function remains the same)
  console.log('--- Inside systemEventController.js logSystemEvent ---');
  console.log('Received performedBy:', performedBy);
  console.log('Received performedByName:', performedByName);
  console.log('Received action:', action);
  // ... (existing logSystemEvent function remains the same)

  if (!action || !performedByName) {
    console.error('Missing required fields for system event logging. Event not saved.');
    return;
  }

  try {
    const newSystemEvent = new SystemEvent({
      action,
      performedBy,
      performedByName,
    });
    await newSystemEvent.save();
    console.log(`System event logged: "${action}" by ${performedByName}`);
  } catch (error) {
    console.error('Error saving system event:', error);
  }
};

export const getSystemEvents = async (req, res) => {
  try {
    // --- Pagination Logic Start ---
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 20; // Default to 20 events per page
    const skip = (page - 1) * limit; // Calculate number of documents to skip
    // --- Pagination Logic End ---

    const totalEvents = await SystemEvent.countDocuments();
    const systemEvents = await SystemEvent.find()
      .populate('performedBy', 'username email role')
      .sort({ createdAt: -1 }) // Use 'createdAt' for sorting
      .skip(skip) // Skip documents for pagination
      .limit(limit); // Limit number of documents returned

    res.status(200).json({
      events: systemEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents: totalEvents,
    });
  } catch (error) {
    console.error('Error fetching system events:', error);
    res.status(500).json({ message: 'Error fetching system events', error: error.message });
  }
};
