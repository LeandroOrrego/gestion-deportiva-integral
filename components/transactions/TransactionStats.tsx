
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Currency } from "@/components/ui/currency";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

interface TransactionStatsProps {
    stats: {
        income: number;
        expense: number;
        balance: number;
    };
}

export function TransactionStats({ stats }: TransactionStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Ingresos del Período</p>
                        <Currency amount={stats.income} className="text-2xl font-bold text-brand-success" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <ArrowUpRight className="h-6 w-6" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Egresos del Período</p>
                        <Currency amount={stats.expense} className="text-2xl font-bold text-brand-danger" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <ArrowDownRight className="h-6 w-6" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Saldo del Período</p>
                        <Currency amount={stats.balance} className="text-2xl font-bold" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Wallet className="h-6 w-6" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
