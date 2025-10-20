import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function checkRolePermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const rolesCollection = db.collection('roles');

    const sAdminRole = await rolesCollection.findOne({ name: 's-admin' });
    
    if (!sAdminRole) {
      console.log('❌ s-admin role not found!');
      return;
    }

    console.log('📋 s-admin Role Details:');
    console.log('Role ID:', sAdminRole._id);
    console.log('Role Name:', sAdminRole.name);
    console.log('\n🔐 Permissions (' + (sAdminRole.permissions?.length || 0) + ' total):');
    
    if (sAdminRole.permissions && sAdminRole.permissions.length > 0) {
      sAdminRole.permissions.forEach((perm, index) => {
        console.log(`${index + 1}. ${perm.name || perm.key || perm}`);
        if (perm.key) console.log(`   Key: ${perm.key}`);
      });
      
      // Check for documentation permissions specifically
      console.log('\n📚 Documentation Permissions:');
      const docPerms = sAdminRole.permissions.filter(p => 
        (p.key && p.key.includes('documentation')) || 
        (typeof p === 'string' && p.includes('documentation'))
      );
      
      if (docPerms.length > 0) {
        console.log('✅ Found documentation permissions:');
        docPerms.forEach(p => console.log('  -', p.name || p.key || p));
      } else {
        console.log('❌ No documentation permissions found!');
      }
    } else {
      console.log('❌ No permissions found on s-admin role!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkRolePermissions();
