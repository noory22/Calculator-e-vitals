import { Playfair_Display, Mulish } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "e-Vitals RPM Revenue Estimator | Remote Patient Monitoring",
  description: "Calculate your practice's potential RPM revenue. Estimate Medicare reimbursement for remote patient monitoring services.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${mulish.variable}`}>
      <body>{children}</body>
    </html>
  );
}
