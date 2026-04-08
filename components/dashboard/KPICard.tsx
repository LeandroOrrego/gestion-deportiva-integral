import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | React.ReactNode;
    icon: LucideIcon;
    subtext?: string;
    trend?: "up" | "down" | "neutral";
    amount?: number;
    className?: string;
}

export function KPICard({ title, value, icon: Icon, subtext, trend, amount, className }: KPICardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtext && (
                    <p className="text-xs text-muted-foreground">
                        {subtext}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
