"use client";
import { useEffect, useState, useMemo } from "react";
import { getJornadas, getEventosByJornada, getTransaccionesByJornada } from "@/lib/queries/jornadas";
import type { Jornada, EventoResultado, JornadaTransaccion } from "@/lib/queries/jornadas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, ChevronDown, ChevronRight, Printer, Trophy, ShoppingCart, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtGs(v: number) { return `Gs. ${new Intl.NumberFormat("es-PY").format(Math.round(v))}`; }
function fmtFecha(d: string) { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; }

type CatGroup = { nombre: string; total: number; count: number; items: { desc: string; monto: number }[] };

function buildGroups(txns: JornadaTransaccion[]): CatGroup[] {
    const map = new Map<string, CatGroup>();
    txns.forEach(t => {
        const cat = t.transaction_types?.nombre || "Sin categoría";
        if (!map.has(cat)) map.set(cat, { nombre: cat, total: 0, count: 0, items: [] });
        const g = map.get(cat)!;
        g.total += Number(t.monto); g.count += 1;
        g.items.push({ desc: t.entidades?.nombre || t.descripcion || "-", monto: Number(t.monto) });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function ExpandableTable({ groups, color }: { groups: CatGroup[]; color: string }) {
    const [open, setOpen] = useState<Set<string>>(new Set());
    const toggle = (n: string) => { const s = new Set(open); s.has(n) ? s.delete(n) : s.add(n); setOpen(s); };
    const total = groups.reduce((s, g) => s + g.total, 0);
    return (
        <Table>
            <TableHeader><TableRow className="bg-muted/20">
                <TableHead className="pl-5 w-8"></TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Ops.</TableHead>
                <TableHead className="text-right pr-5">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
                {groups.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">Sin datos.</TableCell></TableRow>
                ) : (<>
                    {groups.map(g => (<>
                        <TableRow key={g.nombre} className="cursor-pointer hover:bg-muted/10" onClick={() => toggle(g.nombre)}>
                            <TableCell className="pl-5">{open.has(g.nombre) ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronRight className="h-3.5 w-3.5"/>}</TableCell>
                            <TableCell className="font-medium">{g.nombre}</TableCell>
                            <TableCell className="text-center"><Badge variant="secondary" className="font-mono">{g.count}</Badge></TableCell>
                            <TableCell className={cn("text-right pr-5 font-mono font-semibold", color)}>{fmtGs(g.total)}</TableCell>
                        </TableRow>
                        {open.has(g.nombre) && g.items.map((it, i) => (
                            <TableRow key={`${g.nombre}-${i}`} className="bg-muted/5">
                                <TableCell></TableCell>
                                <TableCell className="pl-8 text-sm text-muted-foreground">{it.desc}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className={cn("text-right pr-5 font-mono text-sm", color)}>{fmtGs(it.monto)}</TableCell>
                            </TableRow>
                        ))}
                    </>))}
                    <TableRow className="bg-muted/10 border-t-2">
                        <TableCell></TableCell>
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary" className="font-mono">{groups.reduce((s,g)=>s+g.count,0)}</Badge></TableCell>
                        <TableCell className={cn("text-right pr-5 font-mono font-bold", color)}>{fmtGs(total)}</TableCell>
                    </TableRow>
                </>)}
            </TableBody>
        </Table>
    );
}

export default function JornadaTab({ orgId }: { orgId: string }) {
    const [jornadas, setJornadas] = useState<Jornada[]>([]);
    const [jornadaId, setJornadaId] = useState("");
    const [eventos, setEventos] = useState<EventoResultado[]>([]);
    const [txns, setTxns] = useState<JornadaTransaccion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (orgId) getJornadas(orgId).then(setJornadas); }, [orgId]);

    const jornada = jornadas.find(j => j.id === jornadaId);

    useEffect(() => {
        if (!jornadaId || jornadaId === "none") { setEventos([]); setTxns([]); return; }
        setLoading(true);
        Promise.all([getEventosByJornada(jornadaId), getTransaccionesByJornada(orgId, jornadaId)])
            .then(([ev, tx]) => { setEventos(ev); setTxns(tx); })
            .finally(() => setLoading(false));
    }, [orgId, jornadaId]);

    const isHome = jornada?.ubicacion === "home";
    const depExp = useMemo(() => txns.filter(t => t.fondo === "deportivo" && t.flow === "expense"), [txns]);
    const admInc = useMemo(() => txns.filter(t => t.fondo === "administrativo" && t.flow === "income"), [txns]);
    const admExp = useMemo(() => txns.filter(t => t.fondo === "administrativo" && t.flow === "expense"), [txns]);
    const depGroups = useMemo(() => buildGroups(depExp), [depExp]);
    const admIncGroups = useMemo(() => buildGroups(admInc), [admInc]);
    const admExpGroups = useMemo(() => buildGroups(admExp), [admExp]);
    const totalDep = depExp.reduce((s,t) => s + Number(t.monto), 0);
    const totalAdmInc = admInc.reduce((s,t) => s + Number(t.monto), 0);
    const totalAdmExp = admExp.reduce((s,t) => s + Number(t.monto), 0);
    const netVentas = totalAdmInc - totalAdmExp;
    const netTotal = netVentas - totalDep;

    return (
        <div className="space-y-5">
            <Card><CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                    <span className="text-sm font-medium">Jornada:</span>
                </div>
                <Select value={jornadaId} onValueChange={setJornadaId}>
                    <SelectTrigger className="w-full sm:w-[420px] h-9"><SelectValue placeholder="Seleccionar jornada..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">-- Seleccionar --</SelectItem>
                        {jornadas.map(j => (
                            <SelectItem key={j.id} value={j.id}>
                                Jornada {j.numero} — {fmtFecha(j.fecha)} — {j.rival || "ND"} ({j.ubicacion === "home" ? "Local" : "Visitante"})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>}
                {jornadaId && jornadaId !== "none" && (
                    <Button variant="outline" size="sm" className="ml-auto gap-1.5 print:hidden" onClick={() => window.print()}>
                        <Printer className="h-3.5 w-3.5"/> Imprimir / PDF
                    </Button>
                )}
            </CardContent></Card>

            {jornadaId && jornadaId !== "none" && !loading && (<>
                {/* A — Resultados */}
                <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4"/> Resultados por Categoría</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table><TableHeader><TableRow className="bg-muted/20">
                            <TableHead className="pl-5">Categoría</TableHead>
                            <TableHead>Resultado</TableHead>
                            <TableHead className="text-center">Marcador</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {eventos.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Sin partidos registrados.</TableCell></TableRow>
                            ) : eventos.map(ev => {
                                const res = ev.resultado || "-";
                                const resColor = res === "Victoria" ? "text-emerald-600" : res === "Derrota" ? "text-red-600" : "text-amber-600";
                                return (
                                    <TableRow key={ev.id}>
                                        <TableCell className="pl-5 font-medium">{ev.categorias?.nombre || "Sin categoría"}</TableCell>
                                        <TableCell><Badge variant="outline" className={cn("font-semibold", resColor)}>{res}</Badge></TableCell>
                                        <TableCell className="text-center font-mono font-semibold">{ev.goles_favor ?? 0} - {ev.goles_contra ?? 0}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody></Table>
                    </CardContent>
                </Card>

                {/* B — Reporte Deportivo */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4"/> Reporte Deportivo</CardTitle>
                        <CardDescription>Egresos con fondo deportivo</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0"><ExpandableTable groups={depGroups} color="text-red-600 dark:text-red-400"/></CardContent>
                </Card>

                {/* C — Ventas (solo local) */}
                {isHome && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4"/> Reporte de Ventas (Local)</CardTitle>
                            <CardDescription>Ingresos y egresos administrativos de la jornada</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                                <div>
                                    <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/20 border-b"><span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Ingresos</span></div>
                                    <ExpandableTable groups={admIncGroups} color="text-emerald-600 dark:text-emerald-400"/>
                                </div>
                                <div>
                                    <div className="px-5 py-2 bg-red-50 dark:bg-red-950/20 border-b"><span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Egresos</span></div>
                                    <ExpandableTable groups={admExpGroups} color="text-red-600 dark:text-red-400"/>
                                </div>
                            </div>
                            <div className="border-t px-5 py-3 bg-muted/10 flex justify-between items-center">
                                <span className="font-semibold text-sm">Resultado Neto Ventas</span>
                                <span className={cn("font-mono font-bold text-lg", netVentas >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtGs(netVentas)}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* D — Resumen General */}
                <Card className="border-2">
                    <CardHeader className="pb-3"><CardTitle className="text-base">Resumen General de la Jornada</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table><TableBody>
                            <TableRow><TableCell className="pl-5 font-medium">Total Egresos Deportivos</TableCell><TableCell className="text-right pr-5 font-mono font-semibold text-red-600">{fmtGs(totalDep)}</TableCell></TableRow>
                            {isHome && (<>
                                <TableRow><TableCell className="pl-5 font-medium">Ingresos Ventas (Local)</TableCell><TableCell className="text-right pr-5 font-mono font-semibold text-emerald-600">{fmtGs(totalAdmInc)}</TableCell></TableRow>
                                <TableRow><TableCell className="pl-5 font-medium">Egresos Ventas (Local)</TableCell><TableCell className="text-right pr-5 font-mono font-semibold text-red-600">{fmtGs(totalAdmExp)}</TableCell></TableRow>
                            </>)}
                            <TableRow className="bg-muted/10 border-t-2">
                                <TableCell className="pl-5 font-bold text-base">Resultado Neto Total</TableCell>
                                <TableCell className={cn("text-right pr-5 font-mono font-extrabold text-lg", netTotal >= 0 ? "text-emerald-600" : "text-red-600")}>{fmtGs(netTotal)}</TableCell>
                            </TableRow>
                        </TableBody></Table>
                    </CardContent>
                </Card>
            </>)}
        </div>
    );
}
