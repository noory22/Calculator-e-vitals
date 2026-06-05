import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      practice,
      phone,
      email,
      patients,
      enrollmentRate,
      enrolled,
      standard,
      annualRevenue,
      setupRevenue,
      yearOneTotal,
    } = body;

    // Check configuration
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Check if configuration is missing or holds placeholder values
    if (
      !clientEmail ||
      !privateKey ||
      !spreadsheetId ||
      clientEmail.includes("your-project") ||
      spreadsheetId.includes("your_sheet_id")
    ) {
      console.warn("Google Sheets Integration: Configuration variables are not set or are using placeholders.");
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets API environment variables are not configured.",
        },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            new Date().toLocaleString("en-US"),
            name || "",
            practice || "",
            phone || "",
            email || "",
            patients || 0,
            enrollmentRate || "",
            enrolled || 0,
            standard || "",
            annualRevenue || "",
            setupRevenue || "",
            yearOneTotal || "",
          ],
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Sheets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to append lead to Google Sheet." },
      { status: 500 }
    );
  }
}
