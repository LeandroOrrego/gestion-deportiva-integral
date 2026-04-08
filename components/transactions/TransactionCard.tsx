import { Transaction } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarDays, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface TransactionCardProps {
    transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
    // Safe access to nested properties in case join fails or data is missing
    const isIncome = transaction.concepto?.tipo === 'INGRESO';
    const title = transaction.concepto?.nombre || 'Sin concepto';
    const description = transaction.descripcion;

    return (
        <Card className={cn(
            "border-l-4 transition-all hover:shadow-md",
            isIncome ? "border-l-green-500" : "border-l-red-500"
        )}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-medium leading-none">
                            {title}
                        </CardTitle>
                        {description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{description}</p>
                        )}
                    </div>
                    {isIncome ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn(
                    "text-2xl font-bold",
                    isIncome ? "text-green-600" : "text-red-600"
                )}>
                    {/* Handle undefined amount safely */}
                    {isIncome ? '+' : '-'} {Math.abs(transaction.monto || 0).toLocaleString('es-PY')} Gs.
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground pt-0 flex gap-2 items-center">
                <CalendarDays className="h-3 w-3" />
                <span suppressHydrationWarning>
                    {new Date(transaction.fecha).toLocaleDateString('es-PY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        timeZone: 'UTC'
                    })}
                </span>
            </CardFooter>
        </Card>
    );
}
