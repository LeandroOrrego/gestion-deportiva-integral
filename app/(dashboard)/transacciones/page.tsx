"use client";

import { useEffect, useState } from "react";
import { Plus, Share2, FileText, Send } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
    getTransactions,
    getTransactionFormData,
    createTransaction,
    updateTransaction,
    voidTransaction,
    getTransactionStats,
    getTotalAccountBalance,
    type TransactionFilter
} from "@/lib/queries/transactions";
import { getSaldosPorCuenta } from "@/lib/queries/dashboard";

import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionStats } from "@/components/transactions/TransactionStats";
import { useToast } from "@/hooks/use-toast";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";

export default function TransactionsPage() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
    const [totalBalance, setTotalBalance] = useState(0);
    const [formData, setFormData] = useState({ types: [], categories: [], accounts: [], entities: [] });

    // Filters state
    const [filters, setFilters] = useState<TransactionFilter>(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        return {
            startDate: firstDay,
            endDate: today,
            flow: 'all',
            fondo: 'all',
            cuenta_id: 'all',
            search: ''
        };
    });

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    // Summary range state (separate from page filters, but defaulted to them)
    const [summaryRange, setSummaryRange] = useState({ startDate: '', endDate: '' });

    // Pre-fill summary range when filters change
    useEffect(() => {
        setSummaryRange({
            startDate: filters.startDate || '',
            endDate: filters.endDate || ''
        });
    }, [filters.startDate, filters.endDate]);

    const loadData = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const [transactions, formOptions, statistics, balance] = await Promise.all([
                getTransactions(profile.organization_id, filters),
                getTransactionFormData(profile.organization_id),
                getTransactionStats(profile.organization_id, filters),
                getTotalAccountBalance(profile.organization_id)
            ]);
            setData(transactions);
            setFormData(formOptions as any);
            setStats(statistics);
            setTotalBalance(balance);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar las transacciones.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.organization_id, filters.startDate, filters.endDate, filters.flow, filters.fondo, filters.search]);

    const handleCreate = async (values: any) => {
        if (!profile?.organization_id) return;
        const payload = {
            ...values,
            organization_id: profile.organization_id,
            category_id: values.category_id === "none" || values.category_id === "" ? null : values.category_id,
            entidad_id: values.entidad_id === "none" || values.entidad_id === "" ? null : values.entidad_id,
        };
        try {
            await createTransaction(payload);
            toast({ title: "Éxito", description: "Transacción creada correctamente." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear la transacción.", variant: "destructive" });
        }
    };

    const handleUpdate = async (values: any) => {
        if (!profile?.organization_id || !editingTransaction) return;
        const payload = {
            ...values,
            category_id: values.category_id === "none" || values.category_id === "" ? null : values.category_id,
            entidad_id: values.entidad_id === "none" || values.entidad_id === "" ? null : values.entidad_id,
        };
        try {
            await updateTransaction(editingTransaction.id, payload);
            toast({ title: "Éxito", description: "Transacción actualizada correctamente." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo actualizar la transacción.", variant: "destructive" });
        }
    };

    const handleVoid = async (id: string) => {
        try {
            await voidTransaction(id);
            toast({ title: "Anulada", description: "La transacción ha sido anulada." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo anular la transacción.", variant: "destructive" });
        }
    };

    const openCreateModal = () => {
        setEditingTransaction(null);
        setIsFormOpen(true);
    };

    const openEditModal = (transaction: any) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    };

    const formatCurrency = (val: number) => {
        return `₲ ${new Intl.NumberFormat('es-PY').format(Math.round(val))}`;
    };

    const formatPDFCurrency = (val: number) => {
        return `Gs. ${new Intl.NumberFormat('es-PY').format(Math.round(val))}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const generatePDF = async () => {
        try {
            const organizationId = profile?.organization_id || "";
            const reportData = await getTransactions(organizationId, {
                startDate: summaryRange.startDate,
                endDate: summaryRange.endDate,
                excludeCajaMovements: true,
                flow: filters.flow,
                fondo: filters.fondo,
                search: filters.search
            });

            const reportStats = await getTransactionStats(organizationId, {
                startDate: summaryRange.startDate,
                endDate: summaryRange.endDate,
                excludeCajaMovements: true,
                flow: filters.flow,
                fondo: filters.fondo,
            });

            const accounts = await getSaldosPorCuenta(organizationId);
            
            const doc = new jsPDF();
            const margin = 20;
            let y = 20;

            doc.setFontSize(18);
            doc.text("CLUB DEPORTIVO NARANAL", 105, y, { align: "center" });
            y += 10;
            doc.setFontSize(14);
            doc.text("Resumen Financiero", 105, y, { align: "center" });
            y += 8;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Período: ${formatDate(summaryRange.startDate)} al ${formatDate(summaryRange.endDate)}`, 105, y, { align: "center" });
            y += 5;
            doc.text(`Generado: ${new Date().toLocaleString('es-PY')}`, 105, y, { align: "center" });
            y += 5;

            doc.setDrawColor(200);
            doc.line(margin, y, 210 - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50);
            doc.text("Fecha", margin, y);
            doc.text("Categoría", margin + 25, y);
            doc.text("Razón / Descripción", margin + 65, y);
            doc.text("Fondo", margin + 130, y);
            doc.text("Monto", 210 - margin, y, { align: "right" });
            y += 6;
            doc.line(margin, y - 4, 210 - margin, y - 4);
            y += 2;

            doc.setFont("helvetica", "normal");
            reportData.forEach((t) => {
                if (y > 270) { doc.addPage(); y = 20; }
                const reasonStr = (t.entidades?.nombre || t.descripcion || "-").substring(0, 35);
                const montoStr = formatPDFCurrency(t.monto);

                doc.setTextColor(100);
                doc.text(formatDate(t.fecha), margin, y);
                doc.text((t.transaction_types?.nombre || "-").substring(0, 20), margin + 25, y);
                doc.text(reasonStr, margin + 65, y);
                doc.text(t.fondo || "-", margin + 130, y);
                if (t.flow === 'income') doc.setTextColor(34, 197, 94); else doc.setTextColor(239, 68, 68);
                doc.text(montoStr, 210 - margin, y, { align: "right" });
                y += 7;
            });

            y += 5;
            doc.setDrawColor(200);
            doc.line(margin, y, 210 - margin, y);
            y += 10;

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0);
            doc.text(`Total Ingresos:`, margin, y);
            doc.setTextColor(34, 197, 94);
            doc.text(formatPDFCurrency(reportStats.income), 210 - margin, y, { align: "right" });
            y += 7;
            doc.setTextColor(0);
            doc.text(`Total Egresos:`, margin, y);
            doc.setTextColor(239, 68, 68);
            doc.text(formatPDFCurrency(reportStats.expense), 210 - margin, y, { align: "right" });
            y += 7;
            doc.setTextColor(0);
            doc.text(`Saldo Período:`, margin, y);
            doc.text(formatPDFCurrency(reportStats.balance), 210 - margin, y, { align: "right" });
            y += 10;

            doc.line(margin, y, 210 - margin, y);
            y += 10;

            doc.setFontSize(10);
            doc.text("SALDOS ACTUALES EN CAJA", margin, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            accounts.filter((a: any) => a.saldo_inicial > 0).forEach((acc: any) => {
                doc.text(`• ${acc.nombre}:`, margin + 5, y);
                doc.text(formatPDFCurrency(acc.saldo_inicial), 210 - margin, y, { align: "right" });
                y += 6;
            });

            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Documento generado por ClubManager PY — Uso interno", 105, 285, { align: "center" });

            doc.save(`Resumen_${summaryRange.startDate}_${summaryRange.endDate}.pdf`);
            toast({ title: "Éxito", description: "PDF generado correctamente." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
        }
    };

    const handleSendWhatsAppSummary = async () => {
        try {
            const organizationId = profile?.organization_id || "";
            const reportData = await getTransactions(organizationId, {
                startDate: summaryRange.startDate,
                endDate: summaryRange.endDate,
                excludeCajaMovements: true,
                flow: filters.flow,
                fondo: filters.fondo,
                search: filters.search
            });

            const reportStats = await getTransactionStats(organizationId, {
                startDate: summaryRange.startDate,
                endDate: summaryRange.endDate,
                excludeCajaMovements: true,
                flow: filters.flow,
                fondo: filters.fondo,
            });

            const accounts = await getSaldosPorCuenta(organizationId);
            const periodLabel = `${formatDate(summaryRange.startDate)} al ${formatDate(summaryRange.endDate)}`;

            let message = `*Club Deportivo Naranjal — Resumen Financiero*\n`;
            message += `📅 Período: ${periodLabel}\n`;
            message += `━━━━━━━━━━━━━━━━━━━\n`;
            message += `📋 MOVIMIENTOS (${reportData.length})\n\n`;

            reportData.forEach(t => {
                const icon = t.flow === 'income' ? '✅' : '🔴';
                const ddmm = formatDate(t.fecha).substring(0, 5);
                const cat = t.transaction_types?.nombre || '-';
                const reason = t.entidades?.nombre || t.descripcion || '-';
                message += `${icon} ${ddmm} | ${cat} | ${reason} | ${formatCurrency(t.monto)}\n`;
            });

            message += `\n━━━━━━━━━━━━━━━━━━━\n`;
            message += `💰 Ingresos: ${formatCurrency(reportStats.income)}\n`;
            message += `🔴 Egresos: ${formatCurrency(reportStats.expense)}\n`;
            message += `📊 Saldo: ${formatCurrency(reportStats.balance)}\n`;
            message += `━━━━━━━━━━━━━━━━━━━\n`;
            message += `🏦 SALDOS ACTUALES EN CAJA\n`;

            accounts.filter((a: any) => a.saldo_inicial > 0).forEach((acc: any) => {
                message += `• ${acc.nombre}: ${formatCurrency(acc.saldo_inicial)}\n`;
            });

            message += `\n_Generado por ClubManager PY_`;

            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo generar el resumen.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transacciones</h2>
                    <p className="text-muted-foreground">
                        Gestiona los ingresos y egresos de la organización.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary/10">
                                <Share2 className="mr-2 h-4 w-4" />
                                Enviar Resumen
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Generar Resumen</h4>
                                    <p className="text-sm text-muted-foreground"> Seleccioná el rango para el reporte. </p>
                                </div>
                                <div className="grid gap-2 text-sm">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <span className="text-xs uppercase font-semibold">Desde</span>
                                        <Input
                                            type="date"
                                            className="col-span-2 h-8"
                                            value={summaryRange.startDate}
                                            onChange={(e) => setSummaryRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <span className="text-xs uppercase font-semibold">Hasta</span>
                                        <Input
                                            type="date"
                                            className="col-span-2 h-8"
                                            value={summaryRange.endDate}
                                            onChange={(e) => setSummaryRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Button size="sm" onClick={handleSendWhatsAppSummary} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                                        <Send className="w-3 h-3 mr-1.5" />
                                        WhatsApp
                                    </Button>
                                    <Button size="sm" onClick={generatePDF} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                        <FileText className="w-3 h-3 mr-1.5" />
                                        PDF
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={openCreateModal} className="bg-brand-primary hover:bg-brand-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Transacción
                    </Button>
                </div>
            </div>

            <TransactionStats stats={stats} />

            <TransactionTable
                data={data}
                filters={filters}
                onFilterChange={setFilters}
                onEdit={openEditModal}
                onVoid={handleVoid}
                totalBalance={totalBalance}
                accounts={formData.accounts}
            />

            <TransactionForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={editingTransaction ? handleUpdate : handleCreate}
                initialData={editingTransaction}
                formData={formData}
            />
        </div>
    );
}
