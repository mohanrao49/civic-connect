const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
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

  // Send OTP for registration (stores registration data temporarily)
  async sendOTPForRegistration(req, res) {
    try {
      const { name, aadhaarNumber, mobile, address, coordinates, password } = req.body;

      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid mobile number is required'
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ mobile });
      if (existingUser && existingUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'User already registered with this mobile number'
        });
      }

      // Create or update temporary user for registration
      let user = existingUser;
      if (!user) {
        user = new User({
          mobile,
          role: 'citizen',
          isActive: false,
          isVerified: false
        });
      }

      // Store registration data temporarily (we'll use a custom field or update user)
      // For now, we'll store it in the user object and update it during final registration
      if (name) user.name = name;
      if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;
      if (address) {
        if (typeof address === 'string') {
          user.address = { street: address };
        } else {
          user.address = this.cleanAddress(address) || { street: address };
        }
        if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
          if (!user.address) user.address = {};
          user.address.coordinates = {
            latitude: coordinates[0],
            longitude: coordinates[1]
          };
        }
      }
      // Store password temporarily (will be hashed on save)
      user.password = password;

      // Generate OTP
      const otp = user.generateOTP();
      console.log('Generated OTP for registration:', otp);
      await user.save();

      // Send OTP via SMS
      const smsResult = await smsService.sendOTP(mobile, otp, name || 'User');
      
      // NEVER return OTP in response - only send via SMS
      if (smsResult.devMode) {
        console.log(`[DEV MODE] OTP for ${mobile}: ${otp} - Check server logs only`);
      }

      if (!smsResult.success && !smsResult.devMode) {
        console.error('SMS sending failed:', smsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again or contact support.',
          error: 'SMS service unavailable'
        });
      }

      res.json({
        success: true,
        message: 'OTP has been sent to your mobile. Please check your phone.',
        data: {
          expiresIn: '5 minutes'
        }
      });
    } catch (error) {
      console.error('Send OTP for registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error sending OTP',
        error: error.message
      });
    }
  }

  // Register a new user - ONLY called after OTP verification
  // This method checks for duplicates and creates the final user record
  async register(req, res) {
    try {
      const { name, aadhaarNumber, mobile, email, password, address, coordinates } = req.body;

      // Mobile number is required
      if (!mobile) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required for registration'
        });
      }

      // Find the temporary user created during OTP verification
      const tempUser = await User.findOne({ mobile, isActive: false, isVerified: true });
      if (!tempUser) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number not verified. Please verify your mobile number with OTP first.'
        });
      }

      // NOW check for duplicates - only at registration time, not during OTP
      // Check if mobile is already registered (shouldn't happen, but double-check)
      const existingActiveUser = await User.findOne({ mobile, isActive: true });
      if (existingActiveUser && existingActiveUser._id.toString() !== tempUser._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'This mobile number is already registered. Please login instead.'
        });
      }

      // Check for Aadhaar conflicts with other accounts
      if (aadhaarNumber) {
        const existingAadhaarUser = await User.findOne({
          aadhaarNumber,
          _id: { $ne: tempUser._id },
          isActive: true
        });
        if (existingAadhaarUser) {
          return res.status(400).json({
            success: false,
            message: 'Aadhaar number is already registered with another account.'
          });
        }
      }

      // Use tempUser as the base (it was verified above)
      let user = tempUser;
      
      // Check if user already exists with different identifiers (excluding tempUser)
      const existingUser = await User.findOne({
        $or: [
          ...(aadhaarNumber ? [{ aadhaarNumber }] : []),
          ...(email ? [{ email }] : [])
        ],
        _id: { $ne: tempUser._id }
      });

      // Prevent Aadhaar conflicts with other accounts
      if (aadhaarNumber && existingUser && existingUser.aadhaarNumber === aadhaarNumber) {
        if (existingUser.isActive && existingUser.password) {
          return res.status(400).json({
            success: false,
            message: 'Aadhaar number is already registered. Please login instead.'
          });
        }
      }
      
      // Update tempUser with final registration data
      if (user) {
        // This is completing registration for the temporary user
        user.name = name || user.name;
        if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;
        if (email) user.email = email;
        if (password) user.password = password;
        user.isActive = true;
        user.isVerified = true;
        
        // Update address
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
            const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
            return res.status(400).json({
              success: false,
              message: `User already exists with this ${dupField}`
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
      }
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

  // Send OTP for Registration - NO user existence check
  // This method sends OTP without checking if user exists
  // It only prevents sending OTP if mobile is already registered (active user)
  async sendOtpForRegistration(req, res) {
    try {
      const { mobile } = req.body;
      
      console.log('Send OTP for Registration - mobile:', mobile);

      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit mobile number is required'
        });
      }

      // ONLY check if mobile is already registered (active user)
      // Do NOT check if user exists - we'll create temporary record for OTP
      const existingActiveUser = await User.findOne({ mobile, isActive: true });
      if (existingActiveUser) {
        console.log('Mobile already registered:', mobile);
        return res.status(400).json({
          success: false,
          message: 'This mobile number is already registered. Please login instead.'
        });
      }

      // Find or create temporary inactive user for OTP storage
      // This allows OTP to be sent even if user doesn't exist yet
      let tempUser = await User.findOne({ mobile, isActive: false });
      
      if (!tempUser) {
        // Create temporary user record ONLY for OTP storage
        // This user will be activated during registration
        // Note: name is required by schema, so we use a placeholder that will be updated during registration
        tempUser = new User({
          mobile,
          name: 'Pending Registration', // Placeholder name, will be updated during registration
          role: 'citizen',
          isActive: false, // Not active until registration completes
          isVerified: false
        });
        console.log('✅ Created temporary user record for OTP storage');
      } else {
        console.log('✅ Using existing temporary user for OTP');
      }

      // Generate and store OTP
      const otp = tempUser.generateOTP();
      console.log('Generated OTP for registration:', otp);
      await tempUser.save();

      // Send OTP via SMS
      console.log(`Sending OTP to ${mobile} for registration`);
      const smsResult = await smsService.sendOTP(mobile, otp, 'User');
      
      console.log('SMS result:', { success: smsResult.success, devMode: smsResult.devMode });

      // NEVER return OTP in response - it should only be sent via SMS
      // In dev mode, OTP is logged to server console only
      if (smsResult.devMode) {
        console.log(`[DEV MODE] OTP for ${mobile}: ${otp} - Check server logs`);
        console.log('[IMPORTANT] SMS service is not configured. OTP is only in server logs.');
        console.log('[SETUP] To send real SMS, configure SMS_PROVIDER and credentials. See SMS_SETUP.md');
        // Still return success in dev mode so user can test the flow
        return res.json({
          success: true,
          message: `OTP has been sent to ${mobile}. Please check your phone.`,
          data: {
            expiresIn: '5 minutes',
            mobile: mobile,
            note: 'SMS service not configured - check server logs for OTP in dev mode'
          }
        });
      }

      // If SMS failed (and not dev mode), return error
      if (!smsResult.success) {
        console.error('SMS sending failed:', smsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again or contact support.',
          error: smsResult.error || 'SMS service unavailable'
        });
      }
      
      return res.json({
        success: true,
        message: `OTP has been sent to ${mobile}. Please check your phone.`,
        data: {
          expiresIn: '5 minutes',
          mobile: mobile
        }
      });
    } catch (error) {
      console.error('Send OTP for Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error sending OTP',
        error: error.message
      });
    }
  }

  // Verify OTP for Registration - works with temporary inactive users
  async verifyOtpForRegistration(req, res) {
    try {
      const { mobile, otp } = req.body;
      
      console.log('Verify OTP for Registration - mobile:', mobile);

      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Valid 10-digit mobile number is required'
        });
      }

      if (!otp || otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Valid 6-digit OTP is required'
        });
      }

      // Find temporary user (inactive) created during OTP sending
      const tempUser = await User.findOne({ mobile, isActive: false });
      
      if (!tempUser) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found for this mobile number. Please request a new OTP.'
        });
      }

      // Verify OTP
      const isOTPValid = tempUser.verifyOTP(otp);
      console.log('OTP verification result:', isOTPValid);
      
      if (!isOTPValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP. Please request a new OTP.'
        });
      }

      // Mark mobile as verified (but user is still inactive)
      tempUser.isVerified = true;
      tempUser.otp = undefined; // Clear OTP after verification
      await tempUser.save();
      
      console.log('✅ Mobile verified for registration - tempUser ID:', tempUser._id);

      return res.json({
        success: true,
        message: 'Mobile number verified successfully. You can now complete registration.',
        data: {
          mobile: mobile,
          verified: true
        }
      });
    } catch (error) {
      console.error('Verify OTP for Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying OTP',
        error: error.message
      });
    }
  }

  // Send OTP (for login/other flows - user must exist)
  async sendOTP(req, res) {
    try {
      const { aadhaarNumber, mobile, email } = req.body;
      
      console.log('Send OTP request (login/other):', { aadhaarNumber, mobile, email });

      if (!aadhaarNumber && !mobile && !email) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar number, mobile number or email is required'
        });
      }

      // For login/other flows - user MUST exist
      let user;
      
      if (aadhaarNumber) {
        user = await User.findOne({ aadhaarNumber });
      } else if (mobile) {
        user = await User.findOne({ mobile });
      } else {
        user = await User.findOne({ email });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register before proceeding.'
        });
      }

      console.log('Existing user found with ID:', user._id);

      // Generate OTP
      const otp = user.generateOTP();
      console.log('Generated OTP for user:', user._id, 'OTP:', otp);
      await user.save();

      // Send OTP via email or SMS
      if (email) {
        const emailResult = await emailService.sendOTP(email, otp, user.name);
        if (!emailResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to send OTP email',
            error: emailResult.error
          });
        }
      }

      // Send OTP via SMS for mobile
      if (mobile || aadhaarNumber) {
        const phoneNumber = mobile || aadhaarNumber;
        const userName = user.name || 'User';
        
        console.log(`Sending OTP to ${phoneNumber} for user: ${userName}`);
        const smsResult = await smsService.sendOTP(phoneNumber, otp, userName);
        
        console.log('SMS result:', { success: smsResult.success, devMode: smsResult.devMode });
        
        // NEVER return OTP in response - only send via SMS
        if (smsResult.devMode) {
          console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp} - Check server logs only`);
        }

        if (!smsResult.success && !smsResult.devMode) {
          console.error('SMS sending failed:', smsResult.error);
          return res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again or contact support.',
            error: 'SMS service unavailable'
          });
        }
        
        return res.json({
          success: true,
          message: `OTP has been sent to ${phoneNumber}. Please check your phone.`,
          data: {
            expiresIn: '5 minutes',
            mobile: phoneNumber
          }
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          expiresIn: '5 minutes'
        }
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error sending OTP',
        error: error.message
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { aadhaarNumber, mobile, email, otp } = req.body;
      
      console.log('Verify OTP request:', { aadhaarNumber, mobile, email, otp: otp, otpType: typeof otp });

      if (!aadhaarNumber && !mobile && !email) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar number, mobile number or email is required'
        });
      }

      let user;
      
      if (aadhaarNumber) {
        user = await User.findOne({ aadhaarNumber });
        console.log('User found by aadhaarNumber:', user ? 'Yes' : 'No');
      } else if (mobile) {
        user = await User.findOne({ mobile });
        console.log('User found by mobile:', user ? 'Yes' : 'No');
      } else {
        user = await User.findOne({ email });
        console.log('User found by email:', user ? 'Yes' : 'No');
      }

      if (!user) {
        console.log('User not found for:', mobile || email);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('User OTP data:', { 
        hasOtp: !!user.otp, 
        otpCode: user.otp?.code ? '***' : 'undefined',
        otpExpires: user.otp?.expiresAt 
      });

      // Verify OTP
      const isOTPValid = user.verifyOTP(otp);
      console.log('OTP verification result:', isOTPValid);
      
      if (!isOTPValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Clear OTP
      user.otp = undefined;
      
      // Mark mobile as verified
      // For registration flow (inactive user), set isVerified = true so registration can proceed
      // For login flow (active user), also set isVerified = true
      user.isVerified = true;
      await user.save();
      
      console.log('Mobile number verified for user:', user._id, 'isActive:', user.isActive);

      // Generate tokens
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          user: user.getProfile(),
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error verifying OTP',
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
