
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Search, MessageCircle, FileText, Trash2 } from "lucide-react";
import { ReceiptPDFButton } from "./ReceiptPDFButton";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/ui/currency";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransactionTableProps {
    data: any[];
    filters: any;
    onFilterChange: (filters: any) => void;
    onEdit: (transaction: any) => void;
    onVoid: (id: string) => void;
    totalBalance: number;
    accounts?: any[];
}

export function TransactionTable({
    data,
    filters,
    onFilterChange,
    onEdit,
    onVoid,
    totalBalance,
    accounts = [],
}: TransactionTableProps) {
    const { toast } = useToast();
    const [voidId, setVoidId] = useState<string | null>(null);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value });
    };

    const handleFlowChange = (val: string) => onFilterChange({ ...filters, flow: val });
    const handleFondoChange = (val: string) => onFilterChange({ ...filters, fondo: val });

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Desde</span>
                            <Input 
                                type="date" 
                                className="w-[140px] h-9" 
                                value={filters.startDate}
                                onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Hasta</span>
                            <Input 
                                type="date" 
                                className="w-[140px] h-9" 
                                value={filters.endDate}
                                onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Select value={filters.flow} onValueChange={handleFlowChange}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Flujo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="income">Ingresos</SelectItem>
                                <SelectItem value="expense">Egresos</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.fondo} onValueChange={handleFondoChange}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Fondo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="deportivo">Deportivo</SelectItem>
                                <SelectItem value="administrativo">Administrativo</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.cuenta_id || "all"} onValueChange={(val) => onFilterChange({ ...filters, cuenta_id: val })}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por descripción..."
                            className="pl-8"
                            value={filters.search || ''}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Descripción / Razón</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Plantel</TableHead>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Nº Comp.</TableHead>
                            <TableHead>Fondo</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    No se encontraron transacciones.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>
                                        {format(new Date(transaction.fecha + 'T12:00:00'), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {transaction.entidades?.nombre || transaction.descripcion || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.transaction_types?.nombre || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.categorias?.nombre || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.cuentas?.nombre || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {transaction.comprobante_numero || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "font-normal",
                                                transaction.fondo === 'deportivo' ? "bg-blue-100/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                            )}
                                        >
                                            {transaction.fondo === 'deportivo' ? 'Deportivo' : (transaction.fondo === 'administrativo' ? 'Administrativo' : transaction.fondo)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Currency
                                            amount={transaction.monto}
                                            color={transaction.flow === 'income' ? 'income' : 'expense'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={transaction.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                onClick={() => {
                                                    const message = `*Club Deportivo Naranjal — Notificación*
📋 Nueva Operación Registrada
📅 Fecha: ${format(new Date(transaction.fecha + 'T12:00:00'), 'dd/MM/yyyy')}
💰 Monto: ₲ ${new Intl.NumberFormat('es-PY').format(transaction.monto)}
📌 Tipo: ${transaction.flow === 'income' ? 'Ingreso' : 'Egreso'}
🏷️ Fondo: ${transaction.fondo === 'deportivo' ? 'Deportivo' : (transaction.fondo === 'administrativo' ? 'Administrativo' : transaction.fondo || '-')}
📂 Categoría: ${transaction.transaction_types?.nombre || '-'}
👤 Razón: ${transaction.entidades?.nombre || '-'}
📝 Descripción: ${transaction.descripcion || '-'}
🧾 Comprobante: ${transaction.comprobante_numero || '-'}
💼 Cuenta: ${transaction.cuentas?.nombre || '-'}
💵 Saldo General: ₲ ${new Intl.NumberFormat('es-PY').format(totalBalance)}

Generado por ClubManager PY`;
                                                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                                }}
                                                title="Enviar por WhatsApp"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </Button>

                                            <ReceiptPDFButton transaction={transaction} />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                onClick={() => onEdit(transaction)}
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            {transaction.status !== 'voided' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                    onClick={() => setVoidId(transaction.id)}
                                                    title="Anular"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Void Confirmation */}
            <AlertDialog open={!!voidId} onOpenChange={(open) => !open && setVoidId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Anular esta transacción?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cambiará el estado de la transacción a "Anulado" y revertirá su impacto en los saldos. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (voidId) onVoid(voidId);
                                setVoidId(null);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Anular
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
