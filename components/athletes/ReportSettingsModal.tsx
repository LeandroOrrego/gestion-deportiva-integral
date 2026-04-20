"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, BarChart2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Category = { id: string; nombre: string };

type ColKey = "fichaje" | "viaticos" | "premios" | "objetivos";

const COL_OPTIONS: { key: ColKey; label: string; sublabel: string }[] = [
    { key: "fichaje",   label: "Costos de Fichaje",  sublabel: "Pase y Prima inicial" },
    { key: "viaticos",  label: "Viáticos",            sublabel: "Práctica y Partido" },
    { key: "premios",   label: "Premios por partido", sublabel: "Victoria, Empate y Derrota" },
    { key: "objetivos", label: "Premios por Objetivo",sublabel: "Clasificación y Campeón" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ReportSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ReportSettingsModal({
    open,
    onOpenChange,
    categories,
}: ReportSettingsModalProps) {
    const router = useRouter();
    const [selectedCat, setSelectedCat] = useState<string>("todas");
    const [selectedCols, setSelectedCols] = useState<Set<ColKey>>(
        new Set(["fichaje", "viaticos", "premios", "objetivos"])
    );

    const toggleCol = (key: ColKey) => {
        setSelectedCols((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                // Keep at least one column selected
                if (next.size === 1) return prev;
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleGenerate = () => {
        const params = new URLSearchParams();
        if (selectedCat !== "todas") params.set("cat", selectedCat);
        params.set("cols", [...selectedCols].join(","));
        router.push(`/reportes/comision?${params.toString()}`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        Configurar Reporte
                    </DialogTitle>
                    <DialogDescription>
                        Elegí la categoría y los bloques de datos que querés incluir en el reporte financiero.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Category Selector */}
                    <div className="space-y-1.5">
                        <Label htmlFor="select-cat" className="text-sm font-medium">
                            Categoría / Plantel
                        </Label>
                        <Select value={selectedCat} onValueChange={setSelectedCat}>
                            <SelectTrigger id="select-cat" className="w-full">
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas las categorías</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.nombre}>
                                        {c.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Columns Selector */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Columnas a mostrar</Label>
                        <p className="text-xs text-muted-foreground -mt-1">
                            Seleccioná los bloques de datos que aparecerán en el reporte.
                        </p>

                        <div className="grid grid-cols-1 gap-2 mt-2">
                            {COL_OPTIONS.map(({ key, label, sublabel }) => {
                                const active = selectedCols.has(key);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => toggleCol(key)}
                                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                                            active
                                                ? "border-primary bg-primary/5 text-foreground"
                                                : "border-border bg-muted/30 text-muted-foreground"
                                        }`}
                                    >
                                        {/* Checkbox visual */}
                                        <span
                                            className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                                active
                                                    ? "border-primary bg-primary"
                                                    : "border-muted-foreground/40"
                                            }`}
                                        >
                                            {active && (
                                                <svg
                                                    className="h-2.5 w-2.5 text-primary-foreground"
                                                    fill="none"
                                                    viewBox="0 0 12 12"
                                                    stroke="currentColor"
                                                    strokeWidth={2.5}
                                                >
                                                    <path d="M2 6l3 3 5-5" />
                                                </svg>
                                            )}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium leading-tight">{label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleGenerate} className="gap-2">
                        <FileText className="h-4 w-4" />
                        Ver Reporte
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
