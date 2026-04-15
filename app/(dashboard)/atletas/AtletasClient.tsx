"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

import { AthleteList } from "@/components/athletes/AthleteList";
import { AthleteAgreementForm } from "@/components/athletes/AthleteAgreementForm";
import { saveAthleteAgreement, type AtletaConAcuerdo } from "@/lib/queries/atletas";

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
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AtletasClientProps {
    athletes: AtletaConAcuerdo[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Shell
// ─────────────────────────────────────────────────────────────────────────────

export default function AtletasClient({ athletes }: AtletasClientProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedAthlete, setSelectedAthlete] = useState<AtletaConAcuerdo | null>(null);
    const [mode, setMode] = useState<"register" | "contract">("register");

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRegister = () => {
        setSelectedAthlete(null);
        setMode("register");
        setSheetOpen(true);
    };

    const handleEdit = (athlete: AtletaConAcuerdo) => {
        setSelectedAthlete(athlete);
        setMode("register");
        setSheetOpen(true);
    };

    const handleViewContract = (athlete: AtletaConAcuerdo) => {
        setSelectedAthlete(athlete);
        setMode("contract");
        setSheetOpen(true);
    };

    const handleAgreementSubmit = async (formData: any) => {
        if (!selectedAthlete) return;

        startTransition(async () => {
            const existingId = selectedAthlete.acuerdo_2026?.id;

            const result = await saveAthleteAgreement(
                selectedAthlete.id,
                formData,
                existingId
            );

            if (result.error) {
                toast({
                    title: "❌ Error al guardar",
                    description: result.error,
                    variant: "destructive",
                });
                return;
            }

            setSheetOpen(false);
            toast({
                title: "✅ Acuerdo guardado",
                description: `Las condiciones de ${selectedAthlete.nombre_completo} fueron guardadas correctamente.`,
            });
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
            ? `Condiciones financieras vigentes para ${selectedAthlete?.nombre_completo ?? "el jugador"}.`
            : selectedAthlete
            ? `Editando los datos de ${selectedAthlete.nombre_completo}.`
            : "Completá los datos del nuevo jugador y definí sus condiciones financieras.";

    // ── Initial form data (pre-fill from existing agreement) ─────────────────

    const initialAgreementData = selectedAthlete?.acuerdo_2026
        ? {
              costo_pase: selectedAthlete.acuerdo_2026.costo_pase ?? 0,
              prima_inicial: selectedAthlete.acuerdo_2026.prima_inicial ?? 0,
              viatico_practica: selectedAthlete.acuerdo_2026.viatico_practica ?? 0,
              viatico_partido:
                  selectedAthlete.acuerdo_2026.viatico_partido ??
                  selectedAthlete.acuerdo_2026.viatico_base ??
                  0,
              premio_victoria: selectedAthlete.acuerdo_2026.premio_victoria ?? 0,
              premio_empate: selectedAthlete.acuerdo_2026.premio_empate ?? 0,
              premio_derrota: selectedAthlete.acuerdo_2026.premio_derrota ?? 0,
              premio_fijo_resultado: selectedAthlete.acuerdo_2026.premio_fijo_resultado ?? 0,
              premio_clasificacion: selectedAthlete.acuerdo_2026.premio_clasificacion ?? 0,
              premio_campeonato: selectedAthlete.acuerdo_2026.premio_campeonato ?? 0,
          }
        : undefined;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            {/* Main content: pass real data */}
            <AthleteList
                athletes={athletes}
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
                    <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
                        <SheetTitle className="text-lg font-bold">
                            {sheetTitle}
                        </SheetTitle>
                        <SheetDescription className="text-sm">
                            {sheetDescription}
                        </SheetDescription>
                    </SheetHeader>

                    <Separator className="mx-6 w-auto shrink-0" />

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-6 py-5 pb-10">
                            <AthleteAgreementForm
                                athleteName={selectedAthlete?.nombre_completo}
                                initialData={initialAgreementData}
                                onSubmit={handleAgreementSubmit}
                                isPending={isPending}
                            />
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
