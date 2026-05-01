"use client";
import { useEffect, useState, useMemo } from "react";
import { getTransactions, getTransactionFormData, getTransactionStats, type TransactionFilter } from "@/lib/queries/transactions";
import { getSaldosPorCuenta, getSaldoInicialCuentas } from "@/lib/queries/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Wallet, Landmark, Users, Tag, Loader2, ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayLocal, firstOfMonthLocal } from "@/lib/utils/date";

function fmtGs(v: number) { return `Gs. ${new Intl.NumberFormat("es-PY").format(Math.round(v))}`; }

const EXCLUDED_TYPES = new Set(['Movimiento/Caja', 'Transferencias']);

type CatRow = { nombre: string; total: number; count: number; items: { desc: string; monto: number }[] };

function buildMap(txns: any[], flow: string): CatRow[] {
    const map = new Map<string, CatRow>();
    txns.filter(t =>
        t.status === "confirmed" &&
        t.flow === flow &&
        !t.es_transferencia &&
        !EXCLUDED_TYPES.has(t.transaction_types?.nombre)
    ).forEach(t => {
        const cat = t.transaction_types?.nombre || "Sin categoría";
        if (!map.has(cat)) map.set(cat, { nombre: cat, total: 0, count: 0, items: [] });
        const g = map.get(cat)!;
        g.total += Number(t.monto); g.count += 1;
        g.items.push({ desc: t.entidades?.nombre || t.descripcion || "-", monto: Number(t.monto) });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function ExpandableGroupTable({ groups, color, emptyText }: { groups: CatRow[]; color: string; emptyText: string }) {
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
                    <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">{emptyText}</TableCell></TableRow>
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

function KPICard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: "green"|"red"|"blue" }) {
    const s = { green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-200 dark:border-emerald-800" }, red: { bg: "bg-red-50 dark:bg-red-950/30", icon: "text-red-600", text: "text-red-600 dark:text-red-400", ring: "border-red-200 dark:border-red-800" }, blue: { bg: "bg-blue-50 dark:bg-blue-950/30", icon: "text-blue-600", text: "text-blue-600 dark:text-blue-400", ring: "border-blue-200 dark:border-blue-800" } }[color];
    return (
        <Card className={cn("border", s.ring)}>
            <CardContent className={cn("flex items-center justify-between p-5", s.bg)}>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className={cn("text-2xl font-extrabold tabular-nums", s.text)}>{fmtGs(Math.abs(value))}</p>
                </div>
                <div className={cn("h-11 w-11 rounded-full flex items-center justify-center bg-white/60 dark:bg-black/20", s.icon)}><Icon className="h-5 w-5"/></div>
            </CardContent>
        </Card>
    );
}

export default function GeneralTab({ orgId }: { orgId: string }) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [temporada, setTemporada] = useState("todas");
    const [startDate, setStartDate] = useState(firstOfMonthLocal());
    const [endDate, setEndDate] = useState(todayLocal());
    const [cuentaId, setCuentaId] = useState("all");
    const [fondoFilter, setFondoFilter] = useState("all");
    const [plantelFilter, setPlantelFilter] = useState("all");
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [saldoInicial, setSaldoInicial] = useState(0);
    const [saldos, setSaldos] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        getTransactionFormData(orgId).then(fd => { setAccounts(fd.accounts); setCategories(fd.categories); });
    }, [orgId]);

    // Auto-set date range when temporada changes
    useEffect(() => {
        if (temporada === '2025') {
            setStartDate('2025-01-01');
            setEndDate('2026-01-31');
        } else if (temporada === '2026') {
            setStartDate('2026-02-01');
            setEndDate(todayLocal());
        }
    }, [temporada]);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        const filters: TransactionFilter = {
            startDate,
            endDate,
            cuenta_id: cuentaId,
            fondo: fondoFilter as any,
            ...(temporada !== 'todas' && { temporada }),
        };
        Promise.all([
            getTransactionStats(orgId, filters),
            getSaldosPorCuenta(orgId),
            getTransactions(orgId, filters),
            temporada === '2026' ? getSaldoInicialCuentas(orgId) : Promise.resolve(0),
        ]).then(([s, c, txns, saldoIni]) => {
            setStats(s);
            setSaldos(c);
            setRawData(txns);
            setSaldoInicial(saldoIni);
        }).finally(() => setLoading(false));
    }, [orgId, startDate, endDate, cuentaId, fondoFilter, temporada]);

    const filtered = useMemo(() => {
        let d = rawData.filter(t => !t.es_transferencia && !EXCLUDED_TYPES.has(t.transaction_types?.nombre));
        if (plantelFilter !== "all") d = d.filter(t => t.categorias?.nombre === plantelFilter);
        return d;
    }, [rawData, plantelFilter]);

    const expenseGroups = useMemo(() => buildMap(filtered, "expense"), [filtered]);
    const incomeGroups = useMemo(() => buildMap(filtered, "income"), [filtered]);

    const byPlantel = useMemo(() => {
        const map = new Map<string, CatRow>();
        filtered.filter(t => t.status === "confirmed" && t.flow === "expense").forEach(t => {
            const p = t.categorias?.nombre || "Sin Plantel";
            if (!map.has(p)) map.set(p, { nombre: p, total: 0, count: 0, items: [] });
            const g = map.get(p)!; g.total += Number(t.monto); g.count += 1;
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [filtered]);

    const plantelNames = useMemo(() => {
        const s = new Set<string>();
        rawData.forEach(t => { if (t.categorias?.nombre) s.add(t.categorias.nombre); });
        return Array.from(s).sort();
    }, [rawData]);

    return (
        <div className="space-y-5">
            <Card><CardContent className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-5 flex-wrap">
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Temporada</span>
                    <Select value={temporada} onValueChange={setTemporada}><SelectTrigger className="w-[130px] h-9"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Desde</span>
                    <Input type="date" className="w-[160px] h-9" value={startDate} onChange={e => setStartDate(e.target.value)}/></div>
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Hasta</span>
                    <Input type="date" className="w-[160px] h-9" value={endDate} onChange={e => setEndDate(e.target.value)}/></div>
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Fondo</span>
                    <Select value={fondoFilter} onValueChange={setFondoFilter}><SelectTrigger className="w-[160px] h-9"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="deportivo">Deportivo</SelectItem><SelectItem value="administrativo">Administrativo</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Cuenta</span>
                    <Select value={cuentaId} onValueChange={setCuentaId}><SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Todas"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas</SelectItem>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><span className="text-xs font-semibold uppercase text-muted-foreground">Plantel</span>
                    <Select value={plantelFilter} onValueChange={setPlantelFilter}><SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Todos"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos</SelectItem>{plantelNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-end mb-2"/>}
            </CardContent></Card>

            {temporada === '2026' && (
                <Card className="border border-blue-200 dark:border-blue-800">
                    <CardContent className="flex items-center justify-between p-5 bg-blue-50 dark:bg-blue-950/30">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo Inicial (remanente 2025)</p>
                            <p className="text-2xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400">{fmtGs(saldoInicial)}</p>
                        </div>
                        <div className="h-11 w-11 rounded-full flex items-center justify-center bg-white/60 dark:bg-black/20 text-blue-600">
                            <CalendarDays className="h-5 w-5"/>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="Total Ingresos" value={stats.income} icon={TrendingUp} color="green"/>
                <KPICard label="Total Egresos" value={stats.expense} icon={TrendingDown} color="red"/>
                <KPICard label="Saldo del Período" value={stats.balance} icon={Wallet} color="blue"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4"/> Egresos por Categoría</CardTitle>
                    <CardDescription>Agrupado por tipo financiero con detalle expandible</CardDescription></CardHeader>
                    <CardContent className="p-0"><ExpandableGroupTable groups={expenseGroups} color="text-red-600 dark:text-red-400" emptyText="Sin egresos."/></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4"/> Egresos por Plantel</CardTitle>
                    <CardDescription>Distribución por categoría deportiva</CardDescription></CardHeader>
                    <CardContent className="p-0">
                        <Table><TableHeader><TableRow className="bg-muted/20">
                            <TableHead className="pl-5">Plantel</TableHead><TableHead className="text-center">Ops.</TableHead><TableHead className="text-right pr-5">Total</TableHead>
                        </TableRow></TableHeader><TableBody>
                            {byPlantel.length === 0 ? <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Sin datos.</TableCell></TableRow>
                            : byPlantel.map(r => <TableRow key={r.nombre}><TableCell className="pl-5 font-medium">{r.nombre}</TableCell>
                                <TableCell className="text-center"><Badge variant="secondary" className="font-mono">{r.count}</Badge></TableCell>
                                <TableCell className="text-right pr-5 font-mono font-semibold text-red-600 dark:text-red-400">{fmtGs(r.total)}</TableCell></TableRow>)}
                        </TableBody></Table>
                    </CardContent></Card>
            </div>

            <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4"/> Saldos Actuales por Cuenta</CardTitle>
                <CardDescription>Balance acumulado real en cada caja/banco</CardDescription></CardHeader>
                <CardContent className="p-0"><Table><TableHeader><TableRow className="bg-muted/20">
                    <TableHead className="pl-5">Cuenta</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right pr-5">Saldo</TableHead>
                </TableRow></TableHeader><TableBody>
                    {saldos.length === 0 ? <TableRow><TableCell colSpan={3} className="h-16 text-center text-muted-foreground">Sin cuentas.</TableCell></TableRow>
                    : saldos.map(c => <TableRow key={c.id}><TableCell className="pl-5 font-medium">{c.nombre}</TableCell>
                        <TableCell><Badge variant="outline">{c.tipo || "General"}</Badge></TableCell>
                        <TableCell className="text-right pr-5 font-mono font-bold text-blue-600 dark:text-blue-400">{fmtGs(Number(c.saldo_inicial))}</TableCell></TableRow>)}
                </TableBody></Table></CardContent></Card>
        </div>
    );
}
