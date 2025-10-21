const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=${process.env.DB_NAME}`;

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  ministry: { type: String },
  role: {
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true }
  },
  permissions: [String],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ 'role.name': 's-admin' });
    if (existingAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log(`Username: ${existingAdmin.username}`);
      process.exit(0);
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('Admin@2025', 10);
    
    const superAdmin = new User({
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@govt.lc',
      ministry: 'System',
      role: {
        _id: new mongoose.Types.ObjectId(),
        name: 's-admin'
      },
      permissions: [],
      active: true
    });

    await superAdmin.save();

    console.log('');
    console.log('✅ Super Admin Created Successfully!');
    console.log('-----------------------------------');
    console.log('Username: admin');
    console.log('Password: Admin@2025');
    console.log('-----------------------------------');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

createSuperAdmin();
