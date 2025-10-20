import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function fixDocumentationPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const permissionsCollection = db.collection('permissions');
    const rolesCollection = db.collection('roles');

    // Find the documentation permission ObjectIds
    const docPermissions = await permissionsCollection.find({
      key: { $in: ['view_documentation', 'view_documentation_general', 'view_documentation_admin', 'view_documentation_payroll'] }
    }).toArray();

    console.log(`📚 Found ${docPermissions.length} documentation permissions\n`);
    
    if (docPermissions.length === 0) {
      console.log('❌ No documentation permissions found in database!');
      return;
    }

    docPermissions.forEach(p => {
      console.log(`  • ${p.name} (${p.key})`);
      console.log(`    ID: ${p._id}`);
    });

    // Get the permission IDs (as ObjectIds, not objects)
    const permissionIds = docPermissions.map(p => p._id);

    console.log('\n🔧 Updating roles...\n');

    // Update s-admin role
    const sAdminResult = await rolesCollection.updateOne(
      { name: 's-admin' },
      { $addToSet: { permissions: { $each: permissionIds } } }
    );
    console.log(`✅ s-admin: Added ${sAdminResult.modifiedCount > 0 ? 'new' : 'no new'} permissions`);

    // Update other roles with general documentation
    const generalPermIds = docPermissions
      .filter(p => ['view_documentation', 'view_documentation_general'].includes(p.key))
      .map(p => p._id);

    const generalRoles = await rolesCollection.find({ 
      name: { $in: ['lvl-1', 'lvl-2', 'lvl-3', 'lvl-4', 'HCM-Officer'] } 
    }).toArray();

    for (const role of generalRoles) {
      const result = await rolesCollection.updateOne(
        { _id: role._id },
        { $addToSet: { permissions: { $each: generalPermIds } } }
      );
      console.log(`✅ ${role.name}: Added ${result.modifiedCount > 0 ? 'new' : 'no new'} permissions`);
    }

    // Add payroll documentation to payroll roles
    const payrollPermIds = docPermissions
      .filter(p => p.key === 'view_documentation_payroll')
      .map(p => p._id);

    const payrollRoles = await rolesCollection.find({ 
      name: { $in: ['lvl-3', 'lvl-4', 'HCM-Officer'] } 
    }).toArray();

    for (const role of payrollRoles) {
      const result = await rolesCollection.updateOne(
        { _id: role._id },
        { $addToSet: { permissions: { $each: payrollPermIds } } }
      );
      console.log(`✅ ${role.name}: Added payroll documentation permission`);
    }

    console.log('\n✅ All permissions updated successfully!');
    console.log('\n🔄 Please log out and back in to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

fixDocumentationPermissions();
