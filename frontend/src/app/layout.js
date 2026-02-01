import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Grievance Intelligence System",
  description: "AI-powered complaint management and routing system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-gray-950 text-white`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
