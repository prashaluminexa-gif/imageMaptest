// netlify/functions/send-email.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const {
    email, name, bookingNumber, plotName, blockName,
    advanceAmount, dealClosedAmount, note = 'N/A', documentLink 
  } = data;
  const msg = {
    to: email,
    from: { email: 'booking@hasirufarms.com', name: 'Hasiru Farms Enterprises' },
    replyTo: 'booking@hasirufarms.com',
    cc: [
    { email: 'deepthik@hasirufarms.com', name: 'Deepthi K' },
    { email: 'yeshwanth@hasirufarms.com', name: 'Yeshwanth' },
    { email: 'msakshar@hasirufarms.com', name: 'MS Akshar' }
  ],
    subject: `Plot Reservation Confirmed – ${bookingNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <img src="https://cdn.glitch.global/62dd5357-cabd-4363-bf7a-61c739629aa4/Untitled%20design%20(18).png?v=1745953614525" alt="Hasiru Farms Logo" style="max-width: 200px; display: block; margin: 0 auto 20px;" />
        <h2 style="color: #024837; text-align: center;">Plot Reservation Confirmed Successfully</h2>
         <p>Dear ${name},</p>
          <p><strong>Thank you for choosing Hasiru Farms.</strong></p>
          <p>We’re pleased to let you know that your <strong>plot reservation has been successfully confirmed.</strong> Please find your booking details mentioned below for your reference.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f7e9;"><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Booking Number</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">${bookingNumber}</td></tr>
          <tr><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Project</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">${blockName}</td></tr>
          <tr style="background:#f5f7e9;"><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Plot Number</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">${plotName}</td></tr>
          <tr><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Advance Paid</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">₹${advanceAmount}</td></tr>
          <tr style="background:#f5f7e9;"><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Deal Closed Amount</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">₹${dealClosedAmount}</td></tr>
          <tr><td style="padding:10px; border:1px solid #e0e0e0;"><strong>Note</strong></td><td style="padding:10px; border:1px solid #e0e0e0;">${note}</td></tr>
          <tr style="background:#f5f7e9;">
            <td style="padding:10px; border:1px solid #e0e0e0;"><strong>Legal Document</strong></td>
            <td style="padding:10px; border:1px solid #e0e0e0;">
              <a href="${documentLink}" target="_blank" style="color:#2a7ae2;">View Document</a>
            </td>
          </tr>
        </table>
        <p>Kindly note that your plot reservation has been confirmed. Please complete the booking formalities within 7 working days to secure your reservation.</p>
          <p>Our team will contact you shortly for the remaining formalities. For any queries, please reach out to us at <a href="mailto:booking@hasirufarms.com">booking@hasirufarms.com</a></p>
          <p>Thank you once again for placing your trust in <strong>Hasiru Farms.</strong> We look forward to welcoming you to our community.</p>
          <p style="text-align: center; color: #024837; font-weight: bold;">Thank you for choosing Hasiru Farms!</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">
            Hasiru Farms Enterprise Pvt. Ltd.<br />
            2nd FLOOR, Maruthi Complex, 1139, BEML Layout, Rajarajeshwari Nagar, Bengaluru, Karnataka 560098<br />
            <a href="http://www.hasirufarms.com">www.hasirufarms.com</a>
          </p>
      </div>
    `
  };
  try {
    await sgMail.send(msg);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('SENDGRID ERROR:', error.message);
    if (error.response) console.error('BODY:', error.response.body);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'SendGrid failed', details: error.message })
    };
  }
};


