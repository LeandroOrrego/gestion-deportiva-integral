"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

import { EventList } from "@/components/events/EventList";
import { EventForm, type EventFormValues } from "@/components/events/EventForm";
import { saveEvento, type Evento } from "@/lib/queries/eventos";

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

interface EventosClientProps {
    eventos: Evento[];
    categories: { id: string; nombre: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Shell
// ─────────────────────────────────────────────────────────────────────────────

export default function EventosClient({ eventos, categories }: EventosClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleCreateEvent = () => {
        setSheetOpen(true);
    };

    const handleSubmit = async (formData: EventFormValues) => {
        startTransition(async () => {
            const result = await saveEvento({
                fecha: formData.fecha,
                tipo: formData.tipo,
                categoria_id: formData.categoria_id,
                jornada: formData.jornada,
                rival: formData.rival,
                resultado: formData.resultado,
            });

            if (result.error) {
                toast({
                    title: "❌ Error al crear evento",
                    description: result.error,
                    variant: "destructive",
                });
                return;
            }

            setSheetOpen(false);
            toast({
                title: "✅ Evento creado",
                description: "El evento fue registrado correctamente.",
            });

            // Navigate to the new event's detail page
            if (result.eventoId) {
                router.push(`/eventos/${result.eventoId}`);
            }
        });
    };

    return (
        <div className="space-y-6 max-w-screen-xl mx-auto">
            <EventList
                eventos={eventos}
                onCreateEvent={handleCreateEvent}
            />

            {/* ── Sheet: Crear Evento ─────────────────────────────────── */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-[480px] p-0 flex flex-col"
                >
                    <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
                        <SheetTitle className="text-lg font-bold">
                            Nuevo Evento
                        </SheetTitle>
                        <SheetDescription className="text-sm">
                            Registrá un partido o práctica para la temporada.
                        </SheetDescription>
                    </SheetHeader>

                    <Separator className="mx-6 w-auto shrink-0" />

                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-6 py-5 pb-10">
                            <EventForm
                                categories={categories}
                                onSubmit={handleSubmit}
                                isPending={isPending}
                            />
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}
