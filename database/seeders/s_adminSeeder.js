import mongoose from "mongoose";
import bcrypt from "bcrypt"; // 💡 Re-import bcrypt here
import User from "../../user/userModel.js";
import Role from "../../models/roleModel.js";
import Permission from "../../models/permissionModel.js";
import { Env } from "../../helpers/env.js";
import { ROLES } from "../../constants/index.js";
import { logWarn, logInfo, logError } from "../../utils/logger.js";

export async function seedSuperAdminUser() {
  try {
    // 1. Get all existing Permission IDs
    const allPermissions = await Permission.find({}, "_id");
    const permissionIds = allPermissions.map((p) => p._id);

    if (permissionIds.length === 0) {
      console.warn(
        "⚠️ WARNING: No permissions found. The Super Admin role will have no permissions."
      );
    }

    // 2. Find or Create the Super Admin Role ('s-admin') and assign ALL permissions
    const superAdminRoleData = {
      name: ROLES.SUPER_ADMIN,
      description:
        "Super Administrator Role - Grants all permissions and bypasses all checks.",
      permissions: permissionIds,
    };

    const superAdminRole = await Role.findOneAndUpdate(
      { name: ROLES.SUPER_ADMIN },
      superAdminRoleData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    logInfo(
      `Super Admin Role '${superAdminRole.name}' ensured (ID: ${superAdminRole._id}) with ${permissionIds.length} permissions.`
    );

    // 3. Check and Create/Update the Super Admin User
    const SUPER_ADMIN_USERNAME = Env.get('SUPER_ADMIN_USERNAME', 's-admin');
    const SUPER_ADMIN_PASSWORD = Env.get('SUPER_ADMIN_PASSWORD');
    const SUPER_ADMIN_EMAIL = Env.get('SUPER_ADMIN_EMAIL', 'admin@gosl.gov.lc');
    
    // SECURITY WARNING: Check if using default/weak password
    if (!SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD === 'password') {
      logWarn(
        '⚠️  SECURITY WARNING: Super Admin password not set or using default "password". ' +
        'Please set SUPER_ADMIN_PASSWORD in your .env file immediately! ' +
        'Using temporary fallback for seeding only.'
      );
    }
    
    const existingUser = await User.findOne({ username: SUPER_ADMIN_USERNAME }).select('+password');

    let superAdminUser;

    if (existingUser) {
        // User exists: Update only non-sensitive/non-password fields
        superAdminUser = await User.findOneAndUpdate(
            { username: SUPER_ADMIN_USERNAME },
            { $set: { role: superAdminRole._id, ministry: "Government IT Services" } },
            { new: true }
        );
        logInfo(`Super Admin User '${superAdminUser.username}' updated (ID: ${superAdminUser._id}).`);

    } else {
        // User does NOT exist: Create new user
        const tempUserData = {
            username: SUPER_ADMIN_USERNAME,
            password: SUPER_ADMIN_PASSWORD || 'TempP@ssw0rd!ChangeMe', // Fallback for first setup
            email: SUPER_ADMIN_EMAIL,
            firstName: "Super",
            lastName: "Administrator",
            isActive: true,
            role: superAdminRole._id,
            ministry: "Government IT Services",
        };

        const newUser = new User(tempUserData);
        superAdminUser = await newUser.save();
        
        logInfo(`Super Admin User '${superAdminUser.username}' created (ID: ${superAdminUser._id}).`);
        
        if (!SUPER_ADMIN_PASSWORD) {
          logWarn(
            '⚠️  CRITICAL: Super Admin created with temporary password. ' +
            'Please set SUPER_ADMIN_PASSWORD environment variable and restart the application!'
          );
        }
    }

  } catch (error) {
    logError("Super Admin Seeding failed", error);
  }
}