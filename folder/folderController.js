import Folder from '../folder/folderModel.js';
// Assuming logSystemEvent is available for auditing
import { logSystemEvent } from '../controllers/systemEventController.js'; 

/**
 * Get all active folders/cards.
 * This is public for all authenticated users to populate the dashboard.
 */
export const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ isActive: true });
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ message: 'Failed to fetch folder cards.' });
  }
};

/**
 * Get all folders (including inactive ones) for administrative purposes.
 * Restricted to s-admin/admin.
 */
export const getAllFoldersAdmin = async (req, res) => {
    try {
      const folders = await Folder.find();
      res.status(200).json(folders);
    } catch (error) {
      console.error('Error fetching all folders (Admin):', error);
      res.status(500).json({ message: 'Failed to fetch all folder cards.' });
    }
  };

/**
 * Create a new folder/card.
 * Restricted to s-admin/admin.
 */
export const createFolder = async (req, res) => {
  try {
    // Ensure 'group' is destructured here as it is now a required field in the model
    const { name, page, group, subtitle, ministry, requiredRole, isActive, theme } = req.body;

    if (!name || !page || !group || !requiredRole) {
      // Updated error message to include 'group'
      return res.status(400).json({ message: 'Name, page, group, and requiredRole are mandatory fields.' });
    }

    const newFolder = new Folder({ 
        name, page, group, subtitle, ministry, requiredRole, isActive, theme, 
        createdBy: req.user ? req.user.userId : null // Assuming req.user is set by auth middleware
    });

    const savedFolder = await newFolder.save();

    // Log system event
    const performedBy = req.user ? req.user.userId : 'System';
    const performedByName = req.user ? req.user.username : 'System';
    const action = `Created new folder card: ${savedFolder.name} in group ${savedFolder.group}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(201).json({ 
        message: 'Folder card created successfully.', 
        folder: savedFolder 
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A folder card with this name already exists.' });
    }
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Update an existing folder/card.
 * Restricted to s-admin/admin.
 */
export const updateFolder = async (req, res) => {
  try {
    // Note: The 'group' field is typically not changed after creation, 
    // but we allow it here if it's sent in the body.
    const { name, page, group, subtitle, ministry, requiredRole, isActive, theme } = req.body;

    // We use findByIdAndUpdate with { new: true } to get the updated document
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      { $set: { name, page, group, subtitle, ministry, requiredRole, isActive, theme } },
      { new: true, runValidators: true } // Return the new doc and run schema validators
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: 'Folder card not found.' });
    }

    // Log system event
    const performedBy = req.user ? req.user.userId : 'System';
    const performedByName = req.user ? req.user.username : 'System';
    const action = `Updated folder card: ${updatedFolder.name}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(200).json({ 
        message: 'Folder card updated successfully.', 
        folder: updatedFolder 
    });

  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Get all active folders/cards for a specific group.
 * The group name is passed as a URL parameter (e.g., /folder/group/finance)
 */
export const getFoldersByGroup = async (req, res) => {
  // CORRECTED: Reading from req.params.group to match the route definition
  const groupName = req.params.group; 

  if (!groupName) {
    return res.status(400).json({ message: 'Group name URL parameter is required.' });
  }

  try {
    // FIX: Use a case-insensitive regular expression to match the groupName
    const folders = await Folder.find({ 
      isActive: true, 
      group: { $regex: new RegExp(`^${groupName}$`, 'i') }
    });
    
    res.status(200).json(folders);

  } catch (error) {
    console.error(`Error fetching folders for group '${groupName}':`, error);
    res.status(500).json({ message: 'Failed to fetch folder cards by group.' });
  }
};


/**
 * Delete an folder/card.
 * Restricted to s-admin/admin.
 */
export const deleteFolder = async (req, res) => {
  try {
    const deletedFolder = await Folder.findByIdAndDelete(req.params.id);

    if (!deletedFolder) {
      return res.status(404).json({ message: 'Folder card not found.' });
    }

    // Log system event
    const performedBy = req.user ? req.user.userId : 'System';
    const performedByName = req.user ? req.user.username : 'System';
    const action = `Deleted folder card: ${deletedFolder.name}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(200).json({ 
        message: 'Folder card deleted successfully.', 
        name: deletedFolder.name 
    });

  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
