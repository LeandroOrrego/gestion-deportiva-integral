import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ChevronLeft,
    CalendarDays,
    Swords,
    Trophy,
    MapPin,
} from "lucide-react";

import { getEventoDetalle, getAsistenciaConMontos } from "@/lib/queries/eventos";
import { AttendanceTable } from "@/components/events/AttendanceTable";
import { LiquidarButton } from "@/components/events/LiquidarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Page Props (Next.js 15+ dynamic route)
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailPageProps {
    params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function resultadoColor(resultado: string | null) {
    switch (resultado) {
        case "Victoria":
            return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
        case "Empate":
            return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
        case "Derrota":
            return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
        default:
            return "";
    }
}

function resultadoEmoji(resultado: string | null) {
    switch (resultado) {
        case "Victoria": return "🏆";
        case "Empate": return "🤝";
        case "Derrota": return "❌";
        default: return "⏳";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: EventDetailPageProps) {
    const resolvedParams = await params;
    const evento = await getEventoDetalle(resolvedParams.id);

    if (!evento) {
        notFound();
    }

    const asistencia = await getAsistenciaConMontos(
        evento.id,
        evento.categoria_id,
        evento.resultado,
        evento.tipo
    );

    const fechaFormatted = new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-PY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const isPartido = evento.tipo === "Partido";
    const isLiquidado = evento.estado === "Liquidado";

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl mx-auto pb-10">
            {/* ── Breadcrumbs ────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-1 -ml-2 text-muted-foreground hover:text-foreground"
                >
                    <Link href="/eventos">
                        <ChevronLeft className="h-4 w-4" />
                        Volver a eventos
                    </Link>
                </Button>

                <Badge
                    variant="outline"
                    className={`text-xs font-bold uppercase ${isLiquidado
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400"
                        }`}
                >
                    {evento.estado}
                </Badge>
            </div>

            {/* ── Event Header Card ─────────────────────────────────── */}
            <Card className="rounded-2xl shadow-sm border border-border/60 overflow-hidden">
                <CardContent className="p-0">
                    {/* Top Banner */}
                    <div className={`px-6 py-5 ${isPartido
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
                        : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
                        }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Left: Event identity */}
                            <div className="flex items-center gap-4">
                                <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${isPartido
                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                                    : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                                    }`}>
                                    {isPartido ? (
                                        <Swords className="h-7 w-7" />
                                    ) : (
                                        <Trophy className="h-7 w-7" />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight">
                                        {isPartido && evento.rival
                                            ? `vs. ${evento.rival}`
                                            : evento.tipo === "Practica"
                                                ? "Sesión de Práctica"
                                                : "Partido"}
                                    </h1>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        <span className="capitalize">{fechaFormatted}</span>
                                        <span className="text-border">|</span>
                                        <MapPin className="h-3.5 w-3.5" />
                                        {evento.categorias?.nombre || "Sin categoría"}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Result badge + Liquidar Button */}
                            <div className="flex items-center gap-3">
                                {isPartido && (
                                    <Badge
                                        variant="outline"
                                        className={`text-sm font-bold px-4 py-1.5 ${resultadoColor(evento.resultado)}`}
                                    >
                                        {resultadoEmoji(evento.resultado)}{" "}
                                        {evento.resultado || "Pendiente"}
                                    </Badge>
                                )}
                                <LiquidarButton
                                    eventoId={evento.id}
                                    isLiquidado={isLiquidado}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-3 divide-x border-t">
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Tipo
                            </p>
                            <p className="text-sm font-semibold mt-0.5">{evento.tipo}</p>
                        </div>
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Categoría
                            </p>
                            <p className="text-sm font-semibold mt-0.5">
                                {evento.categorias?.nombre || "—"}
                            </p>
                        </div>
                        <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Convocados
                            </p>
                            <p className="text-sm font-semibold mt-0.5 text-primary">
                                {asistencia.length}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Attendance Table ───────────────────────────────────── */}
            <AttendanceTable
                eventoId={evento.id}
                atletas={asistencia}
                isLiquidado={isLiquidado}
                resultado={evento.resultado}
                rival={evento.rival}
                fecha={evento.fecha}
                categoria={evento.categorias?.nombre}
                tipoEvento={evento.tipo}
            />
        </div>
    );
}
