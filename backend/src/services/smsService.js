// SMS Service for sending OTP via SMS gateway
// Supports multiple SMS providers: Twilio, AWS SNS, MSG91, etc.

class SmsService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'twilio'; // twilio, aws-sns, msg91, etc.
    this.isConfigured = false;
    
    // Initialize based on provider
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider.toLowerCase()) {
      case 'twilio':
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
          try {
            const twilio = require('twilio');
            this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
            this.isConfigured = true;
            console.log('SMS Service: Twilio configured');
          } catch (error) {
            console.warn('SMS Service: Twilio module not installed. Run: npm install twilio');
          }
        }
        break;
        
      case 'aws-sns':
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
          try {
            const AWS = require('aws-sdk');
            this.client = new AWS.SNS({
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION
            });
            this.isConfigured = true;
            console.log('SMS Service: AWS SNS configured');
          } catch (error) {
            console.warn('SMS Service: AWS SDK not installed. Run: npm install aws-sdk');
          }
        }
        break;
        
      case 'msg91':
        if (process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID) {
          this.authKey = process.env.MSG91_AUTH_KEY;
          this.senderId = process.env.MSG91_SENDER_ID;
          this.isConfigured = true;
          console.log('SMS Service: MSG91 configured');
        }
        break;
        
      default:
        console.warn(`SMS Service: Unknown provider "${this.provider}"`);
    }
    
    if (!this.isConfigured) {
      console.warn('SMS Service: Not configured. OTP will be returned in response (development mode)');
    }
  }

  // Send OTP via SMS
  async sendOTP(mobile, otp, name = 'User') {
    // Validate mobile number
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return { success: false, error: 'Invalid mobile number' };
    }

    const message = `Your CivicConnect OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;

    // In development or if SMS not configured, return OTP in response
    if (process.env.NODE_ENV === 'development' || !this.isConfigured) {
      console.log(`[DEV MODE] OTP for ${mobile}: ${otp}`);
      return { 
        success: true, 
        devMode: true,
        message: 'OTP sent (dev mode - check console/logs)',
        otp: otp // Return OTP in dev mode
      };
    }

    try {
      switch (this.provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(mobile, message);
          
        case 'aws-sns':
          return await this.sendViaAWSSNS(mobile, message);
          
        case 'msg91':
          return await this.sendViaMSG91(mobile, message);
          
        default:
          return { success: false, error: 'SMS provider not supported' };
      }
    } catch (error) {
      console.error('SMS Service Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send via Twilio
  async sendViaTwilio(mobile, message) {
    try {
      // Format mobile number (add country code if needed)
      let toNumber = mobile;
      if (!toNumber.startsWith('+')) {
        // Add country code (default: +91 for India)
        const countryCode = process.env.SMS_COUNTRY_CODE || '91';
        toNumber = `+${countryCode}${mobile}`;
      }

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: toNumber
      });

      console.log('SMS sent via Twilio:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('Twilio SMS Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send via AWS SNS
  async sendViaAWSSNS(mobile, message) {
    try {
      // Format mobile number
      let phoneNumber = mobile;
      if (!phoneNumber.startsWith('+')) {
        const countryCode = process.env.SMS_COUNTRY_CODE || '91';
        phoneNumber = `+${countryCode}${mobile}`;
      }

      const params = {
        Message: message,
        PhoneNumber: phoneNumber
      };

      const result = await this.client.publish(params).promise();
      console.log('SMS sent via AWS SNS:', result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('AWS SNS SMS Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send via MSG91
  async sendViaMSG91(mobile, message) {
    try {
      const https = require('https');
      const querystring = require('querystring');

      const postData = querystring.stringify({
        authkey: this.authKey,
        mobiles: mobile,
        message: message,
        sender: this.senderId,
        route: '4', // Transactional route
        country: '91' // India
      });

      const options = {
        hostname: 'api.msg91.com',
        port: 443,
        path: '/api/sendhttp.php',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log('SMS sent via MSG91:', data);
              resolve({ success: true, messageId: data });
            } else {
              reject(new Error(`MSG91 API error: ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      console.error('MSG91 SMS Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Test SMS configuration
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      // Test with a dummy number (won't actually send)
      const testResult = await this.sendOTP('9999999999', '123456', 'Test');
      return { success: testResult.success, provider: this.provider };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SmsService();

