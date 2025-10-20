import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function seedDocumentationPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const permissionsCollection = db.collection('permissions');
    const rolesCollection = db.collection('roles');

    // Define documentation permissions
    const documentationPermissions = [
      {
        key: 'view_documentation',
        name: 'View Documentation',
        description: 'Can access and view system documentation',
        category: 'Documentation',
      },
      {
        key: 'view_documentation_general',
        name: 'View General Documentation',
        description: 'Can view general user documentation (Getting Started, Troubleshooting)',
        category: 'Documentation',
      },
      {
        key: 'view_documentation_admin',
        name: 'View Admin Documentation',
        description: 'Can view admin-level documentation (User Management, System Events, Roles)',
        category: 'Documentation',
      },
      {
        key: 'view_documentation_payroll',
        name: 'View Payroll Documentation',
        description: 'Can view payroll processing documentation',
        category: 'Documentation',
      },
    ];

    console.log('📝 Seeding documentation permissions...\n');

    const insertedPermissions = [];

    for (const perm of documentationPermissions) {
      const existing = await permissionsCollection.findOne({ key: perm.key });
      
      if (existing) {
        console.log(`⏭️  Permission "${perm.name}" already exists, skipping...`);
        insertedPermissions.push(existing);
      } else {
        const result = await permissionsCollection.insertOne(perm);
        console.log(`✅ Created permission: ${perm.name}`);
        insertedPermissions.push({ _id: result.insertedId, ...perm });
      }
    }

    console.log('\n📋 Assigning permissions to roles...\n');

    // Find roles
    const sAdminRole = await rolesCollection.findOne({ name: 's-admin' });
    const adminRole = await rolesCollection.findOne({ name: 'admin' });

    if (!sAdminRole) {
      console.warn('⚠️  s-admin role not found, skipping role assignment');
    } else {
      // Give s-admin all documentation permissions
      const allDocPermissions = insertedPermissions.map(p => ({ 
        key: p.key, 
        name: p.name 
      }));

      await rolesCollection.updateOne(
        { _id: sAdminRole._id },
        { 
          $addToSet: { 
            permissions: { $each: allDocPermissions } 
          } 
        }
      );
      console.log(`✅ Added all documentation permissions to s-admin role`);
    }

    if (!adminRole) {
      console.warn('⚠️  admin role not found, skipping role assignment');
    } else {
      // Give admin all documentation permissions
      const allDocPermissions = insertedPermissions.map(p => ({ 
        key: p.key, 
        name: p.name 
      }));

      await rolesCollection.updateOne(
        { _id: adminRole._id },
        { 
          $addToSet: { 
            permissions: { $each: allDocPermissions } 
          } 
        }
      );
      console.log(`✅ Added all documentation permissions to admin role`);
    }

    // Find and update other roles with general documentation access
    const generalRoles = await rolesCollection.find({ 
      name: { $in: ['lvl-1', 'lvl-2', 'lvl-3', 'lvl-4', 'HCM-Officer'] } 
    }).toArray();

    const generalDocPerms = insertedPermissions
      .filter(p => ['view_documentation', 'view_documentation_general'].includes(p.key))
      .map(p => ({ key: p.key, name: p.name }));

    for (const role of generalRoles) {
      await rolesCollection.updateOne(
        { _id: role._id },
        { 
          $addToSet: { 
            permissions: { $each: generalDocPerms } 
          } 
        }
      );
      console.log(`✅ Added general documentation permissions to ${role.name} role`);
    }

    // Add payroll documentation to payroll-related roles
    const payrollRoles = await rolesCollection.find({ 
      name: { $in: ['lvl-3', 'lvl-4', 'HCM-Officer'] } 
    }).toArray();

    const payrollDocPerm = insertedPermissions
      .filter(p => p.key === 'view_documentation_payroll')
      .map(p => ({ key: p.key, name: p.name }));

    for (const role of payrollRoles) {
      await rolesCollection.updateOne(
        { _id: role._id },
        { 
          $addToSet: { 
            permissions: { $each: payrollDocPerm } 
          } 
        }
      );
      console.log(`✅ Added payroll documentation permissions to ${role.name} role`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Documentation permissions seeded successfully!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Permissions created/verified: ${insertedPermissions.length}`);
    console.log(`   Roles updated: ${2 + generalRoles.length + payrollRoles.length}`);
    console.log('\n🔐 Permission assignments:');
    console.log('   • s-admin & admin: All documentation access');
    console.log('   • Basic users (lvl-1, lvl-2): General documentation only');
    console.log('   • Support/Workflow users (lvl-3, lvl-4, HCM-Officer): General + Payroll docs');

  } catch (error) {
    console.error('\n❌ Error seeding documentation permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  }
}

seedDocumentationPermissions();
