"use client";

import { todayLocal } from "@/lib/utils/date";
import { useState } from "react";
import { ArrowRight, ArrowLeftRight, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
        entidad_id?: string | null;
        comprobante_numero?: string;
        category_id?: string | null;
        transaction_type_id?: string | null;
    }) => Promise<void>;
    accounts: { id: string; nombre: string; saldo_inicial: number }[];
    entities: { id: string; nombre: string }[];
    categories: { id: string; nombre: string }[];
    transactionTypes: { id: string; nombre: string }[];
}

function formatGs(n: number) {
    return `Gs. ${Math.round(n).toLocaleString("es-PY")}`;
}

export function TransferForm({
    open, onOpenChange, onSubmit, accounts, entities, categories, transactionTypes
}: TransferFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cuentaOrigen, setCuentaOrigen] = useState("");
    const [cuentaDestino, setCuentaDestino] = useState("");
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState(todayLocal());
    const [descripcion, setDescripcion] = useState("Transferencia entre cuentas");
    const [entidadId, setEntidadId] = useState("");
    const [comprobanteNumero, setComprobanteNumero] = useState("");
    const [transactionTypeId, setTransactionTypeId] = useState("");
    const [error, setError] = useState("");
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [typeComboboxOpen, setTypeComboboxOpen] = useState(false);

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

    const saldoInsuficiente = saldoOrigen !== null && montoNumerico > 0 && montoNumerico > saldoOrigen;

    const resetForm = () => {
        setCuentaOrigen("");
        setCuentaDestino("");
        setMonto("");
        setFecha(todayLocal());
        setDescripcion("Transferencia entre cuentas");
        setEntidadId("");
        setComprobanteNumero("");
        setTransactionTypeId("");
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

        setIsSubmitting(true);
        try {
            await onSubmit({
                cuenta_origen_id: cuentaOrigen,
                cuenta_destino_id: cuentaDestino,
                monto: montoNumerico,
                fecha,
                descripcion: descripcion || "Transferencia entre cuentas",
                entidad_id: (entidadId && entidadId !== "none") ? entidadId : null,
                comprobante_numero: comprobanteNumero || undefined,
                category_id: null,
                transaction_type_id: (transactionTypeId && transactionTypeId !== "none") ? transactionTypeId : null,
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
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
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

                        {/* Flecha */}
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

                    <Separator />

                    {/* Clasificación */}
                    <div className="space-y-4">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Clasificación
                        </Label>

                        {/* Categoría */}
                        <div className="space-y-2">
                            <Label className="text-sm">Categoría (Opcional)</Label>
                            <Popover open={typeComboboxOpen} onOpenChange={setTypeComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={typeComboboxOpen}
                                        className={cn(
                                            "w-full justify-between h-auto px-4 py-3 font-normal",
                                            !transactionTypeId && "text-muted-foreground"
                                        )}
                                    >
                                        {transactionTypeId && transactionTypeId !== "none"
                                            ? transactionTypes.find(t => t.id === transactionTypeId)?.nombre
                                            : "Seleccioná una categoría..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar categoría..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => {
                                                        setTransactionTypeId("none");
                                                        setTypeComboboxOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", transactionTypeId === "none" ? "opacity-100" : "opacity-0")} />
                                                    Ninguna
                                                </CommandItem>
                                                {transactionTypes.map(type => (
                                                    <CommandItem
                                                        key={type.id}
                                                        value={type.nombre}
                                                        onSelect={() => {
                                                            setTransactionTypeId(type.id);
                                                            setTypeComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", transactionTypeId === type.id ? "opacity-100" : "opacity-0")} />
                                                        {type.nombre}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Razón / Entidad */}
                        <div className="space-y-2">
                            <Label className="text-sm">Razón / Entidad (Opcional)</Label>
                            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={comboboxOpen}
                                        className={cn(
                                            "w-full justify-between h-auto px-4 py-3 font-normal",
                                            !entidadId && "text-muted-foreground"
                                        )}
                                    >
                                        {entidadId && entidadId !== "none"
                                            ? entities.find(e => e.id === entidadId)?.nombre
                                            : "Buscar entidad o persona..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => {
                                                        setEntidadId("none");
                                                        setComboboxOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", entidadId === "none" ? "opacity-100" : "opacity-0")} />
                                                    Ninguna
                                                </CommandItem>
                                                {entities.map(entidad => (
                                                    <CommandItem
                                                        key={entidad.id}
                                                        value={entidad.nombre}
                                                        onSelect={() => {
                                                            setEntidadId(entidad.id);
                                                            setComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", entidadId === entidad.id ? "opacity-100" : "opacity-0")} />
                                                        {entidad.nombre}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Comprobante */}
                        <div className="space-y-2">
                            <Label className="text-sm">Comprobante N°</Label>
                            <Input
                                placeholder="000-014-0000000"
                                value={comprobanteNumero}
                                onChange={(e) => setComprobanteNumero(e.target.value)}
                                className="px-4 py-3 h-auto font-mono"
                            />
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label className="text-sm">Descripción</Label>
                        <Textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="resize-none min-h-[70px] px-4 py-3"
                            placeholder="Descripción opcional..."
                        />
                    </div>

                    {/* Warning saldo insuficiente */}
                    {saldoInsuficiente && (
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800">
                            ⚠ El monto supera el saldo actual de la cuenta origen. La cuenta quedará en negativo.
                        </p>
                    )}

                    {/* Error bloqueante */}
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