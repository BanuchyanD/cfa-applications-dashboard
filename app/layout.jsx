import "./globals.css";

export const metadata = {
  title: "CFA Applications Dashboard",
  description: "Cinema Foundation of Armenia internal applications dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hy">
      <body>{children}</body>
    </html>
  );
}
