"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { 
    getPlanteles, 
    getConvocables, 
    generarPremiosMasivos,
    Plantel,
    Convocable
} from "@/lib/queries/premios";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Users, Trophy } from "lucide-react";

export default function GeneradorPremios() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    // Config states
    const [planteles, setPlanteles] = useState<Plantel[]>([]);
    const [plantelId, setPlantelId] = useState<string>("");
    const [resultado, setResultado] = useState<string>("Victoria");
    const [concepto, setConcepto] = useState<string>("");
    const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0]);
    
    // Players states
    const [jugadores, setJugadores] = useState<Convocable[]>([]);
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [loadingJugadores, setLoadingJugadores] = useState(false);

    // Initial load
    useEffect(() => {
        getPlanteles().then(setPlanteles);
    }, []);

    // Load players when plantel changes
    useEffect(() => {
        if (!plantelId) {
            setJugadores([]);
            setSeleccionados(new Set());
            return;
        }

        setLoadingJugadores(true);
        getConvocables(plantelId)
            .then(data => {
                setJugadores(data);
                // Reset selection
                setSeleccionados(new Set());
            })
            .catch(err => {
                console.error(err);
                toast({ title: "Error", description: "No se pudieron cargar los jugadores.", variant: "destructive" });
            })
            .finally(() => setLoadingJugadores(false));
    }, [plantelId, toast]);

    // Derived logic: calculate prize for each player
    const jugadoresConPremios = useMemo(() => {
        return jugadores.map(j => {
            let monto = 0;
            const tieneContrato = !!j.acuerdo;

            if (tieneContrato && j.acuerdo) {
                if (j.acuerdo.es_premio_fijo) {
                    monto = j.acuerdo.premio_fijo_resultado;
                } else {
                    if (resultado === "Victoria") monto = j.acuerdo.premio_victoria;
                    else if (resultado === "Empate") monto = j.acuerdo.premio_empate;
                    else if (resultado === "Derrota") monto = j.acuerdo.premio_derrota;
                }
            }

            return { ...j, monto, tieneContrato };
        });
    }, [jugadores, resultado]);

    const totalPagar = useMemo(() => {
        return jugadoresConPremios
            .filter(j => seleccionados.has(j.id))
            .reduce((acc, j) => acc + j.monto, 0);
    }, [jugadoresConPremios, seleccionados]);

    const toggleSeleccion = (id: string) => {
        const next = new Set(seleccionados);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSeleccionados(next);
    };

    const toggleTodos = (checked: boolean) => {
        if (checked) {
            const allIds = jugadoresConPremios
                .filter(j => j.tieneContrato)
                .map(j => j.id);
            setSeleccionados(new Set(allIds));
        } else {
            setSeleccionados(new Set());
        }
    };

    const handleGenerar = () => {
        if (!concepto.trim()) {
            toast({ title: "Error", description: "El concepto es obligatorio.", variant: "destructive" });
            return;
        }
        if (seleccionados.size === 0) {
            toast({ title: "Error", description: "Seleccion\u00e1 al menos un jugador.", variant: "destructive" });
            return;
        }

        const payload = jugadoresConPremios
            .filter(j => seleccionados.has(j.id))
            .map(j => ({
                atleta_id: j.id,
                fecha,
                concepto,
                monto: j.monto
            }));

        startTransition(async () => {
            const res = await generarPremiosMasivos(payload);
            if (res.error) {
                toast({ title: "Error", description: res.error, variant: "destructive" });
            } else {
                toast({ title: "\u00c9xito", description: "Premios generados correctamente." });
                setSeleccionados(new Set());
                setConcepto("");
            }
        });
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="grid gap-6 md:grid-cols-3">
                {/* Configuration Card */}
                <Card className="col-span-full border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-brand-primary">
                            <Trophy className="h-6 w-6" />
                            Configuraci\u00f3n del Partido
                        </CardTitle>
                        <CardDescription>
                            Defin\u00ed el plantel, resultado y concepto para calcular premios autom\u00e1ticamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Plantel (Categor\u00eda)</Label>
                            <Select value={plantelId} onValueChange={setPlantelId}>
                                <SelectTrigger className="bg-white/50 backdrop-blur-sm">
                                    <SelectValue placeholder="Seleccion\u00e1..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {planteles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Resultado</Label>
                            <Select value={resultado} onValueChange={setResultado}>
                                <SelectTrigger className="bg-white/50 backdrop-blur-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Victoria">Victoria (Gan\u00f3)</SelectItem>
                                    <SelectItem value="Empate">Empate</SelectItem>
                                    <SelectItem value="Derrota">Derrota (Perdi\u00f3)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-1">
                            <Label>Fecha</Label>
                            <Input 
                                type="date" 
                                value={fecha} 
                                onChange={e => setFecha(e.target.value)}
                                className="bg-white/50 backdrop-blur-sm"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-1">
                            <Label>Concepto</Label>
                            <Input 
                                placeholder="Ej: Premio vs Olimpia"
                                value={concepto}
                                onChange={e => setConcepto(e.target.value)}
                                className="bg-white/50 backdrop-blur-sm"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Players Table Card */}
            <Card className="border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-brand-primary" />
                            Convocatoria y C\u00e1lculo de Premios
                        </CardTitle>
                        <Badge variant="outline" className="bg-white/80">
                            {seleccionados.size} seleccionados
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingJugadores ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
                            <p className="text-sm font-medium">Buscando jugadores del plantel...</p>
                        </div>
                    ) : jugadores.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground border-b italic">
                            {plantelId ? "No hay jugadores registrados en este plantel." : "Seleccion\u00e1 un plantel para ver la lista."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow>
                                    <TableHead className="w-[50px] pl-6">
                                        <Checkbox 
                                            checked={seleccionados.size === jugadoresConPremios.filter(j => j.tieneContrato).length && jugadoresConPremios.length > 0}
                                            onCheckedChange={toggleTodos}
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold">Jugador</TableHead>
                                    <TableHead className="font-bold">Tipo de Contrato</TableHead>
                                    <TableHead className="font-bold text-right pr-6">Monto a Cobrar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jugadoresConPremios.map(j => (
                                    <TableRow key={j.id} className="group hover:bg-muted/10 transition-colors">
                                        <TableCell className="pl-6">
                                            <Checkbox 
                                                checked={seleccionados.has(j.id)}
                                                onCheckedChange={() => toggleSeleccion(j.id)}
                                                disabled={!j.tieneContrato}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {j.nombre_completo}
                                        </TableCell>
                                        <TableCell>
                                            {!j.tieneContrato ? (
                                                <Badge variant="destructive" className="font-bold">SIN CONTRATO</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                                                    {j.acuerdo?.es_premio_fijo ? "Premio Fijo" : "Por Resultado"}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-mono font-bold text-lg tabular-nums">
                                            <span className={j.monto > 0 ? "text-emerald-600" : "text-muted-foreground"}>
                                                Gs. {new Intl.NumberFormat("es-PY").format(j.monto)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter className="bg-slate-900 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-white/10">
                            <Coins className="h-8 w-8 text-brand-accent" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-black tracking-widest text-slate-400">Total a pagar en premios</p>
                            <p className="text-3xl font-extrabold tracking-tighter text-brand-accent">
                                Gs. {new Intl.NumberFormat("es-PY").format(totalPagar)}
                            </p>
                        </div>
                    </div>

                    <Button 
                        size="lg" 
                        disabled={isPending || seleccionados.size === 0}
                        onClick={handleGenerar}
                        className="bg-brand-primary hover:bg-brand-secondary h-14 px-10 rounded-xl text-lg font-bold shadow-lg shadow-brand-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                Generar Movimientos Masivos
                                <Trophy className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
