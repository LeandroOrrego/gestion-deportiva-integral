"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AuthProvider>
                {/* Sidebar (Desktop) */}
                <Sidebar />

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* TopBar (Mobile) */}
                    <TopBar />

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 mb-16 md:mb-0">
                        {children}
                    </main>

                    {/* MobileNav (Mobile) */}
                    <MobileNav />
                    <Toaster />
                </div>
            </AuthProvider>
        </div>
    );
}
