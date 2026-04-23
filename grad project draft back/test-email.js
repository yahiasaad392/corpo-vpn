const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function test() {
  console.log('--- Testing Email with App Password ---');
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test from VPN Backend",
      text: "If you see this, the App Password works!"
    });
    console.log('✅ SUCCESS: Email sent successfully!');
  } catch (err) {
    console.error('❌ FAILURE:', err.message);
  }
}

test();
