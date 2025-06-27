import appAdmin from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../helpers/jwt.js'

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the admin user by username
    const adminUser = await appAdmin.findOne({ username }).select('+password');
    console.log(adminUser)

    if (!adminUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      _id: adminUser._id,
      username: adminUser.username,
      role: adminUser.role,
    };
    const token = generateToken(payload);

    res.json({ message: 'Login successful', token: token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      res.status(500).json({ message: 'Failed to logout' });
    } else {
      res.json({ message: 'Logout successful' });
    }
  });
};