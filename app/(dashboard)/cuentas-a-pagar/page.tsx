"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getPendingExpenses, getTransactionFormData } from "@/lib/queries/transactions";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { MarkAsPaidModal } from "./MarkAsPaidModal";
import { EntityFilter } from "@/components/transactions/EntityFilter";
import { CategoryFilter } from "@/components/transactions/CategoryFilter";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { updateTransaction, voidTransaction } from "@/lib/queries/transactions";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function CuentasAPagarPage() {
    const { profile } = useAuth();
    const isViewer = profile?.rol === 'viewer';
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [fullFormData, setFullFormData] = useState({ types: [], categories: [], accounts: [], entities: [] });
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);
    const [voidId, setVoidId] = useState<string | null>(null);
    const [entidadFilter, setEntidadFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    const loadData = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const [pendingData, formDataRes] = await Promise.all([
                getPendingExpenses(profile.organization_id),
                getTransactionFormData(profile.organization_id)
            ]);
            setExpenses(pendingData);
            setAccounts(formDataRes.accounts);
            setFullFormData(formDataRes as any);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.organization_id]);

    const filteredExpenses = expenses.filter((expense) => {
        if (entidadFilter !== "all" && String(expense.entidades?.id) !== String(entidadFilter)) return false;
        if (categoryFilter !== "all" && String(expense.transaction_type_id) !== String(categoryFilter)) return false;
        return true;
    });

    const totalDeuda = filteredExpenses.reduce((acc, curr) => acc + Number(curr.monto), 0);

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

    const handleEdit = (expense: any) => {
        setEditingTransaction({
            ...expense,
            is_credit: true,
        });
        setIsFormOpen(true);
    };

    const handleUpdate = async (values: any) => {
        if (!editingTransaction) return;
        const payload = {
            ...values,
            category_id: values.category_id === "none" || values.category_id === "" ? null : values.category_id,
            entidad_id: values.entidad_id === "none" || values.entidad_id === "" ? null : values.entidad_id,
        };
        try {
            await updateTransaction(editingTransaction.id, payload);
            toast({ title: "Éxito", description: "Cuenta a pagar actualizada correctamente." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
        }
    };

    const handleVoid = async () => {
        if (!voidId) return;
        try {
            await voidTransaction(voidId);
            toast({ title: "Eliminada", description: "La cuenta a pagar ha sido eliminada." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
        } finally {
            setVoidId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cuentas a Pagar</h2>
                    <p className="text-muted-foreground">Gestiona tus compromisos de pago pendientes.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">Entidad:</span>
                        <EntityFilter 
                            entities={fullFormData.entities} 
                            value={entidadFilter} 
                            onChange={setEntidadFilter} 
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">Categoría:</span>
                        <CategoryFilter 
                            categories={fullFormData.types} 
                            value={categoryFilter} 
                            onChange={setCategoryFilter} 
                        />
                    </div>
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
                        ) : filteredExpenses.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay cuentas a pagar pendientes.</TableCell></TableRow>
                        ) : (
                            filteredExpenses.map((expense) => {
                                const status = getExpirationStatus(expense.fecha_vencimiento);
                                return (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.entidades?.nombre || '-'}</TableCell>
                                        <TableCell>{expense.descripcion || '-'}</TableCell>
                                        <TableCell className={status.color}>{status.text}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            ₲ {new Intl.NumberFormat('es-PY').format(Number(expense.monto))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(expense)}>
                                                    Pagar
                                                </Button>
                                                {!isViewer && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                            onClick={() => handleEdit(expense)}
                                                            title="Editar"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                            onClick={() => setVoidId(expense.id)}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
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
                    key={`pay-${selectedExpense.id}`}
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

            <TransactionForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleUpdate}
                initialData={editingTransaction}
                formData={fullFormData}
            />

            <AlertDialog open={!!voidId} onOpenChange={(open) => !open && setVoidId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar cuenta a pagar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el compromiso de pago pendiente. No afectará a ninguna caja.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleVoid}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
