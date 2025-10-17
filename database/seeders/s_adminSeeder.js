import mongoose from "mongoose";
import bcrypt from "bcrypt"; // 💡 Re-import bcrypt here
import User from "../../user/userModel.js";
import Role from "../../models/roleModel.js";
import Permission from "../../models/permissionModel.js";

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
      name: "s-admin",
      description:
        "Super Administrator Role - Grants all permissions and bypasses all checks.",
      permissions: permissionIds,
    };

    const superAdminRole = await Role.findOneAndUpdate(
      { name: "s-admin" },
      superAdminRoleData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(
      `✅ Super Admin Role '${superAdminRole.name}' ensured (ID: ${superAdminRole._id}) with ${permissionIds.length} permissions.`
    );

    // 3. 💡 FIX: Check and Create/Update the Super Admin User
    const existingUser = await User.findOne({ username: "s-admin" }).select('+password'); // Select password for check

    let superAdminUser;

    if (existingUser) {
        // User exists: Update only non-sensitive/non-password fields (to trigger no save hook)
        // Ensure the role and ministry are correct
        existingUser.role = superAdminRole._id;
        existingUser.ministry = "Government IT Services";

        // Use findOneAndUpdate for a more atomic update operation
        superAdminUser = await User.findOneAndUpdate(
            { username: "s-admin" },
            { $set: { role: superAdminRole._id, ministry: "Government IT Services" } },
            { new: true }
        );
        console.log(`✅ Super Admin User '${superAdminUser.username}' updated (ID: ${superAdminUser._id}).`);

    } else {
        // User does NOT exist: Create new user, which triggers the pre-save hook.
        
        // 💡 CRITICAL: Ensure the password field is set when creating
        const tempUserData = {
            username: "s-admin",
            password: "password", // Will be hashed by the pre-save hook in userModel.js
            email: "dinnelemmanuel@gmail.com",
            firstName: "Dinnel",
            lastName: "Emmanuel",
            isActive: true,
            role: superAdminRole._id,
            ministry: "Government IT Services",
        };

        const newUser = new User(tempUserData);
        // The save() method *MUST* be used to trigger the pre('save') hook
        superAdminUser = await newUser.save();
        
        console.log(`✅ Super Admin User '${superAdminUser.username}' created (ID: ${superAdminUser._id}).`);
    }

  } catch (error) {
    console.error("❌ Super Admin Seeding failed:", error.message);
  }
}