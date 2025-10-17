import Folder from "../folder/folderModel.js";
import { logSystemEvent } from "../controllers/systemEventController.js";
import dayjs from "dayjs";

// --- CORE GENERATION LOGIC (Reusable by API and Cron) ---

/**
 * Core function to automatically generate the Year folder for the NEXT month
 * and the Month folder itself for the Payroll Archive.
 * This function is idempotent (safe to run multiple times).
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
    const nextMonthDayjs = today.add(1, "month");

    const targetYear = nextMonthDayjs.year();
    const targetMonthIndex = nextMonthDayjs.month();
    const targetMonthName = months[targetMonthIndex];

    // --- 1. Ensure the Year folder exists (e.g., /payroll-archive/2025) ---
    const yearFolderName = String(targetYear);
    const yearFolderPage = `${BASE_PAGE}/${targetYear}`;

    let yearFolder = await Folder.findOne({
      name: yearFolderName,
      group: GENERATED_GROUP,
      parentPath: BASE_PAGE,
    });

    if (!yearFolder) {
      yearFolder = await Folder.create({
        name: yearFolderName,
        page: yearFolderPage,
        group: GENERATED_GROUP,
        parentPath: BASE_PAGE,
        subtitle: `Payroll files for year ${targetYear}`,
        requiredPermissions: ["payroll_view"],
        theme: "blue",
        createdBy: performedBy,
      });
      newFoldersCreated.push(yearFolder.name);
      logSystemEvent(
        performedBy,
        performedByName,
        "Folder Created",
        `Created Payroll Year folder: ${yearFolder.name}`,
        yearFolder._id
      );
    } else {
      foldersSkipped++;
    }

    // --- 2. Ensure the Month folder exists inside the Year folder (e.g., /payroll-archive/2025/January) ---
    const monthFolderName = `${targetMonthName} ${targetYear}`;
    const monthFolderPage = `${yearFolderPage}/${targetMonthName}`;

    let monthFolder = await Folder.findOne({
      name: monthFolderName,
      group: GENERATED_GROUP,
      parentPath: yearFolderPage,
    });

    if (!monthFolder) {
      monthFolder = await Folder.create({
        name: monthFolderName,
        page: monthFolderPage,
        group: GENERATED_GROUP,
        parentPath: yearFolderPage,
        subtitle: `Payroll files for ${targetMonthName} ${targetYear}`,
        requiredPermissions: ["payroll_view"],
        theme: "green",
        createdBy: performedBy,
      });
      newFoldersCreated.push(monthFolder.name);
      logSystemEvent(
        performedBy,
        performedByName,
        "Folder Created",
        `Created Payroll Month folder: ${monthFolder.name}`,
        monthFolder._id
      );
    } else {
      foldersSkipped++;
    }

    return { newFoldersCreated, foldersSkipped };
  } catch (error) {
    console.error("Error in generateArchiveFoldersCore:", error);
    logSystemEvent(
      performedBy,
      performedByName,
      "Folder Generation Failed",
      `System failed to create archive folders. Error: ${error.message}`
    );
    throw error;
  }
};

/**
 * API Handler: Fetches active folders for a specific group (e.g., 'gosl-payroll')
 * based on the authenticated user's permissions.
 * Expected API call: /api/folders/group/gosl-payroll
 */
export const getFoldersByGroup = async (req, res) => {
  // Use the group parameter for filtering
  const group = req.params.group;

  // Get user permissions. We assume req.user is populated by middleware.
  let userPermissionKeys = req.user.role?.permissions || [];

  // Normalize permissions to an array of strings for the MongoDB query.
  if (
    userPermissionKeys.length > 0 &&
    typeof userPermissionKeys[0] !== "string" &&
    userPermissionKeys[0].key
  ) {
    userPermissionKeys = userPermissionKeys.map((p) => p.key);
  } else if (!Array.isArray(userPermissionKeys)) {
    userPermissionKeys = [];
  }
  console.log(
    `User Permissions FINAL CHECK (used in query): ${JSON.stringify(
      userPermissionKeys
    )}`
  );
  console.log("--- FOLDER FETCH DEBUG ---");
  console.log(
    `User Permissions (Normalized): ${userPermissionKeys.join(", ")}`
  );

  try {
    // 1. Security Check: If the user has no permissions, return no folders.
    if (userPermissionKeys.length === 0) {
      return res.status(200).json([]);
    }

    // 2. CONSTRUCT THE SECURE MONGODB QUERY
    const query = {
      isActive: true,
      group: group, // ✅ FIX 1: Query by the 'group' field using the URL parameter.
      parentPath: "/", // ✅ FIX 2: Only show top-level folders (parentPath: '/') for the dashboard view.
      requiredPermissions: { $in: userPermissionKeys },
    };

    console.log(`MongoDB Query for group '${group}': ${JSON.stringify(query)}`);
    console.log("--------------------------");

    // Find active, accessible folders that match the group
    const folders = await Folder.find(query);

    res.status(200).json(folders);
  } catch (error) {
    console.error(
      `Error fetching folders by group '${group}' for user ${req.user.username} (Permissions Check):`,
      error
    );
    res.status(500).json({ message: "Failed to fetch folder cards by group." });
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
  // Ensure the required fields are extracted from the request body.
  const {
    name,
    page,
    group,
    subtitle,
    ministry,
    requiredPermissions,
    isActive,
    theme,
  } = req.body;

  // 🛑 CRITICAL FIX: The error is here, checking for the wrong fields.
  if (!name || !page || !group) {
    // <-- Check for the correct required fields: name, page, and group
    return res.status(400).json({
      message:
        "Name, page, and group are mandatory fields for folder creation.", // <-- Corrected message
    });
  }

  // NOTE: You should also check that `requiredPermissions` is at least defined,
  // even if it's an empty array, but the main error is the field names.

  try {
    const newFolder = new Folder({
      name,
      page,
      group, // Mandatory
      // parentPath can be calculated if needed, or default to '/' (as per model)
      subtitle,
      ministry,
      // Ensure requiredPermissions is an array, defaulting to an empty array if undefined/null
      requiredPermissions: Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [],
      isActive,
      theme,
      createdBy: req.user._id, // Assumes user is authenticated and attached by verifyToken
    });

    const savedFolder = await newFolder.save();

    res.status(201).json({
      message: "Folder card created successfully.",
      folder: savedFolder,
    });
  } catch (error) {
    // Handle unique constraint errors (e.g., if name is duplicated)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A folder with this name already exists." });
    }
    console.error("Error creating folder:", error);
    res
      .status(500)
      .json({ message: "Internal server error during folder creation." });
  }
};
/**
 * Update an existing folder/card.
 * Restricted to s-admin/admin.
 */
export const updateFolder = async (req, res) => {
  try {
    // If the deprecated 'requiredRole' field is passed, map it to the new 'requiredPermissions' field.
    if (req.body.requiredRole) {
      req.body.requiredPermissions = req.body.requiredRole;
      delete req.body.requiredRole;
    }

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
 * Get all active folders/cards filtered by a specific parent path.
 * Expected API call: /api/folders/parent?path=/path/to/parent
 */
export const getFoldersByParentPath = async (req, res) => {
  const parentPath = req.query.path;

  // 1. EXTRACT THE USER'S PERMISSIONS
  let userPermissionKeys = req.user.role?.permissions || [];

  // Normalize permissions to an array of strings
  if (
    userPermissionKeys.length > 0 &&
    typeof userPermissionKeys[0] !== "string" &&
    userPermissionKeys[0].key
  ) {
    userPermissionKeys = userPermissionKeys.map((p) => p.key);
  } else if (!Array.isArray(userPermissionKeys)) {
    userPermissionKeys = [];
  }

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
      // ✅ FIX: Use the $in operator against the requiredPermissions field
      requiredPermissions: { $in: userPermissionKeys },
    };

    const folders = await Folder.find(query);

    res.status(200).json(folders);
  } catch (error) {
    console.error(
      `Error fetching folders by parent path '${parentPath}' for user ${req.user.username} (Permissions Check):`,
      error
    );
    res
      .status(500)
      .json({ message: "Failed to fetch folder cards by parent path." });
  }
};
