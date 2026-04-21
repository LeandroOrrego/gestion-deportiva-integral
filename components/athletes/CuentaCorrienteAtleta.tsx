"use client";

import { useState, useMemo, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    ArrowDownLeft,
    ArrowUpRight,
    PlusCircle,
    MinusCircle,
    Wallet,
    TrendingUp,
    TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

import { MovimientoAtleta, MovimientoTipo, saveMovimiento } from "@/lib/queries/atletas";
import { useToast } from "@/hooks/use-toast";

// (Types moved to lib/queries/atletas.ts)

// Mock data removed. Using real data from Supabase.

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatGs(val: number): string {
    return `Gs. ${new Intl.NumberFormat("es-PY").format(val)}`;
}

function formatGuaraniesInput(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("es-PY").format(Number(digits));
}

function parseGuaranies(formatted: string): number {
    const clean = formatted.replace(/\./g, "").replace(/,/g, "");
    return isNaN(Number(clean)) ? 0 : Number(clean);
}

function formatFecha(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function SaldoKPI({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: "green" | "red" | "blue";
}) {
    const colorMap = {
        green: "text-emerald-600 dark:text-emerald-400",
        red: "text-red-600 dark:text-red-400",
        blue: "text-blue-600 dark:text-blue-400",
    };
    const bgMap = {
        green: "bg-emerald-50 dark:bg-emerald-950/40",
        red: "bg-red-50 dark:bg-red-950/40",
        blue: "bg-blue-50 dark:bg-blue-950/40",
    };

    return (
        <div className={cn("rounded-xl border p-4 flex items-center gap-3", bgMap[color])}>
            <div className={cn("p-2 rounded-lg bg-white/60 dark:bg-black/20", colorMap[color])}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <p className={cn("text-lg font-bold tabular-nums", colorMap[color])}>
                    {formatGs(value)}
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Movement Form Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface MovimientoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tipo: MovimientoTipo;
    atletaId: string;
}

function MovimientoDialog({ open, onOpenChange, tipo, atletaId }: MovimientoDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [fecha, setFecha] = useState(todayISO());
    const [concepto, setConcepto] = useState("");
    const [montoDisplay, setMontoDisplay] = useState("");
    const [error, setError] = useState("");

    const isDebe = tipo === "DEBE";

    const handleSave = () => {
        if (!concepto.trim()) {
            setError("El concepto es requerido.");
            return;
        }
        const monto = parseGuaranies(montoDisplay);
        if (monto <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
        }

        startTransition(async () => {
            const { error } = await saveMovimiento({
                atleta_id: atletaId,
                fecha,
                tipo,
                concepto: concepto.trim(),
                monto,
            });

            if (error) {
                toast({
                    title: "Error al registrar",
                    description: error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Movimiento registrado",
                    description: "El movimiento se ha guardado correctamente.",
                });
                // reset
                setFecha(todayISO());
                setConcepto("");
                setMontoDisplay("");
                setError("");
                onOpenChange(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isDebe ? (
                            <MinusCircle className="h-5 w-5 text-red-500" />
                        ) : (
                            <PlusCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        {isDebe ? "Cargar Pago / Adelanto" : "Cargar Premio / Deuda"}
                    </DialogTitle>
                    <DialogDescription>
                        {isDebe
                            ? "Registrá un pago realizado o adelanto entregado al jugador (reduce la deuda del club)."
                            : "Registrá un premio ganado o deuda generada para el jugador."}
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="space-y-4 py-2">
                    {/* Badge tipo */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Tipo de movimiento:
                        </span>
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                isDebe
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            )}
                        >
                            {tipo}
                        </span>
                    </div>

                    {/* Fecha */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Fecha</label>
                        <Input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="h-10"
                        />
                    </div>

                    {/* Concepto */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            Concepto
                            <span className="text-destructive ml-0.5">*</span>
                        </label>
                        <Input
                            placeholder={isDebe ? "ej: Vale de Combustible" : "ej: Premio vs Olimpia"}
                            value={concepto}
                            onChange={(e) => {
                                setConcepto(e.target.value);
                                setError("");
                            }}
                            className="h-10"
                        />
                    </div>

                    {/* Monto */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            Monto
                            <span className="text-destructive ml-0.5">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                                Gs.
                            </span>
                            <Input
                                inputMode="numeric"
                                placeholder="0"
                                className="pl-9 h-10 text-right font-mono tabular-nums"
                                value={montoDisplay}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                    setMontoDisplay(raw ? formatGuaraniesInput(raw) : "");
                                    setError("");
                                }}
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-destructive font-medium">{error}</p>
                    )}
                </div>

                <Separator />

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="ghost" size="sm">
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isPending}
                        className={cn(
                            isDebe
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Procesando...
                            </>
                        ) : isDebe ? (
                            <>
                                <MinusCircle className="h-3.5 w-3.5 mr-1.5" />
                                Registrar Pago
                            </>
                        ) : (
                            <>
                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                Registrar Acreditación
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CuentaCorrienteAtletaProps {
    atletaId: string;
    atletaNombre: string;
    movimientos: MovimientoAtleta[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function CuentaCorrienteAtleta({
    atletaId,
    atletaNombre,
    movimientos,
}: CuentaCorrienteAtletaProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTipo, setDialogTipo] = useState<MovimientoTipo>("HABER");

    const openDialog = (tipo: MovimientoTipo) => {
        setDialogTipo(tipo);
        setDialogOpen(true);
    };

    // ── Computed values ───────────────────────────────────────────────────────

    const { totalHaber, totalDebe, saldoNeto, movimientosConSaldo } = useMemo(() => {
        const sorted = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha));

        let acumulado = 0;
        const movimientosConSaldo = sorted.map((m) => {
            acumulado += m.tipo === "HABER" ? m.monto : -m.monto;
            return { ...m, saldoAcumulado: acumulado };
        });

        const totalHaber = sorted
            .filter((m) => m.tipo === "HABER")
            .reduce((acc, m) => acc + m.monto, 0);

        const totalDebe = sorted
            .filter((m) => m.tipo === "DEBE")
            .reduce((acc, m) => acc + m.monto, 0);

        return {
            totalHaber,
            totalDebe,
            saldoNeto: totalHaber - totalDebe,
            movimientosConSaldo,
        };
    }, [movimientos]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* ── Header Card ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                {/* Top row */}
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                            Cuenta Corriente
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight">{atletaNombre}</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Libro mayor de movimientos financieros del jugador
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                            onClick={() => openDialog("DEBE")}
                            id="btn-cargar-pago"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            Cargar Pago / Adelanto (DEBE)
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openDialog("HABER")}
                            id="btn-cargar-premio"
                        >
                            <ArrowDownLeft className="h-4 w-4" />
                            Cargar Premio / Deuda (HABER)
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* KPI row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
                    {/* Saldo neto — el principal */}
                    <div
                        className={cn(
                            "rounded-xl border-2 p-5 flex flex-col items-center justify-center gap-1 sm:col-span-1",
                            saldoNeto > 0
                                ? "border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800"
                                : saldoNeto < 0
                                    ? "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
                                    : "border-border bg-muted/20"
                        )}
                    >
                        <Wallet
                            className={cn(
                                "h-6 w-6 mb-1",
                                saldoNeto > 0
                                    ? "text-blue-500"
                                    : saldoNeto < 0
                                        ? "text-red-500"
                                        : "text-muted-foreground"
                            )}
                        />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Saldo a Pagar
                        </p>
                        <p
                            className={cn(
                                "text-3xl font-extrabold tabular-nums tracking-tight",
                                saldoNeto > 0
                                    ? "text-blue-600 dark:text-blue-400"
                                    : saldoNeto < 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-foreground"
                            )}
                        >
                            {formatGs(Math.abs(saldoNeto))}
                        </p>
                        {saldoNeto !== 0 && (
                            <p className="text-xs text-muted-foreground">
                                {saldoNeto > 0 ? "A favor del jugador" : "A favor del club"}
                            </p>
                        )}
                    </div>

                    {/* Total HABER */}
                    <SaldoKPI
                        label="Total HABER (Premios)"
                        value={totalHaber}
                        icon={TrendingUp}
                        color="green"
                    />

                    {/* Total DEBE */}
                    <SaldoKPI
                        label="Total DEBE (Pagado)"
                        value={totalDebe}
                        icon={TrendingDown}
                        color="red"
                    />
                </div>
            </div>

            {/* ── Movements Table ───────────────────────────────────────── */}
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
                <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Historial de Movimientos</h3>
                    <span className="text-xs text-muted-foreground">
                        {movimientos.length} registros
                    </span>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                            <TableHead className="pl-5 font-semibold text-foreground">Fecha</TableHead>
                            <TableHead className="font-semibold text-foreground">Concepto</TableHead>
                            <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                            <TableHead className="font-semibold text-foreground text-right">Monto</TableHead>
                            <TableHead className="font-semibold text-foreground text-right pr-5">
                                Saldo Acumulado
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movimientosConSaldo.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                    Sin movimientos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            movimientosConSaldo.map((mov) => (
                                <TableRow key={mov.id} className="group hover:bg-muted/10 transition-colors">
                                    {/* Fecha */}
                                    <TableCell className="pl-5 text-sm text-muted-foreground tabular-nums">
                                        {formatFecha(mov.fecha)}
                                    </TableCell>

                                    {/* Concepto */}
                                    <TableCell className="font-medium text-sm max-w-[260px] truncate">
                                        {mov.concepto}
                                    </TableCell>

                                    {/* Tipo Badge */}
                                    <TableCell>
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                                mov.tipo === "HABER"
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                            )}
                                        >
                                            {mov.tipo === "HABER" ? (
                                                <ArrowDownLeft className="h-3 w-3" />
                                            ) : (
                                                <ArrowUpRight className="h-3 w-3" />
                                            )}
                                            {mov.tipo}
                                        </span>
                                    </TableCell>

                                    {/* Monto */}
                                    <TableCell
                                        className={cn(
                                            "text-right font-mono tabular-nums text-sm font-semibold",
                                            mov.tipo === "HABER"
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-red-600 dark:text-red-400"
                                        )}
                                    >
                                        {mov.tipo === "HABER" ? "+" : "-"}
                                        {formatGs(mov.monto)}
                                    </TableCell>

                                    {/* Saldo acumulado */}
                                    <TableCell
                                        className={cn(
                                            "text-right pr-5 font-mono tabular-nums text-sm font-bold",
                                            mov.saldoAcumulado > 0
                                                ? "text-blue-600 dark:text-blue-400"
                                                : mov.saldoAcumulado < 0
                                                    ? "text-red-600 dark:text-red-400"
                                                    : "text-muted-foreground"
                                        )}
                                    >
                                        {formatGs(mov.saldoAcumulado)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Table footer summary */}
                {movimientosConSaldo.length > 0 && (
                    <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground bg-muted/10">
                        <span>
                            Haber: <strong className="text-emerald-600">{formatGs(totalHaber)}</strong>
                            {" — "}
                            Debe: <strong className="text-red-600">{formatGs(totalDebe)}</strong>
                        </span>
                        <span className="font-semibold text-foreground">
                            Saldo: {formatGs(saldoNeto)}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Dialog ──────────────────────────────────────────────── */}
            <MovimientoDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                tipo={dialogTipo}
                atletaId={atletaId}
            />
        </div>
    );
}
