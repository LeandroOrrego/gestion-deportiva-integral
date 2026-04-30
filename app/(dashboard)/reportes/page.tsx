"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    getTransactions,
    getTransactionFormData,
    getTransactionStats,
    type TransactionFilter,
} from "@/lib/queries/transactions";
import { getSaldosPorCuenta } from "@/lib/queries/dashboard";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Currency } from "@/components/ui/currency";
import {
    CalendarDays, TrendingUp, TrendingDown, Wallet, BarChart3, Landmark,
    ArrowUpRight, ArrowDownRight, Loader2, Users, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function fmtGs(v: number) { return `₲ ${new Intl.NumberFormat("es-PY").format(Math.round(v))}`; }

type CatRow = { nombre: string; total: number; count: number };

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
    const { profile } = useAuth();
    const orgId = profile?.organization_id || "";

    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [eventos, setEventos] = useState<any[]>([]);

    useEffect(() => {
        if (!orgId) return;
        getTransactionFormData(orgId).then((fd) => {
            setAccounts(fd.accounts);
            setCategories(fd.categories);
            setEventos(fd.eventos || []);
        });
    }, [orgId]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Centro de Reportes</h2>
                <p className="text-muted-foreground">Análisis financiero por jornada y período.</p>
            </div>

            <Tabs defaultValue="jornada" className="w-full">
                <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-4">
                    <TabsTrigger value="jornada" className="gap-2">
                        <CalendarDays className="h-4 w-4" /> Jornada Deportiva
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2">
                        <BarChart3 className="h-4 w-4" /> Financiero General
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="jornada">
                    <JornadaTab orgId={orgId} eventos={eventos} />
                </TabsContent>
                <TabsContent value="general">
                    <GeneralTab orgId={orgId} accounts={accounts} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Jornada Deportiva
// ═══════════════════════════════════════════════════════════════════════════════
function JornadaTab({ orgId, eventos }: { orgId: string; eventos: any[] }) {
    const [eventoId, setEventoId] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!orgId || !eventoId || eventoId === "none") {
            setData([]);
            return;
        }
        setLoading(true);
        getTransactions(orgId, { evento_id: eventoId })
            .then(setData)
            .finally(() => setLoading(false));
    }, [orgId, eventoId]);

    const { totalIncome, totalExpense, incomeByCategory, expenseByCategory } = useMemo(() => {
        const confirmed = data.filter(t => t.status === "confirmed");
        const inc = confirmed.filter(t => t.flow === "income")
            .reduce((s, t) => s + Number(t.monto), 0);
        const exp = confirmed.filter(t => t.flow === "expense")
            .reduce((s, t) => s + Number(t.monto), 0);

        const buildMap = (flow: string): CatRow[] => {
            const map = new Map<string, CatRow>();
            confirmed.filter(t => t.flow === flow).forEach((t) => {
                const cat = t.transaction_types?.nombre || "Sin categoría";
                const prev = map.get(cat) || { nombre: cat, total: 0, count: 0 };
                prev.total += Number(t.monto);
                prev.count += 1;
                map.set(cat, prev);
            });
            return Array.from(map.values()).sort((a, b) => b.total - a.total);
        };

        return {
            totalIncome: inc,
            totalExpense: exp,
            incomeByCategory: buildMap("income"),
            expenseByCategory: buildMap("expense"),
        };
    }, [data]);

    return (
        <div className="space-y-5">
            {/* Filtro */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Seleccione la Jornada:</span>
                    </div>

                    <Select value={eventoId} onValueChange={setEventoId}>
                        <SelectTrigger className="w-[340px] h-9">
                            <SelectValue placeholder="Elegir jornada deportiva" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Seleccionar --</SelectItem>
                            {eventos.map(e => {
                                const fechaStr = new Date(e.fecha + 'T12:00:00').toLocaleDateString("es-PY");
                                return (
                                    <SelectItem key={e.id} value={e.id}>
                                        {fechaStr} - {e.tipo} vs {e.rival || "ND"} ({e.categorias?.nombre || "-"})
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Badge variant="secondary" className="ml-auto">
                        {data.length} transacciones
                    </Badge>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="Ingresos de la Jornada" value={totalIncome} icon={ArrowUpRight} color="green" />
                <KPICard label="Egresos de la Jornada" value={totalExpense} icon={ArrowDownRight} color="red" />
                <KPICard label="Resultado Neto" value={totalIncome - totalExpense} icon={Wallet} color="blue" />
            </div>

            {/* Desglose separado: Ingresos y Egresos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <CategoryBreakdownCard
                    title="Ingresos de la Jornada"
                    description="Entradas, Cantina, Auspicios, etc."
                    rows={incomeByCategory}
                    emptyText="Sin ingresos para esta jornada."
                    colorClass="text-emerald-600 dark:text-emerald-400"
                />
                <CategoryBreakdownCard
                    title="Egresos de la Jornada"
                    description="Árbitros, Viáticos, % Liga, etc."
                    rows={expenseByCategory}
                    emptyText="Sin egresos para esta jornada."
                    colorClass="text-red-600 dark:text-red-400"
                />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Financiero General
// ═══════════════════════════════════════════════════════════════════════════════
function GeneralTab({ orgId, accounts }: { orgId: string; accounts: any[] }) {
    const [startDate, setStartDate] = useState(firstOfMonth());
    const [endDate, setEndDate] = useState(todayISO());
    const [cuentaId, setCuentaId] = useState("all");
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [saldos, setSaldos] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        const filters: TransactionFilter = { startDate, endDate, cuenta_id: cuentaId };
        Promise.all([
            getTransactionStats(orgId, filters),
            getSaldosPorCuenta(orgId),
            getTransactions(orgId, filters),
        ]).then(([s, c, txns]) => {
            setStats(s);
            setSaldos(c);
            setRawData(txns);
        }).finally(() => setLoading(false));
    }, [orgId, startDate, endDate, cuentaId]);

    // Desglose por Plantel (categorias = plantel en el modelo)
    const byPlantel = useMemo(() => {
        const map = new Map<string, CatRow>();
        rawData.filter(t => t.status === "confirmed" && t.flow === "expense").forEach(t => {
            const plantel = t.categorias?.nombre || "Sin Plantel";
            const prev = map.get(plantel) || { nombre: plantel, total: 0, count: 0 };
            prev.total += Number(t.monto);
            prev.count += 1;
            map.set(plantel, prev);
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [rawData]);

    // Desglose por Categoría Financiera (transaction_types)
    const byCategoria = useMemo(() => {
        const map = new Map<string, CatRow>();
        rawData.filter(t => t.status === "confirmed" && t.flow === "expense").forEach(t => {
            const cat = t.transaction_types?.nombre || "Sin Categoría";
            const prev = map.get(cat) || { nombre: cat, total: 0, count: 0 };
            prev.total += Number(t.monto);
            prev.count += 1;
            map.set(cat, prev);
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [rawData]);

    return (
        <div className="space-y-5">
            {/* Filtros */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-5">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Desde</span>
                        <Input type="date" className="w-[160px] h-9" value={startDate}
                            onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Hasta</span>
                        <Input type="date" className="w-[160px] h-9" value={endDate}
                            onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Cuenta</span>
                        <Select value={cuentaId} onValueChange={setCuentaId}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las cuentas</SelectItem>
                                {accounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-end mb-2" />}
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="Ingresos" value={stats.income} icon={TrendingUp} color="green" />
                <KPICard label="Egresos" value={stats.expense} icon={TrendingDown} color="red" />
                <KPICard label="Saldo Período" value={stats.balance} icon={Wallet} color="blue" />
            </div>

            {/* Desgloses históricos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" /> Egresos por Plantel
                        </CardTitle>
                        <CardDescription>Distribución de gastos por categoría deportiva</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/20">
                                    <TableHead className="pl-6">Plantel</TableHead>
                                    <TableHead className="text-center">Operaciones</TableHead>
                                    <TableHead className="text-right pr-6">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {byPlantel.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                                            Sin datos en este período.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    byPlantel.map((row) => (
                                        <TableRow key={row.nombre}>
                                            <TableCell className="pl-6 font-medium">{row.nombre}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-mono">{row.count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-mono font-semibold text-red-600 dark:text-red-400">
                                                {fmtGs(row.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4" /> Egresos por Categoría Financiera
                        </CardTitle>
                        <CardDescription>Primas, Viáticos, Arbitraje, Auspicios, etc.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/20">
                                    <TableHead className="pl-6">Categoría</TableHead>
                                    <TableHead className="text-center">Operaciones</TableHead>
                                    <TableHead className="text-right pr-6">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {byCategoria.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                                            Sin datos en este período.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    byCategoria.map((row) => (
                                        <TableRow key={row.nombre}>
                                            <TableCell className="pl-6 font-medium">{row.nombre}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-mono">{row.count}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-mono font-semibold text-red-600 dark:text-red-400">
                                                {fmtGs(row.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Saldos actuales */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Landmark className="h-4 w-4" /> Saldos Actuales por Cuenta
                    </CardTitle>
                    <CardDescription>Balance acumulado real en cada caja/banco</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead className="pl-6">Cuenta</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right pr-6">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {saldos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                                        Sin cuentas activas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                saldos.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="pl-6 font-medium">{c.nombre}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">{c.tipo || "General"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {fmtGs(Number(c.saldo_inicial))}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared: Category Breakdown Card (reutilizable para ingresos y egresos)
// ═══════════════════════════════════════════════════════════════════════════════
function CategoryBreakdownCard({ title, description, rows, emptyText, colorClass }: {
    title: string; description: string; rows: CatRow[]; emptyText: string; colorClass: string;
}) {
    const total = rows.reduce((s, r) => s + r.total, 0);
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/20">
                            <TableHead className="pl-6">Categoría</TableHead>
                            <TableHead className="text-center">Ops.</TableHead>
                            <TableHead className="text-right pr-6">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                                    {emptyText}
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {rows.map((cat) => (
                                    <TableRow key={cat.nombre}>
                                        <TableCell className="pl-6 font-medium">{cat.nombre}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">{cat.count}</Badge>
                                        </TableCell>
                                        <TableCell className={cn("text-right pr-6 font-mono font-semibold", colorClass)}>
                                            {fmtGs(cat.total)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/10 border-t-2">
                                    <TableCell className="pl-6 font-bold">TOTAL</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-mono">{rows.reduce((s, r) => s + r.count, 0)}</Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right pr-6 font-mono font-bold", colorClass)}>
                                        {fmtGs(total)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared KPI Card
// ═══════════════════════════════════════════════════════════════════════════════
function KPICard({ label, value, icon: Icon, color }: {
    label: string; value: number; icon: React.ElementType; color: "green" | "red" | "blue";
}) {
    const styles = {
        green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-200 dark:border-emerald-800" },
        red: { bg: "bg-red-50 dark:bg-red-950/30", icon: "text-red-600", text: "text-red-600 dark:text-red-400", ring: "border-red-200 dark:border-red-800" },
        blue: { bg: "bg-blue-50 dark:bg-blue-950/30", icon: "text-blue-600", text: "text-blue-600 dark:text-blue-400", ring: "border-blue-200 dark:border-blue-800" },
    }[color];

    return (
        <Card className={cn("border", styles.ring)}>
            <CardContent className={cn("flex items-center justify-between p-5", styles.bg)}>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className={cn("text-2xl font-extrabold tabular-nums", styles.text)}>{fmtGs(Math.abs(value))}</p>
                </div>
                <div className={cn("h-11 w-11 rounded-full flex items-center justify-center bg-white/60 dark:bg-black/20", styles.icon)}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}
