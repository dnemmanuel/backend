import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import appAdmin from '../../models/userModel.js'; // Add .js

export async function seedSuperAdminUser() {
  try {
    // Check if an admin user already exists
    const existingAdmin = await appAdmin.findOne({ username: 'admin' });

    if (!existingAdmin) {
      // Create the initial admin user
      // const hashedPassword = await bcrypt.hash('password', 10); // Change 'password'
      const newAdmin = new appAdmin({
        username: 'admin',
        password: 'password',
        role: 's-admin', 
        email: 'dinnelemmanuel@gmail.com',
        firstName: 'Dinnel',
        lastName: 'Emmanuel',
        ministry: "Government IT Services"
      });
      await newAdmin.save();
      console.log('Initial admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}