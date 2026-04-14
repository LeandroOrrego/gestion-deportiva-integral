"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import { AthleteList } from "@/components/athletes/AthleteList";
import { AthleteAgreementForm } from "@/components/athletes/AthleteAgreementForm";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─────────────────────────────────────────────────────────────────────────────
// Types (shared with AthleteList — extract to a types file once Supabase is wired)
// ─────────────────────────────────────────────────────────────────────────────

interface Athlete {
    id: string;
    nombre: string;
    ci: string;
    plantel: string;
    posicion: string;
    doc_pase: "ok" | "falta";
    doc_ficha: "ok" | "falta";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AtletasPage() {
    const { toast } = useToast();

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
    const [mode, setMode] = useState<"register" | "contract">("register");

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRegister = () => {
        setSelectedAthlete(null);
        setMode("register");
        setSheetOpen(true);
    };

    const handleEdit = (athlete: Athlete) => {
        setSelectedAthlete(athlete);
        setMode("register");
        setSheetOpen(true);
    };

    const handleViewContract = (athlete: Athlete) => {
        setSelectedAthlete(athlete);
        setMode("contract");
        setSheetOpen(true);
    };

    const handleAgreementSubmit = async (data: any) => {
        // Simulate API save
        await new Promise((r) => setTimeout(r, 1000));

        setSheetOpen(false);

        toast({
            title: "✅ Acuerdo guardado",
            description: selectedAthlete
                ? `Las condiciones de ${selectedAthlete.nombre} fueron actualizadas.`
                : "El nuevo acuerdo fue registrado correctamente.",
        });
    };

    // ── Sheet title helpers ───────────────────────────────────────────────────

    const sheetTitle =
        mode === "contract"
            ? "Contrato del Atleta"
            : selectedAthlete
            ? "Editar Atleta"
            : "Registrar Atleta";

    const sheetDescription =
        mode === "contract"
            ? `Condiciones financieras vigentes para ${selectedAthlete?.nombre ?? "el jugador"}.`
            : selectedAthlete
            ? `Editando los datos de ${selectedAthlete.nombre}.`
            : "Completá los datos del nuevo jugador y definí sus condiciones financieras.";

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Main content */}
            <AthleteList
                onRegister={handleRegister}
                onEdit={handleEdit}
                onViewContract={handleViewContract}
            />

            {/* ── Lateral Sheet ─────────────────────────────────────────────── */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-[520px] p-0 flex flex-col"
                >
                    {/* Header */}
                    <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
                        <SheetTitle className="text-lg font-bold">
                            {sheetTitle}
                        </SheetTitle>
                        <SheetDescription className="text-sm">
                            {sheetDescription}
                        </SheetDescription>
                    </SheetHeader>

                    <Separator className="mx-6 w-auto shrink-0" />

                    {/* Scrollable body */}
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-6 py-5 pb-10">
                            {mode === "contract" || mode === "register" ? (
                                <AthleteAgreementForm
                                    athleteName={selectedAthlete?.nombre}
                                    onSubmit={handleAgreementSubmit}
                                />
                            ) : null}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
