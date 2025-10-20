import Permission from "../../models/permissionModel.js";

const initialPermissions = [
  // --- PDX Forms ---
  {
    key: "view_all_forms",
    name: "View All Forms",
    description: "Allows viewing access to all GOSL Payroll forms.",
  },
  {
    key: "submit_forms",
    name: "Submit Forms",
    description: "Allows user to submit GOSL Payroll forms.",
  },
  {
    key: "upload_documents",
    name: "Upload Documents",
    description: "Allows user to upload documents as part of their form submissions.",
  },

  // --- User Management ---
  {
    key: "view_all_users",
    name: "View All Users",
    description: "Allows user to view all user basic information.",
  },
  {
    key: "create_users",
    name: "Create Users",
    description: "Allows creation of any type of user.",
  },
  {
    key: "delete_users",
    name: "Delete Users",
    description: "Allows deletion of any type of user.",
  },
  {
    key: "edit_users",
    name: "Edit Users",
    description: "Allows modification of any existing user.",
  },

  // -- Role and Access Management --
  {
    key: "view_roles",
    name: "View Roles and Access",
    description: "Allows viewing access to all roles and their respective access.",
  },
  {
    key: "define_roles",
    name: "Define PDX Roles",
    description: "Allows the definition / creation of system roles.",
  },
  {
    key: "delete_roles",
    name: "Delete Roles",
    description: "Allows deletion of system roles.",
  },
  {
    key: "modify_roles",
    name: "modify_roles",
    description: "Allows modification of system roles.",
  },

  // -- Permissions Management --
  {
    key: "view_all_permissions",
    name: "View All Permissions",
    description: "Allows viewing to all system permissions.",
  },
  {
    key: "define_permissions",
    name: "Define Permissions",
    description: "Allows definitions / creation of system permissions.",
  },
  {
    key: "delete_permissions",
    name: "Delete Permissions",
    description: "Allows deletion of system permissions.",
  },
  {
    key: "modify_permissions",
    name: "Modify Permissions",
    description: "Allows modification of all system permissions.",
  },

  // -- Folder Management --
  {
    key: "view_all_folders",
    name: "View All Folders",
    description: "Allows viewing access to all GOSL Payroll folders.",
  },
  {
    key: "view_hrm_pser_folders",
    name: "View HRM Public Service folders",
    description: "Allows viewing access to HRM Public Service folders.",
  },
  {
    key: "manage_hrm_pser_folders",
    name: "Manage HRM Public Service folders",
    description: "Allows management (CRUD) access to HRM Public Service folders.",
  },
  {
    key: "view_agd_finance_folders",
    name: "View AGD Finance folders",
    description: "Allows viewing access to AGD Finance folders.",
  },
  {
    key: "manage_agd_finance_folders",
    name: "Manage AGD Finance folders",
    description: "Allows management (CRUD) access to AGD Finance folders.",
  },
  {
    key: "view_archives",
    name: "View Archives",
    description: "Allows viewing access to payroll archived folders and files.",
  },
  {
    key: "create_folders",
    name: "Create Folders",
    description: "Allows access to creating folders.",
  },
  {
    key: "delete_folders",
    name: "Delete Folders",
    description: "Allows access to deleting folders.",
  },
  {
    key: "edit_folders",
    name: "Edit Folders",
    description: "Allows access to editing folders.",
  },

  // -- System Events --
  {
    key: "view_system_events",
    name: "View System Events",
    description: "Allows viewing access to all system events.",
  },
  {
    key: "generate_event_reports",
    name: "Generate Event Reports",
    description: "Allows user to generate system reports.",
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
