'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpensePieChartProps {
    data: {
        name: string;
        value: number;
    }[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

export function ExpensePieChart({ data }: ExpensePieChartProps) {
    // Solo tomar las 5 categorías principales y agrupar el resto
    const processData = () => {
        const sorted = [...data].sort((a, b) => b.value - a.value);
        if (sorted.length <= 5) return sorted;
        const top5 = sorted.slice(0, 5);
        const otherVal = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
        return [...top5, { name: 'Otros', value: otherVal }];
    };

    const chartData = processData();

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Distribución de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `Gs. ${value.toLocaleString('es-PY')}`} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
