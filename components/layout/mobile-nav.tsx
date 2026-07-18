"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ArrowLeftRight,
    Users,
    Calendar,
    MoreHorizontal,
    Plus,
    BarChart3,
    Settings,
    Receipt,
    Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
        },
        {
            label: "Transacciones",
            icon: ArrowLeftRight,
            href: "/transacciones",
        },
        {
            label: "Atletas",
            icon: Users,
            href: "/atletas",
        },
        {
            label: "Eventos",
            icon: Calendar,
            href: "/eventos",
        },
    ];

    const moreRoutes = [
        {
            label: "Cuentas a Pagar",
            icon: Receipt,
            href: "/cuentas-a-pagar",
        },
        {
            label: "Deudas y Compromisos",
            icon: Landmark,
            href: "/reportes/deudas-y-compromisos",
        },
        {
            label: "Reportes",
            icon: BarChart3,
            href: "/reportes",
        },
        {
            label: "Configuración",
            icon: Settings,
            href: "/configuracion",
        },
    ];

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card md:hidden">
                {routes.map((route) => (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                            pathname === route.href
                                ? "text-brand-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <route.icon className="h-5 w-5" />
                        <span>{route.label}</span>
                    </Link>
                ))}

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            suppressHydrationWarning
                            className={cn(
                                "flex h-auto flex-col items-center justify-center gap-1 rounded-none p-0 text-xs font-medium hover:bg-transparent",
                                open
                                    ? "text-brand-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MoreHorizontal className="h-5 w-5" />
                            <span>Más</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[40vh]">
                        <SheetHeader>
                            <SheetTitle>Menú Adicional</SheetTitle>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            {moreRoutes.map((route) => (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent"
                                >
                                    <route.icon className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">{route.label}</span>
                                </Link>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* FAB */}
            <Button
                asChild
                size="icon"
                className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-brand-primary shadow-lg hover:bg-brand-primary/90 md:hidden z-40"
            >
                <Link href="/transacciones/nueva">
                    <Plus className="h-6 w-6 text-white" />
                    <span className="sr-only">Nueva Transacción</span>
                </Link>
            </Button>
        </>
    );
}
