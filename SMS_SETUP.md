# SMS Service Setup Guide

The SMS service is currently in **development mode** because no SMS provider is configured. To send real OTPs via SMS, you need to configure one of the supported providers.

## Supported SMS Providers

1. **Twilio** (Recommended for most users)
2. **AWS SNS** (For AWS users)
3. **MSG91** (Popular in India)

## Quick Setup: Twilio (Recommended)

### Step 1: Install Twilio Package
```bash
cd backend
npm install twilio
```

### Step 2: Get Twilio Credentials
1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Get your credentials from the Twilio Console:
   - Account SID
   - Auth Token
   - Phone Number (from Twilio)

### Step 3: Set Environment Variables
Add these to your `.env` file or Render environment variables:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SMS_COUNTRY_CODE=91
```

### Step 4: Deploy
After setting environment variables, redeploy your backend.

## Alternative: AWS SNS Setup

### Step 1: Install AWS SDK
```bash
cd backend
npm install aws-sdk
```

### Step 2: Get AWS Credentials
1. Create an IAM user in AWS Console
2. Attach `AmazonSNSFullAccess` policy
3. Create access keys

### Step 3: Set Environment Variables
```env
SMS_PROVIDER=aws-sns
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
SMS_COUNTRY_CODE=91
```

## Alternative: MSG91 Setup (India)

### Step 1: Get MSG91 Credentials
1. Sign up at [MSG91](https://msg91.com/)
2. Get your Auth Key and Sender ID

### Step 2: Set Environment Variables
```env
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_auth_key
MSG91_SENDER_ID=your_sender_id
SMS_COUNTRY_CODE=91
```

## Setting Environment Variables on Render

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add the variables listed above
5. Save and redeploy

## Verify SMS Configuration

After configuration, check your server logs. You should see:
- `SMS Service: Twilio configured` (or your chosen provider)
- If you see `SMS Service: Not configured`, check your environment variables

## Testing

After setup, test the registration flow:
1. Enter a mobile number
2. Click "Send OTP"
3. You should receive an SMS on your phone
4. Check server logs if SMS doesn't arrive

## Troubleshooting

### SMS not sending?
1. Check server logs for errors
2. Verify environment variables are set correctly
3. Check your SMS provider dashboard for delivery status
4. Ensure your phone number format is correct (10 digits for India)

### Still in dev mode?
- Make sure `SMS_PROVIDER` is set
- Verify all required credentials are provided
- Check that the SMS package is installed (`npm install twilio` or `npm install aws-sdk`)

## Cost Considerations

- **Twilio**: Pay-as-you-go, ~$0.0075 per SMS
- **AWS SNS**: Pay-as-you-go, ~$0.00645 per SMS
- **MSG91**: Various plans available

Choose based on your volume and location.

