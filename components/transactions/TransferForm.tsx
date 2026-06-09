"use client";

import { todayLocal } from "@/lib/utils/date";
import { useState } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface TransferFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: {
        cuenta_origen_id: string;
        cuenta_destino_id: string;
        monto: number;
        fecha: string;
        descripcion?: string;
    }) => Promise<void>;
    accounts: { id: string; nombre: string; saldo_inicial: number }[];
}

function formatGs(n: number) {
    return `Gs. ${Math.round(n).toLocaleString("es-PY")}`;
}

export function TransferForm({ open, onOpenChange, onSubmit, accounts }: TransferFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cuentaOrigen, setCuentaOrigen] = useState("");
    const [cuentaDestino, setCuentaDestino] = useState("");
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState(todayLocal());
    const [descripcion, setDescripcion] = useState("Transferencia entre cuentas");
    const [error, setError] = useState("");

    const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        setMonto(formatted);
    };

    const montoNumerico = Number(monto.replace(/\./g, ""));

    const saldoOrigen = accounts.find(a => a.id === cuentaOrigen)?.saldo_inicial ?? null;
    const saldoDestino = accounts.find(a => a.id === cuentaDestino)?.saldo_inicial ?? null;

    const saldoOrigenPost = saldoOrigen !== null ? saldoOrigen - montoNumerico : null;
    const saldoDestinoPost = saldoDestino !== null ? saldoDestino + montoNumerico : null;

    const resetForm = () => {
        setCuentaOrigen("");
        setCuentaDestino("");
        setMonto("");
        setFecha(todayLocal());
        setDescripcion("Transferencia entre cuentas");
        setError("");
    };

    const handleClose = (val: boolean) => {
        if (!val) resetForm();
        onOpenChange(val);
    };

    const handleSubmit = async () => {
        setError("");

        if (!cuentaOrigen) return setError("Seleccioná la cuenta de origen.");
        if (!cuentaDestino) return setError("Seleccioná la cuenta de destino.");
        if (cuentaOrigen === cuentaDestino) return setError("Las cuentas deben ser diferentes.");
        if (!montoNumerico || montoNumerico <= 0) return setError("Ingresá un monto válido.");
        if (!fecha) return setError("Seleccioná una fecha.");
        if (saldoOrigen !== null && montoNumerico > saldoOrigen) {
            return setError("El monto supera el saldo disponible en la cuenta origen.");
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                cuenta_origen_id: cuentaOrigen,
                cuenta_destino_id: cuentaDestino,
                monto: montoNumerico,
                fecha,
                descripcion: descripcion || "Transferencia entre cuentas",
            });
            resetForm();
            onOpenChange(false);
        } catch (err) {
            setError("Ocurrió un error al procesar la transferencia.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ArrowLeftRight className="h-5 w-5 text-primary" />
                        Transferir entre Cuentas
                    </DialogTitle>
                    <DialogDescription>
                        Mové fondos de una cuenta a otra en una sola operación.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">

                    {/* Fecha y Monto */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="px-4 py-3 h-auto"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Monto (₲)</Label>
                            <Input
                                placeholder="0"
                                value={monto}
                                onChange={handleMontoChange}
                                className="text-lg font-medium px-4 py-3 h-auto"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Cuentas */}
                    <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Movimiento de fondos
                        </Label>

                        {/* Cuenta Origen */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">Cuenta Origen <span className="text-destructive">*</span></Label>
                            <Select value={cuentaOrigen} onValueChange={setCuentaOrigen}>
                                <SelectTrigger className="px-4 py-3 h-auto">
                                    <SelectValue placeholder="Seleccioná cuenta de origen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts
                                        .filter(a => a.id !== cuentaDestino)
                                        .map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                <div className="flex items-center justify-between gap-4 w-full">
                                                    <span>{a.nombre}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {formatGs(a.saldo_inicial)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {saldoOrigen !== null && (
                                <p className="text-xs text-muted-foreground pl-1">
                                    Saldo actual: <span className="font-semibold">{formatGs(saldoOrigen)}</span>
                                    {montoNumerico > 0 && (
                                        <span className={`ml-2 font-semibold ${saldoOrigenPost! < 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
                                            → {formatGs(saldoOrigenPost!)}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Flecha visual */}
                        <div className="flex items-center justify-center py-1">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                <div className="h-px w-12 bg-border" />
                                <ArrowRight className="h-4 w-4 text-primary" />
                                <div className="h-px w-12 bg-border" />
                            </div>
                        </div>

                        {/* Cuenta Destino */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">Cuenta Destino <span className="text-destructive">*</span></Label>
                            <Select value={cuentaDestino} onValueChange={setCuentaDestino}>
                                <SelectTrigger className="px-4 py-3 h-auto">
                                    <SelectValue placeholder="Seleccioná cuenta de destino..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts
                                        .filter(a => a.id !== cuentaOrigen)
                                        .map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                <div className="flex items-center justify-between gap-4 w-full">
                                                    <span>{a.nombre}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {formatGs(a.saldo_inicial)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {saldoDestino !== null && (
                                <p className="text-xs text-muted-foreground pl-1">
                                    Saldo actual: <span className="font-semibold">{formatGs(saldoDestino)}</span>
                                    {montoNumerico > 0 && (
                                        <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                                            → {formatGs(saldoDestinoPost!)}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Resumen visual */}
                    {cuentaOrigen && cuentaDestino && montoNumerico > 0 && (
                        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
                            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Resumen</p>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">De:</span>
                                <span className="font-medium">{accounts.find(a => a.id === cuentaOrigen)?.nombre}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">A:</span>
                                <span className="font-medium">{accounts.find(a => a.id === cuentaDestino)?.nombre}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Monto:</span>
                                <span className="font-bold text-primary">{formatGs(montoNumerico)}</span>
                            </div>
                        </div>
                    )}

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="resize-none min-h-[70px] px-4 py-3"
                            placeholder="Descripción opcional..."
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
                            ⚠ {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent mr-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <ArrowLeftRight className="h-4 w-4 mr-2" />
                                Confirmar Transferencia
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}