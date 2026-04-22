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
    ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function fmtGs(v: number) { return `₲ ${new Intl.NumberFormat("es-PY").format(Math.round(v))}`; }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
    const { profile } = useAuth();
    const orgId = profile?.organization_id || "";

    // Shared form data (accounts, categories)
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (!orgId) return;
        getTransactionFormData(orgId).then((fd) => {
            setAccounts(fd.accounts);
            setCategories(fd.categories);
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
                    <JornadaTab orgId={orgId} categories={categories} />
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
function JornadaTab({ orgId, categories }: { orgId: string; categories: any[] }) {
    const [fecha, setFecha] = useState(todayISO());
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!orgId || !fecha) return;
        setLoading(true);
        getTransactions(orgId, { startDate: fecha, endDate: fecha })
            .then(setData)
            .finally(() => setLoading(false));
    }, [orgId, fecha]);

    const { totalIncome, totalExpense, byCategory } = useMemo(() => {
        const inc = data.filter(t => t.flow === "income" && t.status === "confirmed")
            .reduce((s, t) => s + Number(t.monto), 0);
        const exp = data.filter(t => t.flow === "expense" && t.status === "confirmed")
            .reduce((s, t) => s + Number(t.monto), 0);

        const map = new Map<string, { nombre: string; total: number; count: number }>();
        data.filter(t => t.status === "confirmed").forEach((t) => {
            const cat = t.transaction_types?.nombre || "Sin categoría";
            const prev = map.get(cat) || { nombre: cat, total: 0, count: 0 };
            prev.total += Number(t.monto);
            prev.count += 1;
            map.set(cat, prev);
        });

        return {
            totalIncome: inc,
            totalExpense: exp,
            byCategory: Array.from(map.values()).sort((a, b) => b.total - a.total),
        };
    }, [data]);

    return (
        <div className="space-y-5">
            {/* Filtro */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Fecha de Jornada:</span>
                    </div>
                    <Input
                        type="date"
                        className="w-[180px] h-9"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                    />
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Badge variant="secondary" className="ml-auto">
                        {data.length} transacciones
                    </Badge>
                </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="Ingresos del Día" value={totalIncome} icon={ArrowUpRight} color="green" />
                <KPICard label="Egresos del Día" value={totalExpense} icon={ArrowDownRight} color="red" />
                <KPICard label="Resultado Neto" value={totalIncome - totalExpense} icon={Wallet} color="blue" />
            </div>

            {/* Desglose por categoría */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Desglose por Categoría Financiera</CardTitle>
                    <CardDescription>Agrupación automática de todas las transacciones del día</CardDescription>
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
                            {byCategory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        Sin transacciones para esta fecha.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                byCategory.map((cat) => (
                                    <TableRow key={cat.nombre}>
                                        <TableCell className="pl-6 font-medium">{cat.nombre}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">{cat.count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-mono font-semibold">
                                            {fmtGs(cat.total)}
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
// TAB 2 — Financiero General
// ═══════════════════════════════════════════════════════════════════════════════
function GeneralTab({ orgId, accounts }: { orgId: string; accounts: any[] }) {
    const [startDate, setStartDate] = useState(firstOfMonth());
    const [endDate, setEndDate] = useState(todayISO());
    const [cuentaId, setCuentaId] = useState("all");
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [saldos, setSaldos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!orgId) return;
        setLoading(true);
        const filters: TransactionFilter = { startDate, endDate, cuenta_id: cuentaId };
        Promise.all([
            getTransactionStats(orgId, filters),
            getSaldosPorCuenta(orgId),
        ]).then(([s, c]) => {
            setStats(s);
            setSaldos(c);
        }).finally(() => setLoading(false));
    }, [orgId, startDate, endDate, cuentaId]);

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
