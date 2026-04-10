import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Bearing",
  description: "Human Capability Intelligence",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
