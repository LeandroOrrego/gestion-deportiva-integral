"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Small client component to handle the window.print() action.
 */
export function PrintButton() {
    return (
        <Button 
            variant="outline" 
            className="rounded-xl font-bold gap-2 border-brand-primary/20 hover:bg-brand-primary/10 transition-all shadow-sm bg-white/50 backdrop-blur-sm"
            onClick={() => window.print()}
        >
            <Printer className="h-4 w-4" />
            Imprimir Contrato
        </Button>
    );
}
