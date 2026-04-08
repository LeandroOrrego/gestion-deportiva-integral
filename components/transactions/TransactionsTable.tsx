"use client";

import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Transaction {
    id: number;
    monto: number;
    fecha: string;
    descripcion: string | null;
    concepto: {
        nombre: string;
        tipo: "INGRESO" | "EGRESO";
    };
}

interface TransactionsTableProps {
    transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
    // Ordenar y formatear para visualización
    const formattedTransactions = useMemo(() => {
        return transactions.map((t) => ({
            ...t,
            dateObj: new Date(t.fecha),
        }));
    }, [transactions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Categoría / Concepto</TableHead>
                            <TableHead>Descripción / Razón</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Monto (Gs.)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formattedTransactions.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                    {format(t.dateObj, "dd/MM/yyyy", { locale: es })}
                                </TableCell>
                                <TableCell>{t.concepto?.nombre || "-"}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={t.descripcion || ""}>
                                    {t.descripcion || "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={t.concepto?.tipo === "INGRESO" ? "default" : "destructive"}>
                                        {t.concepto?.tipo}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-bold whitespace-nowrap ${t.concepto?.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.concepto?.tipo === "EGRESO" ? "- " : "+ "}
                                    {t.monto.toLocaleString("es-PY")}
                                </TableCell>
                            </TableRow>
                        ))}
                        {formattedTransactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No se encontraron transacciones.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
