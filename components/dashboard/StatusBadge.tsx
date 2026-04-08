import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variants: Record<string, string> = {
        confirmed: "bg-green-100 text-green-700 border-green-200",
        pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
        cancelled: "bg-red-100 text-red-700 border-red-200",
        voided: "bg-gray-100 text-gray-700 border-gray-200",
    };

    const labels: Record<string, string> = {
        confirmed: "Confirmado",
        pending: "Pendiente",
        cancelled: "Cancelado",
        voided: "Anulado",
    };

    return (
        <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variants[status] || "bg-gray-100 text-gray-800",
            className
        )}>
            {labels[status] || status}
        </span>
    );
}
