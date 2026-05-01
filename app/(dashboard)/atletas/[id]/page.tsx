import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, User, CreditCard, LayoutDashboard, Building } from "lucide-react";

import { getAthleteProfile, getMovimientos } from "@/lib/queries/atletas";
import { getTransactionFormData } from "@/lib/queries/transactions";
import { CuentaCorrienteAtleta } from "@/components/athletes/CuentaCorrienteAtleta";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// 1. SOLUCIÓN AL ERROR UNDEFINED: Forzamos que params sea una Promesa
interface AthleteProfilePageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
    // Esperamos la resolución de la URL
    const resolvedParams = await params;

    // Ahora sí le pasamos el ID real
    const athlete = await getAthleteProfile(resolvedParams.id);

    if (!athlete) {
        notFound();
    }

    const movimientos = await getMovimientos(athlete.id);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let accounts: any[] = [];
    let transactionTypes: any[] = [];
    let eventos: any[] = [];
    
    if (user) {
        const { data: perfil } = await supabase.from("perfiles").select("organization_id").eq("id", user.id).single();
        if (perfil?.organization_id) {
            const formData = await getTransactionFormData(perfil.organization_id);
            accounts = formData.accounts;
            transactionTypes = formData.types;
            eventos = formData.eventos;
        }
    }

    return (
        <div className="flex flex-col gap-6 max-w-screen-xl mx-auto pb-10">
            {/* ── Breadcrumbs & Actions ────────────────────────────── */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2 text-muted-foreground hover:text-foreground">
                    <Link href="/atletas">
                        <ChevronLeft className="h-4 w-4" />
                        Volver al plantel
                    </Link>
                </Button>
            </div>

            {/* ── Header / Identity ────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 shrink-0">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {athlete.nombre_completo}
                            </h1>
                            <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] uppercase font-bold tracking-wider">
                                {athlete.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                            <span className="font-mono">{athlete.documento || "Sin CI"}</span>
                            <span className="text-border">|</span>
                            <span>{athlete.categorias?.nombre || "Sin plantel"}</span>
                            <span className="text-border">|</span>
                            <span>{athlete.posicion || "Sin posición"}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Tabs Content ─────────────────────────────────────── */}
            <Tabs defaultValue="cuenta-corriente" className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-4">
                    <TabsTrigger value="resumen" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Resumen
                    </TabsTrigger>
                    <TabsTrigger value="cuenta-corriente" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cuenta Corriente
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB: RESUMEN --- */}
                <TabsContent value="resumen" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Columna Izquierda: Datos Personales y Bancarios */}
                        <div className="md:col-span-1 space-y-6">
                            {/* Basic Info Card */}
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold">Datos Personales</CardTitle>
                                    <CardDescription>Información en el sistema</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nombre Completo</p>
                                        <p className="text-sm font-medium">{athlete.nombre_completo}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cédula de Identidad</p>
                                        <p className="text-sm font-mono">{athlete.documento || "No especificado"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Plantel / Categoría</p>
                                        <p className="text-sm font-medium">{athlete.categorias?.nombre || "Sin asignar"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Posición en campo</p>
                                        <p className="text-sm font-medium">{athlete.posicion || "Sin especificar"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* NUEVO: Bank Details Card */}
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Building className="h-4 w-4" /> Datos Bancarios
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    {/* Usamos 'any' temporalmente por si TypeScript aún no conoce las columnas nuevas */}
                                    {athlete.banco ? (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Banco</p>
                                                <p className="text-sm font-medium">{athlete.banco}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cuenta ({athlete.tipo_cuenta || 'N/A'})</p>
                                                <p className="text-sm font-mono">{athlete.numero_cuenta}</p>
                                            </div>
                                            {athlete.alias && (
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Alias</p>
                                                    <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{athlete.alias}</p>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Titular</p>
                                                <p className="text-sm font-medium">{athlete.titular_cuenta}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Doc. Titular</p>
                                                <p className="text-sm font-mono">{athlete.documento_titular}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic py-2 text-center border-t pt-4">
                                            Sin datos bancarios registrados.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Columna Derecha: Acuerdo Financiero */}
                        <Card className="md:col-span-2 border-border/60 shadow-sm overflow-hidden h-fit">
                            <CardHeader className="pb-3 bg-muted/20 border-b">
                                <CardTitle className="text-base font-semibold">Acuerdo Financiero (2026)</CardTitle>
                                <CardDescription>Condiciones vigentes para la temporada actual</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {athlete.acuerdo_2026 ? (
                                    <div className="divide-y">
                                        <div className="grid grid-cols-2 gap-px bg-border/40">
                                            <div className="bg-card p-4">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Costo Pase / Prima</p>
                                                <p className="text-sm font-semibold">Gs. {new Intl.NumberFormat("es-PY").format(athlete.acuerdo_2026.costo_pase)}</p>
                                            </div>
                                            <div className="bg-card p-4">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Viático por Partido</p>
                                                <p className="text-sm font-semibold text-primary">Gs. {new Intl.NumberFormat("es-PY").format(athlete.acuerdo_2026.viatico_partido)}</p>
                                            </div>
                                            <div className="bg-card p-4">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Premio Victoria</p>
                                                <p className="text-sm font-semibold text-emerald-600">Gs. {new Intl.NumberFormat("es-PY").format(athlete.acuerdo_2026.premio_victoria)}</p>
                                            </div>
                                            <div className="bg-card p-4">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Premio Empate</p>
                                                <p className="text-sm font-semibold text-amber-600">Gs. {new Intl.NumberFormat("es-PY").format(athlete.acuerdo_2026.premio_empate)}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-muted/5">
                                            <p className="text-xs text-muted-foreground">
                                                Este acuerdo es válido desde el <span className="font-medium text-foreground">{new Date(athlete.acuerdo_2026.vigente_desde).toLocaleDateString()}</span>.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center flex flex-col items-center gap-2">
                                        <p className="text-sm text-muted-foreground italic">No hay un contrato vigente registrado para el 2026.</p>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/atletas">Ir a registrar contrato</Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TAB: CUENTA CORRIENTE --- */}
                <TabsContent value="cuenta-corriente">
                    <CuentaCorrienteAtleta
                        atletaId={athlete.id}
                        atletaNombre={athlete.nombre_completo}
                        atletaEntidadId={athlete.entidad_id}
                        atletaCategoryId={athlete.category_id}
                        atletaCategoryName={athlete.categorias?.nombre}
                        movimientos={movimientos}
                        accounts={accounts}
                        transactionTypes={transactionTypes}
                        eventos={eventos}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}