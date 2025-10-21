import mongoose from 'mongoose';
import User from '../user/userModel.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dnemmanuel:1YYM7j8mABLL8n24@ncscluster.n9bbidc.mongodb.net/gosl_payroll';

/**
 * Update a user's ministry field
 * Usage: node scripts/set-user-ministry.js <username> <ministry>
 * Example: node scripts/set-user-ministry.js s-admin "Equity"
 */
async function setUserMinistry() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('❌ Missing arguments');
      console.log('Usage: node scripts/set-user-ministry.js <username> <ministry>');
      console.log('Example: node scripts/set-user-ministry.js s-admin "Equity"');
      process.exit(1);
    }

    const username = args[0];
    const ministry = args[1];

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`❌ User "${username}" not found`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`📝 Current user details:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Ministry: ${user.ministry || '(not set)'}`);
    console.log(`   Role: ${user.role?.name || 'N/A'}\n`);

    // Update ministry
    user.ministry = ministry;
    await user.save();

    console.log(`✅ Updated user "${username}" with ministry: "${ministry}"`);
    console.log(`\n💡 User must log out and log back in for changes to take effect.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

setUserMinistry();
