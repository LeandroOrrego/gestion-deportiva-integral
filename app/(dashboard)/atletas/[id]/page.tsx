import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAthleteProfile, getMovimientos } from "@/lib/queries/atletas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CuentaCorrienteAtleta } from "@/components/athletes/CuentaCorrienteAtleta";
import { notFound } from "next/navigation";

interface AthleteProfilePageProps {
    params: Promise<{ id: string }>;
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
    const { id } = await params;
    
    // Fetch athlete profile and movements in parallel
    const [atleta, movimientos] = await Promise.all([
        getAthleteProfile(id),
        getMovimientos(id)
    ]);

    if (!atleta) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            {/* Header section with back button and athlete info */}
            <div className="flex flex-col gap-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild 
                    className="w-fit -ml-2 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
                >
                    <Link href="/atletas">
                        <ChevronLeft className="mr-1.5 h-4 w-4" />
                        Volver al listado
                    </Link>
                </Button>
                
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-brand-primary">
                        {atleta.nombre_completo}
                    </h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="text-sm font-semibold bg-muted px-2.5 py-0.5 rounded-full border border-border/50">
                            ID: {atleta.documento || "N/A"}
                        </span>
                        {atleta.posicion && (
                            <>
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent/40" />
                                <span className="text-sm font-medium">{atleta.posicion}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Dynamic content area with standard Tabs */}
            <Tabs defaultValue="cuenta-corriente" className="flex-1 space-y-6">
                <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/50 p-1 text-muted-foreground w-full max-w-[420px] border shadow-sm">
                    <TabsTrigger 
                        value="resumen" 
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-8 py-2 text-sm font-bold ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-brand-primary data-[state=active]:shadow-md"
                    >
                        Resumen
                    </TabsTrigger>
                    <TabsTrigger 
                        value="cuenta-corriente"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-8 py-2 text-sm font-bold ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-brand-primary data-[state=active]:shadow-md"
                    >
                        Cuenta Corriente
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="resumen" className="mt-0 focus-visible:outline-none">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="p-8 rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl col-span-full md:col-span-2 border-border/60">
                            <h3 className="text-xl font-bold mb-6 text-foreground">Información General</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Estado Actual</p>
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-brand-success shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
                                        <p className="font-bold text-lg">{atleta.status.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Plantel / Categoría</p>
                                    <p className="font-bold text-lg text-brand-secondary">{atleta.categorias?.nombre || "General"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">ID Sistema</p>
                                    <p className="font-mono text-xs text-muted-foreground">{atleta.id}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8 rounded-3xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/10 to-transparent flex flex-col justify-center items-center text-center gap-4 group">
                             <div className="p-4 rounded-full bg-brand-primary/10 group-hover:bg-brand-primary/20 transition-colors">
                                <span className="text-2xl">📊</span>
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-bold text-brand-primary italic">Vista de Resumen en desarrollo</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed px-4">
                                    Próximamente verás estadísticas dinámicas, rendimiento por partido y evolución física.
                                </p>
                             </div>
                        </div>
                    </div>
                </TabsContent>
                
                <TabsContent value="cuenta-corriente" className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-2 duration-500">
                    <CuentaCorrienteAtleta 
                        atletaId={atleta.id} 
                        atletaNombre={atleta.nombre_completo}
                        movimientos={movimientos}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
