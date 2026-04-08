"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
    LayoutDashboard,
    ArrowLeftRight,
    Users,
    Calendar,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    Trophy,
    LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { profile, signOut } = useAuth();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-sky-500",
        },
        {
            label: "Transacciones",
            icon: ArrowLeftRight,
            href: "/transacciones",
            color: "text-violet-500",
        },
        {
            label: "Atletas",
            icon: Users,
            href: "/atletas",
            color: "text-pink-700",
        },
        {
            label: "Eventos",
            icon: Calendar,
            href: "/eventos",
            color: "text-orange-700",
        },
        {
            label: "Reportes",
            icon: BarChart3,
            href: "/reportes",
            color: "text-emerald-500",
        },
        {
            label: "Configuración",
            icon: Settings,
            href: "/configuracion",
            color: "text-gray-500",
        },
    ];

    return (
        <div
            className={cn(
                "relative hidden h-full flex-col bg-card border-r md:flex transition-all duration-300",
                collapsed ? "w-[64px]" : "w-[240px]",
                className
            )}
        >
            {/* Header */}
            <div className="flex h-16 items-center px-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-primary-foreground">
                        <Trophy className="h-5 w-5" />
                    </div>
                    {!collapsed && (
                        <h1 className="text-lg font-bold font-display tracking-tight text-brand-primary whitespace-nowrap overflow-hidden">
                            ClubManager PY
                        </h1>
                    )}
                </Link>
            </div>

            {/* Collapse Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md hidden md:flex"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronLeft className="h-3 w-3" />
                )}
            </Button>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "group flex h-10 w-full items-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                                pathname === route.href
                                    ? "bg-brand-primary/10 text-brand-primary border-l-4 border-brand-primary"
                                    : "text-muted-foreground",
                                collapsed ? "justify-center px-0" : "justify-start"
                            )}
                            title={collapsed ? route.label : undefined}
                        >
                            <route.icon
                                className={cn(
                                    "h-5 w-5",
                                    pathname === route.href ? "text-brand-primary" : "text-muted-foreground",
                                    !collapsed && "mr-3"
                                )}
                            />
                            {!collapsed && <span>{route.label}</span>}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Footer */}
            <div className="border-t p-3 space-y-2">
                <div className={cn("hidden md:flex flex-col gap-2", collapsed ? "items-center" : "items-start")}>
                    {/* Logout Button */}
                    <Button
                        variant="ghost"
                        size={collapsed ? "icon" : "sm"}
                        onClick={() => signOut()}
                        className={cn("w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50", collapsed && "justify-center")}
                        title="Cerrar sesión"
                    >
                        <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                        {!collapsed && "Cerrar sesión"}
                    </Button>
                </div>

                <div className={cn("flex items-center gap-3 pt-2 border-t", collapsed ? "justify-center" : "justify-between")}>
                    {!collapsed ? (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted bg-gradient-to-br from-brand-primary to-brand-secondary text-white">
                                <span className="text-xs font-medium">
                                    {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : 'U'}
                                </span>
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-sm font-medium truncate">
                                    {profile?.nombre_completo || 'Usuario'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate uppercase">
                                    {profile?.rol || 'Invitado'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted bg-gradient-to-br from-brand-primary to-brand-secondary text-white"
                            title={profile?.nombre_completo || 'Usuario'}
                        >
                            <span className="text-xs font-medium">
                                {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : 'U'}
                            </span>
                        </div>
                    )}

                    {!collapsed && <ThemeToggle />}
                </div>
            </div>
        </div>
    );
}
