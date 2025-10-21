import mongoose from 'mongoose';
import User from '../user/userModel.js';

async function checkUserPermissions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    // Get the user who created these folders
    const userId = '68f191be46ad0e671d80b69e';
    
    const user = await User.findById(userId).populate('role');
    
    if (user) {
      console.log(`👤 User: ${user.username}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Role: ${user.role?.name || 'No role'}\n`);
      
      if (user.role) {
        const permissions = user.role.permissions || [];
        console.log(`✅ User Permissions (${permissions.length}):`);
        
        if (Array.isArray(permissions) && permissions.length > 0) {
          permissions.forEach(p => {
            if (typeof p === 'string') {
              console.log(`   - ${p}`);
            } else if (p.key) {
              console.log(`   - ${p.key}`);
            } else {
              console.log(`   - ${JSON.stringify(p)}`);
            }
          });
        } else {
          console.log('   ❌ No permissions found!');
        }
      } else {
        console.log('❌ User has no role assigned!');
      }
    } else {
      console.log('❌ User not found!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserPermissions();
