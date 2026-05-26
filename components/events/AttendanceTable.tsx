"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, Users, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { saveAsistencia } from "@/lib/queries/eventos";
import type { AsistenciaConMonto } from "@/lib/queries/eventos";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardHeader,
    CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AttendanceTableProps {
    eventoId: string;
    atletas: AsistenciaConMonto[];
    isLiquidado: boolean;
    resultado?: "Victoria" | "Empate" | "Derrota" | null;
    rival?: string | null;
    fecha?: string;
    categoria?: string;
    tipoEvento?: "Partido" | "Practica" | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatGs(n: number) {
    return `Gs. ${n.toLocaleString("es-PY")}`;
}

const RESULTADO_EMOJI: Record<string, string> = {
    Victoria: "🏆", Empate: "🤝", Derrota: "❌",
};

const RESULTADO_STYLE: Record<string, string> = {
    Victoria: "background:#d1fae5;color:#065f46;",
    Empate: "background:#fef3c7;color:#92400e;",
    Derrota: "background:#fee2e2;color:#991b1b;",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AttendanceTable({
    eventoId, atletas, isLiquidado,
    resultado, rival, fecha, categoria, tipoEvento,
}: AttendanceTableProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        atletas.forEach((a) => { init[a.atleta_id] = a.asistio; });
        return init;
    });

    const toggleAttendance = (id: string) => {
        if (isLiquidado) return;
        setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleAll = (checked: boolean) => {
        if (isLiquidado) return;
        const s: Record<string, boolean> = {};
        atletas.forEach((a) => { s[a.atleta_id] = checked; });
        setAttendance(s);
    };

    const presentCount = Object.values(attendance).filter(Boolean).length;
    const presentes = atletas.filter((a) => attendance[a.atleta_id]);
    const totalMonto = presentes.reduce((sum, a) => sum + (a.monto_calculado ?? 0), 0);
    const hayMontos = atletas.some((a) => (a.monto_calculado ?? 0) > 0);

    // ── Guardar ─────────────────────────────────────────────────────────────
    const handleSave = () => {
        startTransition(async () => {
            const payload = atletas.map((a) => ({
                atleta_id: a.atleta_id,
                asistio: attendance[a.atleta_id] ?? false,
            }));
            const result = await saveAsistencia(eventoId, payload);
            if (result.error) {
                toast({ title: "❌ Error al guardar asistencia", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "✅ Asistencia guardada", description: `${presentCount} jugador(es) registrados.` });
            }
        });
    };

    // ── Imprimir reporte ─────────────────────────────────────────────────────
    const handlePrint = () => {
        const fechaFormateada = fecha
            ? new Date(fecha + "T12:00:00").toLocaleDateString("es-PY", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
            })
            : "—";

        const esPartido = tipoEvento === "Partido";
        const resultStyle = resultado ? RESULTADO_STYLE[resultado] ?? "" : "background:#f3f4f6;color:#6b7280;";

        const filas = presentes.map((a, i) => {
            const monto = a.monto_calculado ?? 0;
            const detalle = a.detalle_monto ?? "—";
            return `
                <tr>
                    <td style="padding:9px 10px;text-align:center;color:#9ca3af;font-size:12px;">${i + 1}</td>
                    <td style="padding:9px 10px;font-weight:600;font-size:13px;">${a.nombre_completo}</td>
                    <td style="padding:9px 10px;font-family:monospace;color:#6b7280;font-size:12px;">${a.documento || "—"}</td>
                    <td style="padding:9px 10px;color:#6b7280;font-size:12px;text-align:center;">${a.posicion || "—"}</td>
                    ${hayMontos ? `
                    <td style="padding:9px 10px;font-size:11px;color:#4b5563;">${detalle}</td>
                    <td style="padding:9px 10px;text-align:right;font-weight:700;font-size:13px;color:#065f46;">${monto > 0 ? formatGs(monto) : "—"}</td>
                    ` : ""}
                </tr>`;
        }).join("");

        const totalFila = hayMontos && totalMonto > 0 ? `
            <tr style="background:#f0fdf4;border-top:2px solid #059669;">
                <td colspan="${4}" style="padding:11px 10px;text-align:right;font-weight:800;font-size:13px;color:#065f46;letter-spacing:0.3px;">TOTAL A PAGAR</td>
                <td style="padding:11px 10px;"></td>
                <td style="padding:11px 10px;text-align:right;font-weight:800;font-size:14px;color:#065f46;">${formatGs(totalMonto)}</td>
            </tr>` : "";

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte de Pagos — ${categoria || "Categoría"}</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#fff;padding:36px;font-size:13px; }
  .header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #f47920; }
  .club-name { font-size:20px;font-weight:800;color:#1a5c2a;letter-spacing:-0.3px; }
  .club-sub { font-size:11px;color:#9ca3af;margin-top:3px; }
  .doc-title { font-size:11px;color:#9ca3af;text-align:right; }
  .doc-title strong { display:block;font-size:15px;color:#111;font-weight:700;margin-bottom:2px; }
  .info-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px; }
  .info-box { background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px; }
  .info-label { font-size:9px;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;font-weight:700; }
  .info-value { font-size:13px;font-weight:700;color:#111;margin-top:3px;text-transform:capitalize; }
  .badge { display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700; }
  table { width:100%;border-collapse:collapse; }
  thead { background:#1a5c2a; }
  thead th { padding:10px 10px;color:#fff;font-size:9.5px;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;text-align:left; }
  thead th.r { text-align:right; }
  thead th.c { text-align:center; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  tbody tr { border-bottom:1px solid #f3f4f6; }
  .footer { margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end; }
  .firma { text-align:center; }
  .firma-line { width:200px;border-top:1px solid #374151;margin-bottom:6px; }
  .firma-label { font-size:10px;color:#6b7280; }
  .gen { font-size:10px;color:#9ca3af; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="club-name">Club Deportivo Naranjal</div>
    <div class="club-sub">Naranjal, Alto Paraná — Paraguay</div>
  </div>
  <div class="doc-title">
    <strong>REPORTE DE PAGOS</strong>
    Generado: ${new Date().toLocaleDateString("es-PY")} ${new Date().toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Categoría</div>
    <div class="info-value">${categoria || "—"}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Fecha</div>
    <div class="info-value" style="font-size:12px;">${fechaFormateada}</div>
  </div>
  <div class="info-box">
    <div class="info-label">${esPartido ? "Rival" : "Tipo"}</div>
    <div class="info-value">${esPartido ? (rival || "—") : "Práctica"}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Resultado / Presentes</div>
    <div class="info-value">
      ${resultado
                ? `<span class="badge" style="${resultStyle}">${RESULTADO_EMOJI[resultado] || ""} ${resultado}</span>`
                : `<span style="color:#9ca3af;">—</span>`}
      &nbsp;<span style="color:#059669;">${presentCount}</span><span style="color:#9ca3af;font-weight:400;"> / ${atletas.length}</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th class="c" style="width:36px;">#</th>
      <th>Jugador</th>
      <th>C.I.</th>
      <th class="c">Posición</th>
      ${hayMontos ? "<th>Detalle</th><th class='r'>Monto</th>" : ""}
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${totalFila}
  </tbody>
</table>

<div class="footer">
  <div class="gen">ClubManager PY — ${new Date().getFullYear()}</div>
  <div class="firma">
    <div class="firma-line"></div>
    <div class="firma-label">Firma / Tesorero</div>
  </div>
</div>

</body>
</html>`;

        const win = window.open("", "_blank", "width=960,height=720");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        win.onload = () => win.print();
    };

    // ── Render ───────────────────────────────────────────────────────────────
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
                                {hayMontos && totalMonto > 0 && (
                                    <> • <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        Total: {formatGs(totalMonto)}
                                    </span></>
                                )}
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {presentCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                                <Printer className="h-4 w-4" />
                                Imprimir Reporte
                            </Button>
                        )}
                        {!isLiquidado && (
                            <Button onClick={handleSave} disabled={isPending} className="gap-2">
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
                                        onCheckedChange={(c) => toggleAll(c === true)}
                                        disabled={isLiquidado}
                                        aria-label="Seleccionar todos"
                                    />
                                </TableHead>
                                <TableHead>Jugador</TableHead>
                                <TableHead className="w-[140px]">Documento</TableHead>
                                <TableHead className="w-[120px]">Posición</TableHead>
                                {hayMontos && (
                                    <TableHead className="w-[140px] text-right">Monto</TableHead>
                                )}
                                <TableHead className="w-[100px] text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {atletas.map((atleta) => {
                                const isPresent = attendance[atleta.atleta_id] ?? false;
                                const monto = atleta.monto_calculado ?? 0;
                                return (
                                    <TableRow
                                        key={atleta.atleta_id}
                                        className={`transition-colors cursor-pointer ${isPresent
                                                ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                                                : "hover:bg-muted/20"
                                            }`}
                                        onClick={() => toggleAttendance(atleta.atleta_id)}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={isPresent}
                                                onCheckedChange={() => toggleAttendance(atleta.atleta_id)}
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
                                        {hayMontos && (
                                            <TableCell className="text-right">
                                                {isPresent && monto > 0 ? (
                                                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {formatGs(monto)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-center">
                                            {isPresent ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 text-[10px] font-bold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Presente
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
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