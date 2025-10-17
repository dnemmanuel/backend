import Permission from "../../models/permissionModel.js";

const initialPermissions = [
  // --- User/Role Management Permissions ---
  {
    key: "view_user_manager",
    name: "View User Manager",
    description: "Allows access to the user list and basic info.",
  },
  {
    key: "edit_user_details",
    name: "Edit User Details",
    description: "Allows changing a user's name, email, or ministry.",
  },
  {
    key: "reset_user_password",
    name: "Reset User Password",
    description: "Allows forced password resets for other users.",
  },
  {
    key: "create_user",
    name: "Create New Users",
    description: "Allows creation of new user accounts.",
  },
  {
    key: "delete_user",
    name: "Delete Users",
    description: "Allows permanent removal of user accounts.",
  },

  // 💡 FIX 4: Add permissions for Role/Permission Management that are checked in the routes
  {
    key: "manage_roles",
    name: "Manage Roles",
    description: "Grants access to the Role Manager page.",
  },
  {
    key: "manage_permissions",
    name: "Manage Permissions",
    description: "Grants access to the Permission Manager.",
  },
  {
    key: "view_permission_manager",
    name: "View Permission Manager",
    description: "Allows viewing the list of all permissions.",
  },
  {
    key: "create_permission",
    name: "Create Permissions",
    description: "Allows creation of new permissions.",
  },
  {
    key: "edit_permission",
    name: "Edit Permissions",
    description: "Allows modification of existing permissions.",
  },
  {
    key: "delete_permission",
    name: "Delete Permissions",
    description: "Allows permanent deletion of permissions.",
  },

  // --- Payroll/Document Permissions ---
  {
    key: "upload_payroll_pdfs",
    name: "Upload Payroll PDFs",
    description: "Grants ability to upload new payroll document PDFs.",
  },
  {
    key: "delete_payroll_pdfs",
    name: "Delete Payroll PDFs",
    description: "Grants ability to permanently remove payroll documents.",
  },
  {
    key: "view_all_folders",
    name: "View All Folders",
    description: "Allows user to see and browse all document folders.",
  },
  {
    key: "download_payroll_docs",
    name: "Download Payroll Documents",
    description: "Allows downloading of sensitive payroll documents.",
  },

  // --- System Permissions ---
  {
    key: "view_system_events",
    name: "View System Log",
    description: "Access to the System Events Log.",
  },
];

export const seedPermissions = async () => {
  try {
    const count = await Permission.countDocuments();
    if (count === 0) {
      // Use insertMany for efficiency
      await Permission.insertMany(initialPermissions, { ordered: false });
      console.log(
        "✅ Permissions Seeding: Initial permissions added successfully."
      );
    } else {
      console.log(
        `ℹ️ Permissions Seeding: ${count} permissions already exist. Skipping seeding.`
      );
    }
  } catch (error) {
    console.error("❌ Permissions Seeding failed:", error.message);
  }
};
