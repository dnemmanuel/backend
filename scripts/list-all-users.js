import mongoose from 'mongoose';
import User from '../user/userModel.js';

async function listAllUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/gosl_payroll');
    console.log('✅ Connected to database\n');

    const users = await User.find().populate('role');
    
    console.log(`👥 Total users: ${users.length}\n`);
    
    for (const user of users) {
      console.log(`👤 ${user.username} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Role: ${user.role?.name || 'No role'}`);
      
      if (user.role) {
        const permissions = user.role.permissions || [];
        if (permissions.length > 0) {
          console.log(`   Permissions: ${permissions.map(p => typeof p === 'string' ? p : p.key).join(', ')}`);
        } else {
          console.log(`   ❌ No permissions`);
        }
      }
      console.log('');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listAllUsers();
