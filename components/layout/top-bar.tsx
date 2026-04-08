"use client";

import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function TopBar() {
    return (
        <div className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-primary-foreground">
                    <Trophy className="h-5 w-5" />
                </div>
                <h1 className="text-lg font-bold font-display tracking-tight text-brand-primary">
                    ClubManager PY
                </h1>
            </div>
            <ThemeToggle />
        </div>
    );
}
