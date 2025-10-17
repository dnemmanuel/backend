import Folder from "../folder/folderModel.js";
import { logSystemEvent } from "../controllers/systemEventController.js";
import dayjs from "dayjs"; // IMPORTANT: Used for date calculations in cron job logic

// --- CORE GENERATION LOGIC (Reusable by API and Cron) ---

/**
 * Core function to automatically generate the Year folder for the NEXT month
 * and the Month folder itself for the Payroll Archive.
 * This function is idempotent (safe to run multiple times).
 * @param {string} performedBy - The user ID of the performer (or 'System').
 * @param {string} performedByName - The username of the performer (or 'System Automated Job').
 * @returns {Promise<Object>} Status of the generation.
 */
export const generateArchiveFoldersCore = async (
  performedBy,
  performedByName
) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const BASE_PAGE = "/payroll-archive"; // The target top-level page
  const GENERATED_GROUP = "PayrollArchive"; // Group for the top-level (Year) folders

  const newFoldersCreated = [];
  let foldersSkipped = 0;

  try {
    const today = dayjs();
    // Calculate the next month's date
    const nextMonthDayjs = today.add(1, "month");

    const targetYear = nextMonthDayjs.year();
    const targetMonthIndex = nextMonthDayjs.month(); // 0 (Jan) to 11 (Dec)

    const yearName = String(targetYear);
    const monthName = months[targetMonthIndex];
    const numericMonth = nextMonthDayjs.format("MM");

    const yearPage = `${BASE_PAGE}/${yearName}`;
    const yearParentPath = BASE_PAGE;
    const monthPage = `${yearPage}/${numericMonth}`;
    const monthParentPath = yearPage;

    // 1. Create/Ensure the TARGET Year Folder exists
    const [yearFolder, yearCreated] = await ensureFolderExists(
      {
        name: yearName,
        page: yearPage,
        group: GENERATED_GROUP,
        subtitle: `${yearName} Payroll Submissions`,
        ministry: "AGD",
        requiredRole: ["s-admin", "test"],
        isActive: true,
        parentPath: yearParentPath,
        theme: "yellow",
      },
      performedBy,
      performedByName
    );

    if (yearCreated) {
      newFoldersCreated.push(yearFolder);
    } else {
      foldersSkipped++;
    }

    // 2. Create/Ensure the TARGET Month Folder exists
    const [monthFolder, monthCreated] = await ensureFolderExists(
      {
        name: monthName,
        page: monthPage,
        // The group for the month folder is the year name (e.g., '2025')
        group: yearName,
        subtitle: `${monthName} ${yearName} Payroll Submissions`,
        ministry: "AGD",
        requiredRole: ["s-admin", "test"],
        isActive: true,
        parentPath: monthParentPath,
        theme: "cyan", // ADDED: Theme for the Month Folder
      },
      performedBy,
      performedByName
    );

    if (monthCreated) {
      newFoldersCreated.push(monthFolder);
    } else {
      foldersSkipped++;
    }

    return {
      createdCount: newFoldersCreated.length,
      skippedCount: foldersSkipped,
      createdFolders: newFoldersCreated.map((f) => f.name),
    };
  } catch (error) {
    // Log the detailed error for debugging, but re-throw to be handled by caller (API or Cron)
    console.error("Core error in generateArchiveFoldersCore:", error);
    throw new Error(`Failed to generate folders: ${error.message}`);
  }
};

/**
 * Helper function to create a folder if it doesn't already exist.
 */
const ensureFolderExists = async (folderData, performedBy, performedByName) => {
  try {
    // Find existing folder by the unique 'page' path
    const existingFolder = await Folder.findOne({ page: folderData.page });

    if (existingFolder) {
      // Folder already exists, skip creation
      return [existingFolder, false];
    }

    // Folder does not exist, create it
    const newFolder = new Folder({
      ...folderData,
      createdBy: performedBy, // Set the creator ID
    });

    const savedFolder = await newFolder.save();

    // Log system event for creation
    const action = `Created new folder card: ${savedFolder.name} (Page: ${savedFolder.page})`;
    logSystemEvent(performedBy, performedByName, action);

    return [savedFolder, true]; // Return the created folder and creation status
  } catch (error) {
    // Handle specific duplicate key error if another process just created it
    if (error.code === 11000) {
      console.warn(
        `Duplicate key error: Folder with page ${folderData.page} already exists.`
      );
      // Try to fetch the existing folder one more time
      const existingFolder = await Folder.findOne({ page: folderData.page });
      return [existingFolder, false];
    }
    throw error; // Re-throw other errors
  }
};

// --- API HANDLERS ---

/**
 * Get all active folders/cards.
 * This is public for all authenticated users to populate the dashboard.
 */
export const getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ isActive: true });
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Failed to fetch folder cards." });
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
    console.error("Error fetching all folders (Admin):", error);
    res.status(500).json({ message: "Failed to fetch all folder cards." });
  }
};

/**
 * Create a new folder/card.
 * Restricted to s-admin/admin.
 */
export const createFolder = async (req, res) => {
  try {
    const {
      name,
      page,
      group,
      subtitle,
      ministry,
      requiredRole,
      isActive,
      theme,
      parentPath,
    } = req.body;

    if (!name || !page || !requiredRole) {
      return res
        .status(400)
        .json({ message: "Name, page, and requiredRole are mandatory." });
    }

    // Check if a folder with the same 'page' path already exists
    const existingFolder = await Folder.findOne({ page });
    if (existingFolder) {
      return res
        .status(409)
        .json({
          message: `A folder with the page path '${page}' already exists.`,
        });
    }

    const newFolder = new Folder({
      name,
      page,
      group,
      subtitle,
      ministry,
      requiredRole,
      isActive,
      theme,
      parentPath,
      createdBy: req.user.userId,
    });

    const savedFolder = await newFolder.save();

    // Log system event
    const performedBy = req.user.userId;
    const performedByName = req.user.username;
    const action = `Created folder card: ${savedFolder.name} (Page: ${savedFolder.page})`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(201).json({
      message: "Folder card created successfully.",
      folder: savedFolder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    if (error.code === 11000) {
      // Handle MongoDB unique index error (if name or page is set as unique)
      return res
        .status(409)
        .json({
          message: "A folder with this name or page path already exists.",
        });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Update an existing folder/card.
 * Restricted to s-admin/admin.
 */
export const updateFolder = async (req, res) => {
  try {
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({ message: "Folder card not found." });
    }

    // Log system event
    const performedBy = req.user ? req.user.userId : "System";
    const performedByName = req.user ? req.user.username : "System";
    const action = `Updated folder card: ${updatedFolder.name}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(200).json({
      message: "Folder card updated successfully.",
      folder: updatedFolder,
    });
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ message: "Internal server error." });
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
      return res.status(404).json({ message: "Folder card not found." });
    }

    // Log system event
    const performedBy = req.user ? req.user.userId : "System";
    const performedByName = req.user ? req.user.username : "System";
    const action = `Deleted folder card: ${deletedFolder.name}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(200).json({
      message: "Folder card deleted successfully.",
      name: deletedFolder.name,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * Get all active folders/cards filtered by a specific group name.
 * Expected API call: /api/folders/group/gosl-payroll
 */
export const getFoldersByGroup = async (req, res) => {
  // FIX: Read the group name from the path parameters (req.params)
  // The router defined it as /group/:groupName
  const groupName = req.params.group;

  if (!groupName) {
    // This check is a safeguard, but req.params.groupName will be defined if the route matched.
    return res
      .status(400)
      .json({ message: "Group name path parameter is required." });
  }

  try {
    // Find all active folders that match the provided group name
    const folders = await Folder.find({
      isActive: true,
      group: groupName,
    });

    // Note: If no folders are found, an empty array [] is returned, which is fine.
    res.status(200).json(folders);
  } catch (error) {
    console.error(`Error fetching folders for group '${groupName}':`, error);
    res.status(500).json({ message: "Failed to fetch folder cards by group." });
  }
};

/**
 * Get all active folders/cards filtered by a specific parent path.
 * Expected API call: /api/folders/parent?path=/path/to/parent
 */
export const getFoldersByParentPath = async (req, res) => {
  const parentPath = req.query.path;

  // 1. EXTRACT THE USER'S ROLE NAME
  // The verifyToken middleware has ensured that req.user is fully populated,
  // including the role document which contains the role's 'name' property.
  const userRoleName = req.user.role.name;

  if (!parentPath) {
    return res
      .status(400)
      .json({ message: "Parent path query parameter is required." });
  }

  try {
    // 2. CONSTRUCT THE SECURE MONGODB QUERY
    const query = {
      isActive: true,
      parentPath: parentPath,
      // Use the $in operator: Find all folders where the user's role name
      // is present in the Folder's 'requiredRole' array.
      requiredRole: { $in: [userRoleName] },
    };

    // Find active, accessible folders that match the parent path
    const folders = await Folder.find(query);

    // Note: If no folders are found, an empty array [] is returned, which is fine.
    res.status(200).json(folders);
  } catch (error) {
    console.error(
      `Error fetching folders by parent path '${parentPath}' for role '${userRoleName}':`,
      error
    );
    res
      .status(500)
      .json({ message: "Failed to fetch folder cards by parent path." });
  }
};

/**
 * API Handler: Route to trigger automatic folder generation.
 * This is for manual/admin use.
 */
export const generateArchiveFolders = async (req, res) => {
  const performedBy = req.user ? req.user.userId : "System";
  const performedByName = req.user ? req.user.username : "System";

  try {
    const result = await generateArchiveFoldersCore(
      performedBy,
      performedByName
    );

    res.status(200).json({
      message: "Payroll Archive folders generated successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Error generating archive folders (API):", error);
    res
      .status(500)
      .json({ message: "Failed to generate payroll archive folders." });
  }
};
