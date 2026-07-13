import type { Metadata } from "next";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "gastar",
  description: "Personal expense tracker",
};

// Runs before first paint: applies an explicitly stored light/dark theme so
// there is no flash of the wrong theme. "system"/absent falls through to the
// CSS prefers-color-scheme default.
const NO_FOUC_SCRIPT = `(function(){try{var p=localStorage.getItem('gastar.theme');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
