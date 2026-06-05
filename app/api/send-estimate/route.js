import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function formatCurrency(val) {
  return "$" + Math.round(val).toLocaleString("en-US");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      practice,
      phone,
      patients,
      rate,
      billingScenario,
      monthlyRevenue,
      enrolled,
      annualRevenue,
      setupRevenue,
      yearOneTotal,
    } = body;

    // Server-side validation
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required fields." },
        { status: 400 }
      );
    }

    // Determine configuration and whether to run in Ethereal Demo mode
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL || "no-reply@e-vitals.com";

    const isDemo =
      !smtpHost ||
      smtpHost === "smtp.example.com" ||
      !smtpUser ||
      smtpUser === "your_username";

    let transporter;
    let testAccountInfo = null;

    if (isDemo) {
      console.log("No custom SMTP configured. Bootstrapping Ethereal test mailer account...");
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        testAccountInfo = testAccount;
      } catch (err) {
        console.error("Failed to create Ethereal test account:", err);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to configure test mailer account. Please set up SMTP credentials.",
          },
          { status: 500 }
        );
      }
    } else {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    // Build the email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #F6F1E8; padding: 30px; color: #221C30; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #E4DCCD;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1F1B40; font-size: 24px; margin-bottom: 5px; font-family: Georgia, serif;">e-Vitals RPM</h2>
          <span style="color: #BE1E2D; font-weight: 800; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Revenue Estimate Breakdown</span>
        </div>
        
        <div style="background-color: #FFFFFF; border-radius: 10px; padding: 25px; border: 1px solid #E4DCCD; margin-bottom: 20px;">
          <p style="margin-top: 0; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #736C82; line-height: 1.5;">
            Thank you for using the e-Vitals RPM Revenue Estimator. Below is the detailed breakdown of the recurring Medicare reimbursement your practice, <strong>${practice || "your practice"}</strong>, could generate by enrolling chronic-care patients in remote monitoring.
          </p>
        </div>

        <div style="background-color: #1F1B40; color: #FFFFFF; border-radius: 10px; padding: 25px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #C99A3F; margin-bottom: 5px;">Estimated Monthly Recurring Revenue</div>
          <div style="font-size: 38px; font-weight: bold; color: #FFFFFF; margin-bottom: 5px; font-family: Georgia, serif;">${formatCurrency(monthlyRevenue)}</div>
          <div style="font-size: 13px; color: #C9C2D6;">Based on ${enrolled} enrolled patients</div>
        </div>

        <div style="background-color: #FFFFFF; border-radius: 10px; padding: 25px; border: 1px solid #E4DCCD;">
          <h3 style="color: #1F1B40; border-bottom: 1px solid #E4DCCD; padding-bottom: 8px; margin-top: 0; font-size: 16px; font-family: Georgia, serif;">Detailed Calculations</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-top: 10px;">
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">Eligible Chronic-Care Patients</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${patients}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">Expected Enrollment Rate</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${rate}%</td>
            </tr>
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">Patients Enrolled</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${enrolled}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">Billing Scenario / Rate</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${billingScenario}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">Annual Recurring Revenue</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${formatCurrency(annualRevenue)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F6F1E8;">
              <td style="padding: 10px 0; color: #736C82;">One-Time Setup Revenue (99453)</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #221C30;">${formatCurrency(setupRevenue)}</td>
            </tr>
            <tr style="border-top: 2px solid #1F1B40;">
              <td style="padding: 15px 0 0 0; color: #1F1B40; font-weight: bold; font-size: 16px;">Year-One Total Revenue</td>
              <td style="padding: 15px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #BE1E2D;">${formatCurrency(yearOneTotal)}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 25px; margin-bottom: 5px;">
          <a href="https://calendly.com/evitalsrpm/30min" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #BE1E2D; color: #FFFFFF; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; box-shadow: 0 4px 10px rgba(190,30,45,0.2);">
            📅 Book an Appointment
          </a>
        </div>

        <div style="text-align: center; margin-top: 25px; font-size: 11px; color: #736C82; line-height: 1.5;">
          This estimate uses 2026 Medicare national-average non-facility reimbursement rates and is for illustration only.
          <br/>
          &copy; 2026 e-Vitals Remote Patient Monitoring. All rights reserved.
        </div>
      </div>
    `;

    // Configure the sender address
    const fromSender = isDemo ? `"e-Vitals Demo" <${testAccountInfo.user}>` : `"e-Vitals" <${fromEmail}>`;

    const mailOptions = {
      from: fromSender,
      to: email,
      subject: `Your e-Vitals RPM Estimate: ${formatCurrency(monthlyRevenue)}/mo`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    if (isDemo) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("Demo Email Sent Successfully!");
      console.log(`Preview URL: ${previewUrl}`);
      console.log("-----------------------------------------");
      return NextResponse.json({
        success: true,
        message: "Email sent successfully in demo mode.",
        previewUrl: previewUrl,
        isDemo: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully.",
      isDemo: false,
    });
  } catch (error) {
    console.error("Error processing email dispatch API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during email dispatch." },
      { status: 500 }
    );
  }
}
