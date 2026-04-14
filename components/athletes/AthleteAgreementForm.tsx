"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Briefcase,
    Bus,
    Trophy,
    Star,
    Save,
    ToggleLeft,
    ToggleRight,
    BadgePercent,
    Handshake,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const agreementSchema = z.object({
    // Card 1 - Costos de Fichaje
    costo_pase: z.coerce.number().min(0).default(0),
    prima_inicial: z.coerce.number().min(0).default(0),

    // Card 2 - Viáticos Fijos
    viatico_practica: z.coerce.number().min(0).default(0),
    viatico_partido: z.coerce.number().min(0).default(0),

    // Card 3 - Premios - Por Resultado
    premio_victoria: z.coerce.number().min(0).default(0),
    premio_empate: z.coerce.number().min(0).default(0),
    premio_derrota: z.coerce.number().min(0).default(0),
    premio_fijo_resultado: z.coerce.number().min(0).default(0),

    // Card 4 - Objetivos
    premio_clasificacion: z.coerce.number().min(0).default(0),
    premio_campeonato: z.coerce.number().min(0).default(0),
});

type AgreementFormValues = z.infer<typeof agreementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteAgreementFormProps {
    initialData?: Partial<AgreementFormValues>;
    athleteName?: string;
    onSubmit?: (data: AgreementFormValues) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency Input Helper
// ─────────────────────────────────────────────────────────────────────────────

function formatGuaranies(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("es-PY").format(Number(digits));
}

function parseGuaranies(formatted: string): number {
    const clean = formatted.replace(/\./g, "").replace(/,/g, "");
    return isNaN(Number(clean)) ? 0 : Number(clean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Currency Field
// ─────────────────────────────────────────────────────────────────────────────

interface CurrencyFieldProps {
    label: string;
    name: keyof AgreementFormValues;
    form: ReturnType<typeof useForm<AgreementFormValues>>;
    description?: string;
}

function CurrencyField({ label, name, form, description }: CurrencyFieldProps) {
    const [display, setDisplay] = useState<string>(() => {
        const v = form.getValues(name) as number;
        return v ? formatGuaranies(String(v)) : "";
    });

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                        {label}
                    </FormLabel>
                    <FormControl>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                                Gs.
                            </span>
                            <Input
                                inputMode="numeric"
                                placeholder="0"
                                className="pl-9 h-10 text-right font-mono text-sm tabular-nums tracking-tight"
                                value={display}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
                                    const formatted = raw ? formatGuaranies(raw) : "";
                                    setDisplay(formatted);
                                    field.onChange(parseGuaranies(formatted));
                                }}
                                onBlur={field.onBlur}
                            />
                        </div>
                    </FormControl>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
    accent = "brand",
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
    accent?: "brand" | "green" | "amber" | "purple";
}) {
    const accentClasses: Record<string, string> = {
        brand: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
        green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
        amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400",
    };

    return (
        <Card className="rounded-2xl shadow-sm border border-border/60">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${accentClasses[accent]}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold tracking-tight">
                            {title}
                        </CardTitle>
                        {description && (
                            <CardDescription className="text-xs mt-0.5">
                                {description}
                            </CardDescription>
                        )}
                    </div>
                </div>
            </CardHeader>
            <Separator className="mx-6 mb-2 w-auto" />
            <CardContent className="pt-4 space-y-4">{children}</CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AthleteAgreementForm({
    initialData,
    athleteName,
    onSubmit,
}: AthleteAgreementFormProps) {
    const [isPremioFijo, setIsPremioFijo] = useState(false);

    const form = useForm<AgreementFormValues>({
        resolver: zodResolver(agreementSchema),
        defaultValues: {
            costo_pase: 0,
            prima_inicial: 0,
            viatico_practica: 0,
            viatico_partido: 0,
            premio_victoria: 0,
            premio_empate: 0,
            premio_derrota: 0,
            premio_fijo_resultado: 0,
            premio_clasificacion: 0,
            premio_campeonato: 0,
            ...initialData,
        },
    });

    const handleFormSubmit = async (values: AgreementFormValues) => {
        if (onSubmit) {
            await onSubmit(values);
        } else {
            // Simulate async save
            await new Promise((r) => setTimeout(r, 1200));
            console.log("Acuerdo guardado:", values);
        }
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="space-y-5"
            >
                {/* Header */}
                {athleteName && (
                    <div className="flex items-center gap-2 mb-2">
                        <Handshake className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <h2 className="text-lg font-bold leading-none">{athleteName}</h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                Condiciones financieras del acuerdo vigente
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Card 1: Costos de Fichaje ─────────────────────────── */}
                <SectionCard
                    icon={Briefcase}
                    title="Costos de Fichaje"
                    description="Pagos iniciales por incorporar al jugador"
                    accent="brand"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CurrencyField
                            label="Costo de Pase"
                            name="costo_pase"
                            form={form}
                            description="Monto abonado por el pase"
                        />
                        <CurrencyField
                            label="Prima Inicial"
                            name="prima_inicial"
                            form={form}
                            description="Bono por firma del acuerdo"
                        />
                    </div>
                </SectionCard>

                {/* ── Card 2: Viáticos Fijos ────────────────────────────── */}
                <SectionCard
                    icon={Bus}
                    title="Viáticos Fijos"
                    description="Montos por asistencia a práctica y partidos"
                    accent="green"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CurrencyField
                            label="Viático de Práctica"
                            name="viatico_practica"
                            form={form}
                            description="Por sesión de entrenamiento"
                        />
                        <CurrencyField
                            label="Viático de Partido"
                            name="viatico_partido"
                            form={form}
                            description="Por presentarse a jugar"
                        />
                    </div>
                </SectionCard>

                {/* ── Card 3: Premios por Resultado ─────────────────────── */}
                <SectionCard
                    icon={Trophy}
                    title="Premios por Partido"
                    description="Bonificación según el resultado del partido"
                    accent="amber"
                >
                    {/* Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsPremioFijo((prev) => !prev)}
                        className={`
                            w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium
                            ${isPremioFijo
                                ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                            }
                        `}
                        aria-pressed={isPremioFijo}
                    >
                        <span className="text-left">
                            <span className="block text-sm font-semibold">
                                Acuerdo de premio fijo por partido
                            </span>
                            <span className="block text-xs font-normal mt-0.5 opacity-80">
                                {isPremioFijo
                                    ? "Un único monto sin importar el resultado (ej: César Días Correa)"
                                    : "Montos diferenciados por victorias, empates y derrotas"}
                            </span>
                        </span>
                        {isPremioFijo ? (
                            <ToggleRight className="h-6 w-6 shrink-0 text-amber-500" />
                        ) : (
                            <ToggleLeft className="h-6 w-6 shrink-0 opacity-40" />
                        )}
                    </button>

                    {/* Conditional Fields */}
                    {isPremioFijo ? (
                        <div className="pt-1">
                            <CurrencyField
                                label="Premio Fijo (cualquier resultado)"
                                name="premio_fijo_resultado"
                                form={form}
                                description="Monto único sin distinción de resultado"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                            <CurrencyField
                                label="🏆 Victoria"
                                name="premio_victoria"
                                form={form}
                            />
                            <CurrencyField
                                label="🤝 Empate"
                                name="premio_empate"
                                form={form}
                            />
                            <CurrencyField
                                label="❌ Derrota"
                                name="premio_derrota"
                                form={form}
                            />
                        </div>
                    )}
                </SectionCard>

                {/* ── Card 4: Premios por Objetivos ─────────────────────── */}
                <SectionCard
                    icon={Star}
                    title="Premios por Objetivos"
                    description="Bonus por logros deportivos del equipo"
                    accent="purple"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CurrencyField
                            label="Premio Clasificación"
                            name="premio_clasificacion"
                            form={form}
                            description="Por pasar de fase o ronda"
                        />
                        <CurrencyField
                            label="Premio Campeonato"
                            name="premio_campeonato"
                            form={form}
                            description="Por salir campeón"
                        />
                    </div>
                </SectionCard>

                {/* ── Submit ────────────────────────────────────────────── */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                    className="w-full h-12 text-base font-semibold gap-2"
                >
                    {form.formState.isSubmitting ? (
                        <>
                            <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                            Guardando acuerdo...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Guardar Acuerdo
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}
