const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Set your SendGrid API key
const otpStore = new Map(); // Email OTP storage
const otpStoreSms = new Map(); // SMS OTP storage

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Helper to store OTPs
const storeOtp = (store, key, otp) => {
  store.set(key, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // Expires in 5 minutes
};

// Helper to validate OTP
const validateOtp = (store, key, providedOtp) => {
  const storedData = store.get(key);
  if (!storedData) return { success: false, error: 'OTP not found' };
  if (storedData.expiresAt < Date.now()) {
    store.delete(key);
    return { success: false, error: 'OTP expired' };
  }
  if (storedData.otp.toString() !== providedOtp.toString()) {
    return { success: false, error: 'Invalid OTP' };
  }
  store.delete(key);
  return { success: true };
};

// Endpoint to send OTP
const mailotp = async (req, res) => {
  try {
    const { email, telephone } = req.body;

    if (!email || !telephone) {
      return res.status(400).json({ error: 'Email and telephone are required' });
    }

    // Generate OTPs
    const emailOtp = generateOtp();
    const smsOtp = generateOtp();

    // --- Send Email OTP using SendGrid Dynamic Template ---
    const emailMsg = {
      to: email,
      from: 'robertpattinson69996@gmail.com', // Use your verified sender
      templateId: process.env.SENDGRID_TEMPLATE_ID, // <-- Set this in your .env!
      dynamic_template_data: {
        otp: emailOtp,
        username: email.split('@')[0] // Or use actual username if available
      },
    };

    await sgMail.send(emailMsg);
    storeOtp(otpStore, email, emailOtp);
    console.log(`Email OTP sent to ${email}: ${emailOtp}`);

    // --- Send SMS OTP ---
    const smsMessage = `Your OTP is: ${smsOtp}`;
    await client.messages.create({
      body: smsMessage,
      from: twilioPhoneNumber,
      to: telephone,
    });
    storeOtp(otpStoreSms, telephone, smsOtp);
    console.log(`SMS OTP sent to ${telephone}: ${smsOtp}`);

    res.status(200).json({ message: 'OTP sent successfully to email and SMS' });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    res.status(500).json({ error: 'Failed to send OTP', details: error.message });
  }
};

// Endpoint to verify OTP
const verifyOtp = (req, res) => {
  try {
    const { email, otpmail, telephone, otpsms } = req.body;

    if (!email || !otpmail || !telephone || !otpsms) {
      return res.status(400).json({ error: 'Email, telephone, and OTPs are required' });
    }

    // Validate SMS OTP
    const smsValidation = validateOtp(otpStoreSms, telephone, otpsms);
    if (!smsValidation.success) {
      return res.status(400).json({ error: smsValidation.error, message: "Invalid OTP" });
    }

    // Validate Email OTP
    const emailValidation = validateOtp(otpStore, email, otpmail);
    if (!emailValidation.success) {
      return res.status(400).json({ error: emailValidation.error, message: "Invalid OTP" });
    }

    console.log(`OTP verified for email: ${email} and telephone: ${telephone}`);
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
};

module.exports = { mailotp, verifyOtp };
