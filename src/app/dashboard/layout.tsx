"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader />
        {children}
      </div>
    </AuthGuard>
  );
}
