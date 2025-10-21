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
    typeof userPermissionKeys[0] !== "string"
  ) {
    if (userPermissionKeys[0].key) {
      userPermissionKeys = userPermissionKeys.map((p) => p.key);
    } else {
      console.warn('Permissions are ObjectIds (not populated). Cannot filter folders by permissions.');
      userPermissionKeys = [];
    }
  } else if (!Array.isArray(userPermissionKeys)) {
    userPermissionKeys = [];
  }
  
  const isSuperAdmin = req.user.role?.name === 's-admin';
  
  console.log(
    `User Permissions FINAL CHECK (used in query): ${JSON.stringify(
      userPermissionKeys
    )}`
  );
  console.log("--- FOLDER FETCH DEBUG ---");
  console.log(`User Role: ${req.user.role?.name}`);
  console.log(`Is Super Admin: ${isSuperAdmin}`);
  console.log(
    `User Permissions (Normalized): ${userPermissionKeys.join(", ")}`
  );

  try {
    // 1. Security Check: If the user has no permissions and is not s-admin, return no folders.
    if (userPermissionKeys.length === 0 && !isSuperAdmin) {
      return res.status(200).json([]);
    }

    // 2. CONSTRUCT THE SECURE MONGODB QUERY
    // Determine parentPath based on group
    // - Root group (gosl-payroll): parentPath should be "/gosl-payroll"
    // - Other groups: parentPath should be "/gosl-payroll/{group}"
    let expectedParentPath;
    if (group === 'gosl-payroll') {
      expectedParentPath = '/gosl-payroll';
    } else {
      expectedParentPath = `/gosl-payroll/${group}`;
    }
    
    const query = {
      isActive: true,
      group: group, // Query by the 'group' field using the URL parameter.
      parentPath: expectedParentPath, // Only show top-level folders for this group
    };
    
    // Only filter by permissions if user is not s-admin
    if (!isSuperAdmin) {
      query.requiredPermissions = { $in: userPermissionKeys };
    }

    console.log(`MongoDB Query for group '${group}': ${JSON.stringify(query)}`);
    console.log(`Expected parentPath: ${expectedParentPath}`);
    console.log("--------------------------");

    // Find active, accessible folders that match the group
    const folders = await Folder.find(query).sort({ sortOrder: 1 });

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
    const folders = await Folder.find({ isActive: true }).sort({ sortOrder: 1 });
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
    let folders = await Folder.find().sort({ sortOrder: 1, createdAt: 1 });
    
    // Check if any folders have undefined or null sortOrder
    const needsInitialization = folders.some(f => f.sortOrder === undefined || f.sortOrder === null);
    
    if (needsInitialization) {
      console.log("Initializing sortOrder for folders without it...");
      
      // Initialize sortOrder based on creation order
      const updates = folders.map((folder, index) => {
        if (folder.sortOrder === undefined || folder.sortOrder === null) {
          return Folder.findByIdAndUpdate(
            folder._id,
            { sortOrder: index },
            { new: true }
          );
        }
        return Promise.resolve(folder);
      });
      
      folders = await Promise.all(updates);
      console.log(`Initialized sortOrder for ${folders.length} folders`);
    }
    
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
    childGroup,
    parentFolder,
    parentPath,
    subtitle,
    label,
    ministryFilter,
    ministry,
    requiredPermissions,
    isActive,
    theme,
  } = req.body;
  
  // Debug logging
  console.log('🆕 Creating new folder:');
  console.log('  Name:', name);
  console.log('  ParentFolder:', parentFolder);
  console.log('  ParentFolder type:', typeof parentFolder);
  console.log('  ParentFolder value:', JSON.stringify(parentFolder));

  // Validate required fields
  if (!name || !page || !group) {
    return res.status(400).json({
      message:
        "Name, page, and group are mandatory fields for folder creation.",
    });
  }

  // NOTE: You should also check that `requiredPermissions` is at least defined,
  // even if it's an empty array, but the main error is the field names.

  try {
    // Get the highest sortOrder to place new folder at the end
    const highestFolder = await Folder.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    const nextSortOrder = (highestFolder?.sortOrder ?? -1) + 1;

    const newFolder = new Folder({
      name,
      page,
      group, // Mandatory - single group code
      childGroup: childGroup || null, // Optional - single child group code
      parentFolder: parentFolder || null, // Optional - reference to parent folder
      parentPath: parentPath || '/', // Can be calculated or provided
      subtitle,
      label,
      ministryFilter,
      ministry,
      // Ensure requiredPermissions is an array, defaulting to an empty array if undefined/null
      requiredPermissions: Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [],
      isActive,
      theme,
      sortOrder: nextSortOrder, // Auto-assign sortOrder
      createdBy: req.user._id, // Assumes user is authenticated and attached by verifyToken
    });

    const savedFolder = await newFolder.save();

    // Log system event
    const performedBy = req.user ? req.user._id : "System";
    const performedByName = req.user ? req.user.username : "System";
    const action = `Created folder card: ${savedFolder.name}`;
    logSystemEvent(performedBy, performedByName, action);

    res.status(201).json({
      message: "Folder card created successfully.",
      folder: savedFolder,
    });
  } catch (error) {
    // Handle unique constraint errors (e.g., if name is duplicated)
    if (error.code === 11000) {
      console.error('Duplicate folder error:', error.message);
      console.error('Attempted to create:', { name, parentFolder });
      
      const location = parentFolder ? 'in this parent folder' : 'at the root level';
      return res
        .status(409)
        .json({ 
          message: `A folder named "${name}" already exists ${location}. You can use the same name in a different parent folder.`,
          details: { name, parentFolder }
        });
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
    typeof userPermissionKeys[0] !== "string"
  ) {
    // If permissions are objects with .key property
    if (userPermissionKeys[0].key) {
      userPermissionKeys = userPermissionKeys.map((p) => p.key);
    } else {
      // If permissions are ObjectIds (not populated), we can't filter by them
      // Set to empty array to show no folders OR bypass permission check for super admins
      console.warn('Permissions are ObjectIds (not populated). Cannot filter folders by permissions.');
      userPermissionKeys = [];
    }
  } else if (!Array.isArray(userPermissionKeys)) {
    userPermissionKeys = [];
  }

  if (!parentPath) {
    return res
      .status(400)
      .json({ message: "Parent path query parameter is required." });
  }

  try {
    // Find if there's a parent folder at this path to check for childGroup
    const parentFolder = await Folder.findOne({ page: parentPath });
    
    // 2. CONSTRUCT THE SECURE MONGODB QUERY
    const query = {
      isActive: true,
      parentPath: parentPath,
    };
    
    // Only filter by permissions if user is not s-admin and has permissions
    const isSuperAdmin = req.user.role?.name === 's-admin';
    if (!isSuperAdmin && userPermissionKeys.length > 0) {
      query.requiredPermissions = { $in: userPermissionKeys };
    } else if (!isSuperAdmin) {
      // User has no permissions and is not s-admin, show no folders
      query.requiredPermissions = { $in: [] };
    }
    // If s-admin, no permission filter is applied (shows all folders)
    
    // If parent folder has a childGroup, only show folders that belong to that group
    if (parentFolder && parentFolder.childGroup) {
      query.group = parentFolder.childGroup;
      console.log(`Parent folder has childGroup: ${parentFolder.childGroup}, filtering by group`);
    }

    console.log(`Fetching folders with query:`, JSON.stringify(query));
    const folders = await Folder.find(query).sort({ sortOrder: 1 });
    console.log(`Found ${folders.length} folders for path ${parentPath}`);
    
    // Log each folder's critical fields for debugging
    folders.forEach((folder, index) => {
      console.log(`Folder ${index + 1} details:`, {
        name: folder.name,
        page: folder.page,
        group: folder.group,
        parentPath: folder.parentPath,
        _id: folder._id
      });
    });

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

/**
 * Get a single folder by its exact page path
 * Expected API call: /api/folders/by-path?path=/path/to/folder
 */
export const getFolderByPath = async (req, res) => {
  const path = req.query.path;

  if (!path) {
    return res.status(400).json({ message: "Path query parameter is required." });
  }

  try {
    console.log(`Fetching folder by path: ${path}`);

    // Find folder by exact page match
    const folder = await Folder.findOne({ 
      page: path,
      isActive: true 
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found at this path." });
    }

    console.log(`✅ Found folder: ${folder.name} (${folder._id})`);
    res.status(200).json(folder);
  } catch (error) {
    console.error(`Error fetching folder by path '${path}':`, error);
    res.status(500).json({ message: "Failed to fetch folder by path." });
  }
};

/**
 * Bulk update sortOrder for multiple folders
 * Expected body: { folders: [{ _id: '...', sortOrder: 0 }, { _id: '...', sortOrder: 1 }] }
 */
export const bulkUpdateSortOrder = async (req, res) => {
  try {
    const { folders } = req.body;

    if (!Array.isArray(folders) || folders.length === 0) {
      return res.status(400).json({ message: "Folders array is required." });
    }

    console.log(`Updating sortOrder for ${folders.length} folders`);

    // Update each folder's sortOrder
    const updatePromises = folders.map(async (folder) => {
      console.log(`Updating folder ${folder._id} to sortOrder ${folder.sortOrder}`);
      return await Folder.findByIdAndUpdate(
        folder._id,
        { sortOrder: folder.sortOrder },
        { new: true }
      );
    });

    const updatedFolders = await Promise.all(updatePromises);
    console.log(`Successfully updated ${updatedFolders.length} folders`);

    // Log the action
    await logSystemEvent({
      eventType: "folder_reorder",
      eventCategory: "folder",
      description: `User ${req.user.username} reordered ${folders.length} folders`,
      performedBy: req.user._id,
      performedByName: req.user.username,
      metadata: {
        folderCount: folders.length,
      },
    });

    res.status(200).json({ 
      message: "Folder order updated successfully.",
      updatedCount: updatedFolders.length
    });
  } catch (error) {
    console.error("Error updating folder sort order:", error);
    res.status(500).json({ message: "Failed to update folder order." });
  }
};
