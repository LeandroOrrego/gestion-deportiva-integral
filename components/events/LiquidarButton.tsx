"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { liquidarEvento } from "@/lib/queries/eventos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface LiquidarButtonProps {
    eventoId: string;
    isLiquidado: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LiquidarButton({ eventoId, isLiquidado }: LiquidarButtonProps) {
    const { profile } = useAuth();
    const isViewer = profile?.rol === 'viewer';
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (isViewer) return null;

    if (isLiquidado) {
        return (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1.5 text-sm font-bold px-4 py-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Pagos Liquidados
            </Badge>
        );
    }

    const handleLiquidar = () => {
        startTransition(async () => {
            const result = await liquidarEvento(eventoId);

            if (result.error) {
                toast({
                    title: "❌ Error al liquidar",
                    description: result.error,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "✅ Liquidación completada",
                description: `Se generaron pagos para ${result.liquidados} jugador(es).`,
            });

            router.refresh();
        });
    };

    return (
        <Button
            onClick={handleLiquidar}
            disabled={isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
            size="lg"
        >
            {isPending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Liquidando pagos...
                </>
            ) : (
                <>
                    <Banknote className="h-5 w-5" />
                    Liquidar Pagos
                </>
            )}
        </Button>
    );
}
