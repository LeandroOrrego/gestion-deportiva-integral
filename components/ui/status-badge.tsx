import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
    | "pending" | "pre_confirmed" | "confirmed" | "voided"
    | "active" | "inactive" | "loaned" | "transferred"
    | "planned" | "in_progress" | "pre_closed" | "closed";

interface StatusBadgeProps {
    status: string; // Using string to allow flexibility, but checked against map
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config: Record<string, { label: string; className: string }> = {
        // Transacciones
        pending: { label: "Pendiente", className: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200 dark:text-yellow-400 dark:border-yellow-900" },
        pre_confirmed: { label: "Pre-confirmado", className: "bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 border-cyan-200 dark:text-cyan-400 dark:border-cyan-900" },
        confirmed: { label: "Confirmado", className: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 dark:text-green-400 dark:border-green-900" },
        voided: { label: "Anulado", className: "bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200 dark:text-red-400 dark:border-red-900" },

        // Atletas
        active: { label: "Activo", className: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 dark:text-green-400 dark:border-green-900" },
        inactive: { label: "Inactivo", className: "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-200 dark:text-gray-400 dark:border-gray-800" },
        loaned: { label: "Cedido", className: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200 dark:text-blue-400 dark:border-blue-900" },
        transferred: { label: "Transferido", className: "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-200 dark:text-orange-400 dark:border-orange-900" },

        // Eventos
        planned: { label: "Planificado", className: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200 dark:text-blue-400 dark:border-blue-900" },
        in_progress: { label: "En curso", className: "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200 dark:text-yellow-400 dark:border-yellow-900" },
        pre_closed: { label: "Pre-cerrado", className: "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-200 dark:text-orange-400 dark:border-orange-900" },
        closed: { label: "Cerrado", className: "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 dark:text-green-400 dark:border-green-900" },
    };

    const statusConfig = config[status] || { label: status, className: "bg-gray-100 text-gray-800" };

    return (
        <Badge variant="outline" className={cn("font-medium border", statusConfig.className, className)}>
            {statusConfig.label}
        </Badge>
    );
}
