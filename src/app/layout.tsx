import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { PendingChangesProvider } from "@/hooks/usePendingChanges";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "PavPav - Music Streaming",
  description: "Your favorite music streaming platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PendingChangesProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </PendingChangesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}