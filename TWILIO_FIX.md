# Fix: Twilio Phone Number Error

## Error Message
```
'From' +919573112302 is not a Twilio phone number or Short Code country mismatch
```

## Problem
You're using your **personal phone number** (`+919573112302`) as the `TWILIO_PHONE_NUMBER`, but Twilio requires a **Twilio-provided phone number**.

## Solution: Get a Twilio Phone Number

### Step 1: Get a Twilio Phone Number
1. Go to [Twilio Console](https://console.twilio.com)
2. Click **Phone Numbers** → **Manage** → **Buy a number**
3. Or use the **free trial number** if available
4. Select a number (you can search by country/region)
5. For India, search for numbers with country code +91
6. Click **Buy** (free trial accounts get a free number)

### Step 2: Update Environment Variable
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to **Environment** tab
4. Find `TWILIO_PHONE_NUMBER`
5. Change it from your personal number to the **Twilio phone number**
   - **Wrong**: `+919573112302` (your personal number)
   - **Correct**: `+1234567890` (Twilio number from step 1)
6. Click **Save Changes**

### Step 3: Redeploy
1. After saving, Render will ask to redeploy
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait 2-3 minutes

### Step 4: Test
1. Try registration again
2. You should receive SMS from the Twilio number
3. The SMS will come FROM the Twilio number TO your personal number

## Understanding the Numbers

- **TWILIO_PHONE_NUMBER** (FROM): The Twilio number that sends SMS
  - Must be purchased/get from Twilio
  - This is what users see as the sender
  
- **User's Phone Number** (TO): Where OTP is received
  - User's personal number
  - Entered during registration
  - Receives the OTP SMS

## Example

If your Twilio number is `+15551234567`:
- Set `TWILIO_PHONE_NUMBER=+15551234567`
- When user enters `9876543210` during registration
- They receive SMS: "From +15551234567: Your OTP is 123456"

## Free Trial Note

- Twilio free trial can only send SMS to **verified numbers**
- Verify your number in Twilio Console → Phone Numbers → Verified Caller IDs
- Or upgrade to paid account for unlimited sending

