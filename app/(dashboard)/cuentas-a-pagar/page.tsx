"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getPendingExpenses, getTransactionFormData } from "@/lib/queries/transactions";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { MarkAsPaidModal } from "./MarkAsPaidModal";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function CuentasAPagarPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const [pendingData, formData] = await Promise.all([
                getPendingExpenses(profile.organization_id),
                getTransactionFormData(profile.organization_id)
            ]);
            setExpenses(pendingData);
            setAccounts(formData.accounts);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.organization_id]);

    const totalDeuda = expenses.reduce((acc, curr) => acc + Number(curr.monto), 0);

    const getExpirationStatus = (fecha_vencimiento: string | null) => {
        if (!fecha_vencimiento) return { text: "Sin fecha", color: "text-muted-foreground" };
        
        const hoy = startOfDay(new Date());
        const vencimiento = startOfDay(parseISO(fecha_vencimiento));
        const diff = differenceInDays(vencimiento, hoy);

        if (diff < 0) {
            return { text: `Vencida hace ${Math.abs(diff)} días`, color: "text-red-600 font-semibold" };
        } else if (diff <= 7) {
            return { text: diff === 0 ? "Vence hoy" : `Vence en ${diff} días`, color: "text-yellow-600 font-semibold" };
        } else {
            const [y, m, d] = fecha_vencimiento.split('T')[0].split('-');
            return { text: `${d}/${m}/${y}`, color: "" };
        }
    };

    const handleOpenModal = (expense: any) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cuentas a Pagar</h2>
                    <p className="text-muted-foreground">Gestiona tus compromisos de pago pendientes.</p>
                </div>
            </div>

            <div className="p-6 border rounded-xl bg-card">
                <h3 className="text-sm font-medium text-muted-foreground">Total Deuda Pendiente</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">
                    ₲ {new Intl.NumberFormat('es-PY').format(totalDeuda)}
                </p>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Proveedor / Entidad</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center">Cargando...</TableCell></TableRow>
                        ) : expenses.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay cuentas a pagar pendientes.</TableCell></TableRow>
                        ) : (
                            expenses.map((expense) => {
                                const status = getExpirationStatus(expense.fecha_vencimiento);
                                return (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.entidades?.nombre || '-'}</TableCell>
                                        <TableCell>{expense.descripcion || '-'}</TableCell>
                                        <TableCell className={status.color}>{status.text}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            ₲ {new Intl.NumberFormat('es-PY').format(Number(expense.monto))}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenModal(expense)}>
                                                Pagar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedExpense && (
                <MarkAsPaidModal 
                    key={selectedExpense.id}
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    transaction={selectedExpense}
                    accounts={accounts}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        setSelectedExpense(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
