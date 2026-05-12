"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
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
    Trash,
    Pencil,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { todayLocal } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

import { MovimientoAtleta, MovimientoTipo, saveMovimiento, deleteMovimiento, updateMovimientoConcepto } from "@/lib/queries/atletas";
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

// todayISO replaced by todayLocal from @/lib/utils/date

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
    atletaNombre: string;
    atletaEntidadId?: string | null;
    atletaCategoryId?: string | null;
    atletaCategoryName?: string | null;
    accounts?: any[];
    transactionTypes?: any[];
    eventos?: any[];
}

function MovimientoDialog({
    open, onOpenChange, tipo, atletaId,
    atletaNombre, atletaEntidadId, atletaCategoryId, atletaCategoryName,
    accounts = [], transactionTypes = [],
    eventos = [],
}: MovimientoDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [fecha, setFecha] = useState(todayLocal());
    const [concepto, setConcepto] = useState("");
    const [montoDisplay, setMontoDisplay] = useState("");
    const [cuentaId, setCuentaId] = useState("");
    const [transactionTypeId, setTransactionTypeId] = useState("");
    const [eventoId, setEventoId] = useState("");
    const [comprobanteNumero, setComprobanteNumero] = useState("");
    const [error, setError] = useState("");

    const isDebe = tipo === "DEBE";

    const handleSave = () => {
        if (isDebe) {
            if (!cuentaId) return setError("Debe seleccionar una cuenta de origen.");
            if (!transactionTypeId) return setError("Debe seleccionar una categoría financiera.");
        }
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
                cuenta_id: isDebe ? cuentaId : undefined,
                transaction_type_id: isDebe ? transactionTypeId : undefined,
                entidad_id: isDebe ? (atletaEntidadId || undefined) : undefined,
                evento_id: isDebe && eventoId ? eventoId : undefined,
                comprobante_numero: isDebe && comprobanteNumero.trim() ? comprobanteNumero.trim() : undefined,
                category_id: isDebe && atletaCategoryId ? atletaCategoryId : undefined,
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
                setFecha(todayLocal());
                setConcepto("");
                setMontoDisplay("");
                setCuentaId("");
                setTransactionTypeId("");
                setEventoId("");
                setComprobanteNumero("");
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

                    {/* Conditional Dropdowns for DEBE */}
                    {isDebe && (
                        <div className="space-y-4">
                            {/* Razón/Entidad — pre-filled from athlete's entidad_id */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Razón / Entidad</label>
                                <Input
                                    value={atletaNombre}
                                    disabled
                                    className="h-10 bg-muted/50"
                                />
                                {atletaEntidadId ? (
                                    <p className="text-[10px] text-muted-foreground">Vinculado a la entidad registrada del atleta</p>
                                ) : (
                                    <p className="text-[10px] text-amber-600">⚠ Este atleta no tiene entidad asignada</p>
                                )}
                            </div>

                            {/* Plantel — pre-filled */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Plantel</label>
                                <Input
                                    value={atletaCategoryName || "Sin plantel"}
                                    disabled
                                    className="h-10 bg-muted/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Cuenta Origen <span className="text-destructive">*</span></label>
                                    <Select value={cuentaId} onValueChange={(val) => { setCuentaId(val); setError(""); }}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Categoría <span className="text-destructive">*</span></label>
                                    <Select value={transactionTypeId} onValueChange={(val) => { setTransactionTypeId(val); setError(""); }}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {transactionTypes.map(type => (
                                                <SelectItem key={type.id} value={type.id}>{type.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Jornada / Evento */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Jornada / Evento</label>
                                <Select value={eventoId} onValueChange={(val) => { setEventoId(val); setError(""); }}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Ninguna (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguna</SelectItem>
                                        {eventos.map((ev: any) => {
                                            const label = ev.jornada
                                                ? ev.jornada
                                                : `${ev.fecha} - ${ev.tipo || ''} vs ${ev.rival || 'ND'}`;
                                            return (
                                                <SelectItem key={ev.id} value={ev.id}>{label}</SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Comprobante */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Nº Comprobante</label>
                                <Input
                                    placeholder="Ej: 138753176"
                                    value={comprobanteNumero}
                                    onChange={(e) => { setComprobanteNumero(e.target.value); setError(""); }}
                                    className="h-10 font-mono"
                                />
                            </div>
                        </div>
                    )}

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
// Sub-component: Edit Concepto Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface EditConceptoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    movimiento: MovimientoAtleta | null;
    atletaId: string;
}

function EditConceptoDialog({ open, onOpenChange, movimiento, atletaId }: EditConceptoDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [concepto, setConcepto] = useState("");
    const [error, setError] = useState("");

    // Use a temporary effect to sync concept when movement changes
    useEffect(() => {
        if (movimiento) {
            setConcepto(movimiento.concepto);
            setError("");
        }
    }, [movimiento]);

    const handleUpdate = () => {
        if (!concepto.trim()) {
            setError("El concepto es requerido.");
            return;
        }

        startTransition(async () => {
            const { error } = await updateMovimientoConcepto(movimiento!.id, concepto.trim(), atletaId);

            if (error) {
                toast({
                    title: "Error al actualizar",
                    description: error,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Concepto actualizado",
                    description: "El concepto se ha corregido correctamente.",
                });
                onOpenChange(false);
            }
        });
    };

    if (!movimiento) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-blue-500" />
                        Editar Concepto
                    </DialogTitle>
                    <DialogDescription>
                        Solo podés corregir el texto descriptivo del movimiento.
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="space-y-4 py-2">
                    {/* Info bloqueada */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</label>
                            <p className="text-sm font-semibold">{movimiento.tipo}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Monto</label>
                            <p className="text-sm font-semibold font-mono">{formatGs(movimiento.monto)}</p>
                        </div>
                    </div>

                    {/* Concepto editable */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Concepto / Descripción</label>
                        <Input
                            value={concepto}
                            onChange={(e) => {
                                setConcepto(e.target.value);
                                setError("");
                            }}
                            className="h-10"
                            autoFocus
                        />
                        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="ghost" size="sm">
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button
                        size="sm"
                        onClick={handleUpdate}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Cambios"
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
    atletaEntidadId?: string | null;
    atletaCategoryId?: string | null;
    atletaCategoryName?: string | null;
    movimientos: MovimientoAtleta[];
    accounts?: any[];
    transactionTypes?: any[];
    eventos?: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function CuentaCorrienteAtleta({
    atletaId,
    atletaNombre,
    atletaEntidadId,
    atletaCategoryId,
    atletaCategoryName,
    movimientos,
    accounts = [],
    transactionTypes = [],
    eventos = [],
}: CuentaCorrienteAtletaProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleting] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTipo, setDialogTipo] = useState<MovimientoTipo>("HABER");
    const [editingMovimiento, setEditingMovimiento] = useState<MovimientoAtleta | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const openDialog = (tipo: MovimientoTipo) => {
        setDialogTipo(tipo);
        setDialogOpen(true);
    };

    const handleEdit = (mov: MovimientoAtleta) => {
        setEditingMovimiento(mov);
        setEditDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este registro? Si era un Pago (DEBE), el dinero restado en Caja NO será devuelto automáticamente; deberás ajustar la transacción o anularla manualmente en el módulo de Transacciones.")) return;
        
        startDeleting(async () => {
            const { error } = await deleteMovimiento(id, atletaId);
            if (error) {
                toast({ title: "Error al eliminar", description: error, variant: "destructive" });
            } else {
                toast({ title: "Registro eliminado", description: "El movimiento ha sido borrado de la cuenta del atleta." });
            }
        });
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
                            <TableHead className="font-semibold text-foreground text-right">
                                Saldo Acumulado
                            </TableHead>
                            <TableHead className="font-semibold text-foreground text-center w-20"></TableHead>
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
                                <TableRow key={mov.id} className={cn("group hover:bg-muted/10 transition-colors", isDeleting && "opacity-50 pointer-events-none")}>
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

                                    {/* Actions */}
                                    <TableCell className="text-center w-20">
                                        <div className="hidden group-hover:flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 transition-colors"
                                                onClick={() => handleEdit(mov)}
                                                title="Editar concepto"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                                                onClick={() => handleDelete(mov.id)}
                                                title="Eliminar este movimiento"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
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
                atletaNombre={atletaNombre}
                atletaEntidadId={atletaEntidadId}
                atletaCategoryId={atletaCategoryId}
                atletaCategoryName={atletaCategoryName}
                accounts={accounts}
                transactionTypes={transactionTypes}
                eventos={eventos}
            />

            {/* ── Edit Dialog ────────────────────────────────────────── */}
            <EditConceptoDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                movimiento={editingMovimiento}
                atletaId={atletaId}
            />
        </div>
    );
}
