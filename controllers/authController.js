import User from '../user/userModel.js'; // Assuming you import your User model
import bcrypt from 'bcrypt';
import { generateToken } from '../helpers/jwt.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username, and select the password
    const appUser = await User.findOne({ username }).select('+password');

    if (!appUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, appUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Payload for JWT
    const payload = {
      _id: appUser._id,
      username: appUser.username,
      role: appUser.role,
      ministry: appUser.ministry,
    };
    const token = generateToken(payload);

    // --- CRITICAL CHANGE HERE: Include role and _id in the response ---
    res.json({
      message: 'Login successful',
      token: token,
      role: appUser.role, // Include the user's role
      _id: appUser._id,   // Include the user's ID
    });

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
