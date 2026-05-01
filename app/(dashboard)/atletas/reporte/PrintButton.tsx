"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-black px-4 py-2 rounded-md font-medium transition-colors"
        >
            <Printer className="w-4 h-4" />
            Imprimir Reporte
        </button>
    );
}
