import { cn } from "@/lib/utils";

interface CurrencyProps {
    amount: number;
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    color?: "default" | "income" | "expense" | "warning" | "muted";
    className?: string;
}

export function Currency({
    amount,
    size = "md",
    color = "default",
    className
}: CurrencyProps) {
    // Custom formatter to ensure ₲ symbol and dots for thousands
    const formatted = '₲ ' + Math.round(amount).toLocaleString('es-PY').replace(/,/g, '.');

    const sizeClasses = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
    };

    const colorClasses = {
        default: "text-foreground",
        income: "text-brand-success",
        expense: "text-brand-danger",
        warning: "text-brand-warning",
        muted: "text-muted-foreground",
    };

    return (
        <span className={cn("font-mono font-medium tracking-tight", sizeClasses[size], colorClasses[color], className)}>
            {formatted}
        </span>
    );
}
