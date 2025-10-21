import mongoose from 'mongoose';
import User from '../user/userModel.js';

async function fixAdminMinistry() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://dnemmanuel:1YYM7j8mABLL8n24@ncscluster.n9bbidc.mongodb.net/gosl_payroll';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Find s-admin user
    const admin = await User.findOne({ username: 's-admin' });

    if (admin) {
      console.log(`👤 Found user: ${admin.username}`);
      console.log(`   Current ministry: "${admin.ministry}"`);
      
      // Update ministry to Government IT Services
      admin.ministry = 'Government IT Services';
      await admin.save();
      
      console.log(`   ✅ Updated ministry to: "${admin.ministry}"`);
    } else {
      console.log('❌ s-admin user not found!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminMinistry();
