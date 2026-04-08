import { supabase } from '@/lib/supabase';
import { NewTransactionSheet } from '@/components/transactions/NewTransactionSheet';
import { TransactionsTable } from '@/components/transactions/TransactionsTable';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
    const { data: transactions, error } = await supabase
        .from('transacciones')
        .select(`
      id,
      monto,
      fecha,
      descripcion,
      concepto:conceptos_finanzas (
        nombre,
        tipo
      )
    `)
        .order('fecha', { ascending: false })
        .limit(1000);

    if (error) {
        console.error("Error fetching transactions:", error);
    }

    // Normalizar datos para la tabla
    const normalizedTransactions = (transactions || []).map((t: any) => ({
        id: t.id,
        monto: t.monto,
        fecha: t.fecha,
        descripcion: t.descripcion,
        concepto: Array.isArray(t.concepto) ? t.concepto[0] : t.concepto
    }));

    return (
        <div className="flex flex-col h-full space-y-6 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Transacciones</h1>
                    <p className="text-muted-foreground">Listado completo de ingresos y egresos.</p>
                </div>
                <NewTransactionSheet />
            </div>

            <TransactionsTable transactions={normalizedTransactions} />
        </div>
    );
}
