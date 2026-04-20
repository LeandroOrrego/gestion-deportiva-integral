"use client";

import Link from "next/link";
import {
    CalendarPlus,
    Swords,
    Trophy,
    ChevronRight,
    FileBarChart2,
} from "lucide-react";
import type { Evento } from "@/lib/queries/eventos";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EventListProps {
    eventos: Evento[];
    onCreateEvent: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-PY", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

function resultadoBadge(resultado: string | null) {
    if (!resultado) {
        return <Badge variant="outline" className="text-[10px]">Pendiente</Badge>;
    }
    const styles: Record<string, string> = {
        Victoria: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        Empate: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        Derrota: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return (
        <Badge variant="outline" className={`text-[10px] font-bold uppercase ${styles[resultado] || ""}`}>
            {resultado}
        </Badge>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventList({ eventos, onCreateEvent }: EventListProps) {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Partidos, prácticas y registro de asistencia
                    </p>
                </div>
                <Button onClick={onCreateEvent} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Nuevo Evento
                </Button>
            </div>

            {/* Table */}
            {eventos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-muted/10">
                    <FileBarChart2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        No hay eventos registrados todavía.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={onCreateEvent}
                    >
                        Crear primer evento
                    </Button>
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead className="w-[100px]">Tipo</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Rival</TableHead>
                                <TableHead className="w-[110px]">Resultado</TableHead>
                                <TableHead className="w-[100px]">Estado</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {eventos.map((evento) => (
                                <TableRow
                                    key={evento.id}
                                    className="group hover:bg-muted/20 transition-colors"
                                >
                                    <TableCell className="font-mono text-sm">
                                        {formatFecha(evento.fecha)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1.5 text-sm">
                                            {evento.tipo === "Partido" ? (
                                                <Swords className="h-3.5 w-3.5 text-blue-500" />
                                            ) : (
                                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                            )}
                                            {evento.tipo}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {evento.categorias?.nombre || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {evento.rival || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {resultadoBadge(evento.resultado)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-bold uppercase ${
                                                evento.estado === "Liquidado"
                                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400"
                                            }`}
                                        >
                                            {evento.estado}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            asChild
                                        >
                                            <Link href={`/eventos/${evento.id}`}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
