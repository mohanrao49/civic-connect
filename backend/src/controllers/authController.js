const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

class AuthController {
  // Helper function to clean address object - removes undefined values, especially coordinates
  cleanAddress(addressObj) {
    if (!addressObj || typeof addressObj !== 'object') return null;
    
    const clean = {};
    
    // Only include defined, non-empty string values
    if (addressObj.street && typeof addressObj.street === 'string' && addressObj.street.trim()) {
      clean.street = addressObj.street.trim();
    }
    if (addressObj.city && typeof addressObj.city === 'string' && addressObj.city.trim()) {
      clean.city = addressObj.city.trim();
    }
    if (addressObj.state && typeof addressObj.state === 'string' && addressObj.state.trim()) {
      clean.state = addressObj.state.trim();
    }
    if (addressObj.pincode && typeof addressObj.pincode === 'string' && addressObj.pincode.trim()) {
      clean.pincode = addressObj.pincode.trim();
    }
    
    // Only include coordinates if both latitude and longitude are valid numbers
    // Explicitly check for undefined and null to avoid any issues
    if (addressObj.coordinates && 
        typeof addressObj.coordinates === 'object' &&
        addressObj.coordinates !== null &&
        typeof addressObj.coordinates.latitude === 'number' && 
        typeof addressObj.coordinates.longitude === 'number' &&
        !isNaN(addressObj.coordinates.latitude) &&
        !isNaN(addressObj.coordinates.longitude) &&
        addressObj.coordinates.latitude !== null &&
        addressObj.coordinates.longitude !== null) {
      clean.coordinates = {
        latitude: addressObj.coordinates.latitude,
        longitude: addressObj.coordinates.longitude
      };
    }
    
    return Object.keys(clean).length > 0 ? clean : null;
  }


  // Register a new user (simple registration without OTP verification)
  // NO OTP verification required - user is created directly with password
  async register(req, res) {
    try {
      const { name, aadhaarNumber, mobile, email, password, address, coordinates } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required'
        });
      }

      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit mobile number is required'
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }

      // Create new user directly - NO OTP verification needed
      // MongoDB unique indexes will handle duplicate checks automatically
      const user = new User({
        name: name.trim(),
        mobile,
        role: 'citizen',
        isActive: true,
        isVerified: true, // Set to true immediately - no OTP verification required
        password
      });

      if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;
      if (email) user.email = email;

      // Set address
      if (address) {
        if (typeof address === 'string') {
          user.address = { street: address };
        } else {
          const cleanAddress = this.cleanAddress(address);
          if (cleanAddress) {
            user.address = cleanAddress;
          }
        }
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          if (!user.address) user.address = {};
          user.address.coordinates = {
            latitude: coordinates[0],
            longitude: coordinates[1]
          };
        }
      }
      
      try {
        await user.save();
      } catch (err) {
        if (err && err.code === 11000) {
          // MongoDB duplicate key error - handle specific fields
          const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
          let message = 'User already exists';
          if (dupField === 'mobile') {
            message = 'Mobile number is already registered. Please login instead.';
          } else if (dupField === 'aadhaarNumber') {
            message = 'Aadhaar number is already registered. Please login instead.';
          } else if (dupField === 'email') {
            message = 'Email is already registered. Please login instead.';
          } else {
            message = `User already exists with this ${dupField}`;
          }
          return res.status(400).json({
            success: false,
            message
          });
        }
        throw err;
      }

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.getProfile(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Registration error stack:', error.stack);
      console.error('Registration request body:', req.body);
      
      // Provide more specific error messages
      let errorMessage = 'Server error during registration';
      if (error.name === 'ValidationError') {
        errorMessage = 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ');
      } else if (error.name === 'MongoServerError' && error.code === 11000) {
        const dupField = Object.keys(error.keyPattern || {})[0] || 'field';
        errorMessage = `User already exists with this ${dupField}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, mobile, employeeId, aadhaarNumber, password } = req.body;

      // Find user by email, mobile, employeeId, or aadhaarNumber
      const query = {};
      if (employeeId) {
        query.employeeId = employeeId;
      } else if (email) {
        query.email = email;
      } else if (aadhaarNumber) {
        query.aadhaarNumber = aadhaarNumber;
      } else if (mobile) {
        query.mobile = mobile;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Email, mobile, Aadhaar number, or employee ID is required'
        });
      }

      const user = await User.findOne(query).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated or registration incomplete'
        });
      }

      // Verify password - password is required for citizen login
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      // Check if user has a password set
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'Password not set. Please complete your registration.'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update login info
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();

      // Generate tokens
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.getProfile(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message
      });
    }
  }



  // Guest login
  async guestLogin(req, res) {
    try {
      const guestUser = new User({
        name: 'Guest User',
        role: 'guest',
        isGuest: true
      });

      await guestUser.save();

      // Generate tokens
      const token = generateToken(guestUser._id);
      const refreshToken = generateRefreshToken(guestUser._id);

      res.json({
        success: true,
        message: 'Guest login successful',
        data: {
          user: guestUser.getProfile(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Guest login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during guest login',
        error: error.message
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: error.message
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user.getProfile()
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting profile',
        error: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { name, email, mobile, address, preferences } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;
      if (address) user.address = address;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.getProfile()
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating profile',
        error: error.message
      });
    }
  }

  // Logout (invalidate token)
  async logout(req, res) {
    try {
      // In a more sophisticated setup, you would blacklist the token
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during logout',
        error: error.message
      });
    }
  }

  // Admin login
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;

      // Simple admin authentication (in production, use proper admin management)
      if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        // Find or create admin user
        let adminUser = await User.findOne({ role: 'admin' });
        
        if (!adminUser) {
          adminUser = new User({
            name: 'Admin User',
            email: process.env.ADMIN_EMAIL,
            role: 'admin',
            isVerified: true,
            isActive: true
          });
          await adminUser.save();
        }

        // Generate tokens
        const token = generateToken(adminUser._id);
        const refreshToken = generateRefreshToken(adminUser._id);

        res.json({
          success: true,
          message: 'Admin login successful',
          data: {
            user: adminUser.getProfile(),
            token,
            refreshToken
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid admin credentials'
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during admin login',
        error: error.message
      });
    }
  }

  // Employee login (using Employee ID)
  async employeeLogin(req, res) {
    try {
      const { employeeId, password } = req.body;

      if (!employeeId || !password) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID and password are required'
        });
      }

      let user = await User.findOne({ employeeId }).select('+password');

      // In development or when demo is allowed, auto-create a demo employee if missing
      const allowDemo = process.env.ALLOW_DEMO_EMPLOYEE !== 'false';
      if (!user && allowDemo) {
        const demo = new User({
          name: 'Demo Employee',
          employeeId,
          role: 'employee',
          department: department || 'Road & Traffic',
          password: password || 'emp123',
          isVerified: true,
          isActive: true
        });
        await demo.save();
        user = await User.findOne({ _id: demo._id }).select('+password');
      }

      // Check if user is an employee (field-staff, supervisor, commissioner, or legacy 'employee')
      const employeeRoles = ['field-staff', 'supervisor', 'commissioner', 'employee'];
      if (!user || !employeeRoles.includes(user.role)) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid employee credentials' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated' 
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        message: `Welcome, Employee ID: ${user.employeeId}`,
        data: {
          user: user.getProfile(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Employee login error:', error);
      res.status(500).json({ success: false, message: 'Server error during employee login', error: error.message });
    }
  }
}

module.exports = new AuthController();
