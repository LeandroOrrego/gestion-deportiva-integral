import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Currency } from '@/components/ui/currency';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowRight, ArrowUp, Clock, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLocalDate } from '@/lib/utils/date';
import {
    getResumenFinanciero,
    getResumenMensual,
    getSaldosPorCuenta,
    getPresupuestosPorCategoria,
    getUltimasTransacciones
} from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Obtener usuario y organización
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null; // Middleware handles redirect

    const { data: profile } = await supabase
        .from('perfiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) return <div className="p-8">Error: Usuario sin organización asignada.</div>;

    const orgId = profile.organization_id;
    const today = getLocalDate();

    // 2. Fetch Data (Parallel)
    const [
        kpis,
        chartData,
        cuentas,
        presupuestos,
        recentTransactions
    ] = await Promise.all([
        getResumenFinanciero(orgId, today.getMonth() + 1, today.getFullYear()),
        getResumenMensual(orgId),
        getSaldosPorCuenta(orgId),
        getPresupuestosPorCategoria(orgId, today.getFullYear().toString()),
        getUltimasTransacciones(orgId)
    ]);

    // Calcular totales para KPIs del mes
    // (Ya vienen calculados en getResumenFinanciero)

    return (
        <div className="flex flex-col space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-display text-brand-primary">Dashboard General</h1>
                    <p className="text-muted-foreground">Resumen ejecutivo del Club.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground capitalize">
                        {today.toLocaleString('es-PY', { month: 'long', year: 'numeric', timeZone: 'America/Asuncion' })}
                    </span>
                </div>
            </div>

            {/* SECCIÓN A: KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Ingresos del Mes"
                    value={<Currency amount={kpis.ingresos_mes} size="2xl" color="income" />}
                    icon={ArrowUp}
                    trend="up"
                />
                <KPICard
                    title="Egresos del Mes"
                    value={<Currency amount={kpis.egresos_mes} size="2xl" color="expense" />}
                    icon={ArrowDown}
                    trend="down"
                />
                <KPICard
                    title="Saldo Acumulado"
                    value={<Currency amount={kpis.saldo_acumulado} size="2xl" color={kpis.saldo_acumulado >= 0 ? "income" : "expense"} />}
                    icon={Wallet}
                    subtext="Disponible global"
                />
                <KPICard
                    title="Pagos Pendientes"
                    value={<Currency amount={kpis.total_pendientes} size="2xl" color="warning" />}
                    icon={Clock}
                    subtext={`${kpis.cantidad_pendientes} transacciones pendientes`}
                    className={kpis.cantidad_pendientes > 0 ? "border-brand-warning animate-pulse-border" : ""}
                />
            </div>

            {/* SECCIÓN B: Gráfico + Saldos por Cuenta */}
            <div className="grid gap-4 md:grid-cols-7">
                {/* Gráfico (60% -> col-span-4) */}
                <Card className="md:col-span-4">
                    <CardHeader>
                        <CardTitle>Resumen Financiero</CardTitle>
                        <CardDescription>Últimos 6 meses</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart data={chartData} />
                    </CardContent>
                </Card>

                {/* Saldos por Cuenta (40% -> col-span-3) */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Saldos por Cuenta</CardTitle>
                        <CardDescription>Estado actual de cajas y bancos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {cuentas.map((cuenta) => (
                                    <div 
                                        key={cuenta.id} 
                                        className="flex flex-col p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-bold leading-none truncate">{cuenta.nombre}</p>
                                            <Badge variant="outline" className="text-[10px] uppercase font-semibold h-4 px-1 shrink-0">
                                                {cuenta.tipo === 'bank' ? 'Banco' : cuenta.tipo === 'mobile_wallet' ? 'Billetera' : 'Efectivo'}
                                            </Badge>
                                        </div>
                                        <div className="text-right">
                                            <Currency 
                                                amount={cuenta.saldo_calculado} 
                                                size="md" 
                                                color={cuenta.saldo_calculado > 0 ? "income" : cuenta.saldo_calculado < 0 ? "expense" : "default"}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {cuentas.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-8 col-span-full">
                                        No hay cuentas con saldo positivo.
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* SECCIÓN C: Presupuestos */}
            {presupuestos.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {presupuestos.map((p) => {
                        const progressColor = p.porcentaje > 90 ? "bg-red-500" : p.porcentaje > 70 ? "bg-yellow-500" : "bg-green-500";
                        return (
                            <Card key={p.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Presupuesto {p.nombre_categoria}
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground">{p.temporada}</span>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        <Currency amount={p.monto_total} size="xl" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Total Asignado
                                    </p>
                                    <Progress value={p.porcentaje} className="h-2" indicatorClassName={progressColor} />
                                    <div className="mt-2 flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Gastado: <Currency amount={p.gastado} size="sm" className="text-foreground" />
                                        </span>
                                        <span className={p.disponible < 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                                            Disp: <Currency amount={p.disponible} size="sm" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* SECCIÓN D: Últimas Transacciones */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Últimos Movimientos</CardTitle>
                        <CardDescription>Transacciones recientes registradas</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/transacciones">
                            Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentTransactions.length > 0 ? (
                        <div className="space-y-4">
                            {/* Desktop Table Header */}
                            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                                <div className="col-span-2">Fecha</div>
                                <div className="col-span-4">Razón / Entidad</div>
                                <div className="col-span-2">Categoría</div>
                                <div className="col-span-2 text-right">Monto</div>
                                <div className="col-span-2 text-center">Estado</div>
                            </div>

                            {/* Rows */}
                            {recentTransactions.map((t: any) => {
                                // Relationships might come as Array or Object depending on cardinality
                                const ent = Array.isArray(t.entidades) ? t.entidades[0] : t.entidades;
                                const atl = Array.isArray(t.atletas) ? t.atletas[0] : t.atletas;
                                const tipo = Array.isArray(t.transaction_types) ? t.transaction_types[0] : t.transaction_types;
                                const cat = Array.isArray(t.categorias) ? t.categorias[0] : t.categorias;

                                const entidad = ent?.nombre;
                                const atleta = atl?.nombre_completo;
                                const razon = tipo?.nombre || t.descripcion;
                                const mainLabel = entidad || atleta || razon;
                                const subLabel = (entidad || atleta) ? razon : t.descripcion;

                                return (
                                    <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center border-b last:border-0 pb-4 md:pb-2 pt-2 text-sm">
                                        {/* Mobile: Header Row */}
                                        <div className="flex justify-between md:hidden w-full font-medium">
                                            <span>{new Date(t.fecha).toLocaleDateString('es-PY')}</span>
                                            <Currency amount={t.monto} color={t.flow === 'income' ? 'income' : 'expense'} />
                                        </div>

                                        {/* Desktop: Fecha */}
                                        <div className="hidden md:block col-span-2 text-muted-foreground">
                                            {new Date(t.fecha).toLocaleDateString('es-PY')}
                                        </div>

                                        {/* Razón / Entidad */}
                                        <div className="col-span-12 md:col-span-4">
                                            <div className="font-medium">{mainLabel}</div>
                                            {subLabel && subLabel !== mainLabel && (
                                                <div className="text-xs text-muted-foreground truncate">{subLabel}</div>
                                            )}
                                        </div>

                                        {/* Categoría / Tipo */}
                                        <div className="col-span-6 md:col-span-2 text-xs md:text-sm text-muted-foreground">
                                            {cat?.nombre || '-'}
                                        </div>

                                        {/* Desktop: Monto */}
                                        <div className="hidden md:block col-span-2 text-right font-medium">
                                            <Currency amount={t.monto} color={t.flow === 'income' ? 'income' : 'expense'} />
                                        </div>

                                        {/* Estado */}
                                        <div className="col-span-6 md:col-span-2 flex justify-end md:justify-center">
                                            <StatusBadge status={t.status} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="bg-muted/50 p-4 rounded-full">
                                <CreditCard className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium text-lg">Aún no hay transacciones</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                    Registra tus primeros ingresos o egresos para ver el resumen aquí.
                                </p>
                            </div>
                            <Button asChild>
                                <Link href="/transacciones">
                                    Registrar primera transacción
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
