"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { saveAsistencia, type AsistenciaAtleta } from "@/lib/queries/eventos";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AttendanceTableProps {
    eventoId: string;
    atletas: AsistenciaAtleta[];
    isLiquidado: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AttendanceTable({ eventoId, atletas, isLiquidado }: AttendanceTableProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Local state: track attendance changes
    const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        atletas.forEach((a) => {
            initial[a.atleta_id] = a.asistio;
        });
        return initial;
    });

    const toggleAttendance = (atletaId: string) => {
        if (isLiquidado) return; // no changes on liquidated events
        setAttendance((prev) => ({
            ...prev,
            [atletaId]: !prev[atletaId],
        }));
    };

    const toggleAll = (checked: boolean) => {
        if (isLiquidado) return;
        const newState: Record<string, boolean> = {};
        atletas.forEach((a) => {
            newState[a.atleta_id] = checked;
        });
        setAttendance(newState);
    };

    const presentCount = Object.values(attendance).filter(Boolean).length;

    const handleSave = () => {
        startTransition(async () => {
            const payload = atletas.map((a) => ({
                atleta_id: a.atleta_id,
                asistio: attendance[a.atleta_id] ?? false,
            }));

            const result = await saveAsistencia(eventoId, payload);

            if (result.error) {
                toast({
                    title: "❌ Error al guardar asistencia",
                    description: result.error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "✅ Asistencia guardada",
                    description: `Se registró la asistencia de ${presentCount} jugador(es).`,
                });
            }
        });
    };

    return (
        <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold tracking-tight">
                                Lista de Asistencia
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {atletas.length} jugador(es) en la categoría •{" "}
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {presentCount} presente(s)
                                </span>
                            </CardDescription>
                        </div>
                    </div>

                    {!isLiquidado && (
                        <Button
                            onClick={handleSave}
                            disabled={isPending}
                            className="gap-2"
                        >
                            {isPending ? (
                                <>
                                    <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Guardar Asistencia
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {atletas.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No hay jugadores asignados a esta categoría.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[60px] text-center">
                                    <Checkbox
                                        checked={presentCount === atletas.length}
                                        onCheckedChange={(checked) =>
                                            toggleAll(checked === true)
                                        }
                                        disabled={isLiquidado}
                                        aria-label="Seleccionar todos"
                                    />
                                </TableHead>
                                <TableHead>Jugador</TableHead>
                                <TableHead className="w-[140px]">Documento</TableHead>
                                <TableHead className="w-[120px]">Posición</TableHead>
                                <TableHead className="w-[100px] text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {atletas.map((atleta) => {
                                const isPresent = attendance[atleta.atleta_id] ?? false;
                                return (
                                    <TableRow
                                        key={atleta.atleta_id}
                                        className={`transition-colors cursor-pointer ${
                                            isPresent
                                                ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                                                : "hover:bg-muted/20"
                                        }`}
                                        onClick={() => toggleAttendance(atleta.atleta_id)}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={isPresent}
                                                onCheckedChange={() =>
                                                    toggleAttendance(atleta.atleta_id)
                                                }
                                                disabled={isLiquidado}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {atleta.nombre_completo}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono text-muted-foreground">
                                            {atleta.documento || "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {atleta.posicion || "—"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isPresent ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 text-[10px] font-bold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Presente
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-bold text-muted-foreground"
                                                >
                                                    Ausente
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
