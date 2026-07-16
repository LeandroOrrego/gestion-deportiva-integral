"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marcarComoPagado } from "@/lib/queries/transactions";
import { useToast } from "@/hooks/use-toast";
import { todayLocal } from "@/lib/utils/date";

export function MarkAsPaidModal({ open, onOpenChange, transaction, accounts, onSuccess }: any) {
    const { toast } = useToast();
    const [cuentaId, setCuentaId] = useState("");
    const [fechaPago, setFechaPago] = useState(todayLocal());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!cuentaId) {
            toast({ title: "Error", description: "Seleccioná la cuenta de origen.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await marcarComoPagado(transaction.id, cuentaId, fechaPago);
            toast({ title: "Éxito", description: "Transacción pagada correctamente." });
            onSuccess();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Hubo un error al procesar el pago.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Marcar como Pagado</DialogTitle>
                    <DialogDescription>
                        Confirmá de dónde salió el dinero y la fecha real del pago.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Proveedor / Entidad</Label>
                        <div className="p-3 border rounded bg-muted/50 font-medium">
                            {transaction.entidades?.nombre || "Sin entidad"}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Monto a Pagar</Label>
                        <div className="p-3 border rounded bg-muted/50 font-bold text-lg text-red-600">
                            ₲ {new Intl.NumberFormat('es-PY').format(Number(transaction.monto))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cuenta">Cuenta de Origen</Label>
                        <Select onValueChange={setCuentaId} value={cuentaId}>
                            <SelectTrigger id="cuenta">
                                <SelectValue placeholder="Seleccioná una cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc: any) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fecha">Fecha de Pago</Label>
                        <Input 
                            id="fecha" 
                            type="date" 
                            value={fechaPago} 
                            onChange={(e) => setFechaPago(e.target.value)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !cuentaId}>
                        {isSubmitting ? "Procesando..." : "Confirmar Pago"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
