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

    // Automatically check and apply formatting (banding & row height) to the Google Sheet
    try {
      const spreadsheetInfo = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === "Sheet1") || spreadsheetInfo.data.sheets[0];
      const sheetId = sheet.properties.sheetId;
      const rowCount = sheet.properties.gridProperties?.rowCount || 1000;

      const requests = [
        {
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: 1, // Row 2 (0-indexed)
              endIndex: rowCount,
            },
            properties: {
              pixelSize: 30, // Increase row height to 30px for better visibility
            },
            fields: "pixelSize",
          },
        },
      ];

      const hasBanding = sheet.bandedRanges && sheet.bandedRanges.length > 0;

      if (!hasBanding) {
        requests.push({
          addBanding: {
            bandedRange: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1, // Row 2 (0-indexed, below header)
                startColumnIndex: 0,
                endColumnIndex: 12, // Columns A to L
              },
              rowProperties: {
                firstBandColor: {
                  red: 1.0,
                  green: 1.0,
                  blue: 1.0,
                },
                secondBandColor: {
                  red: 0.2588,
                  green: 0.5686,
                  blue: 0.8471,
                },
              },
            },
          },
        });
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests,
        },
      });
    } catch (formattingError) {
      console.warn("Could not apply formatting (banding/height) to Google Sheet:", formattingError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Sheets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to append lead to Google Sheet." },
      { status: 500 }
    );
  }
}
