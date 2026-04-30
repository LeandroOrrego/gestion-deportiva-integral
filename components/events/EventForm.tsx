"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarDays, Save, Swords, Trophy } from "lucide-react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────────────────────────────────────
// Schema (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

const eventSchema = z.object({
    fecha: z.string().min(1, "La fecha es obligatoria"),
    tipo: z.enum(["Partido", "Practica"], {
        message: "Seleccioná un tipo de evento",
    }),
    categoria_id: z.string().min(1, "La categoría es obligatoria"),
    jornada: z.string().optional(),
    rival: z.string().optional(),
    resultado: z.enum(["Victoria", "Empate", "Derrota"]).optional(),
});

// Inferred type: the ONLY type used everywhere
export type EventFormValues = z.infer<typeof eventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface EventFormProps {
    categories: { id: string; nombre: string }[];
    onSubmit?: (data: EventFormValues) => Promise<void>;
    isPending?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventForm({ categories, onSubmit, isPending }: EventFormProps) {
    const form = useForm<z.infer<typeof eventSchema>>({
        resolver: zodResolver(eventSchema) as any,
        defaultValues: {
            fecha: new Date().toISOString().split("T")[0],
            tipo: "Partido",
            categoria_id: "",
            jornada: "",
            rival: "",
            resultado: undefined,
        },
    });

    const tipoSeleccionado = form.watch("tipo");

    const handleFormSubmit = async (values: EventFormValues) => {
        if (onSubmit) {
            await onSubmit(values);
        } else {
            console.log("Evento creado:", values);
        }
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="space-y-5"
            >
                {/* ── Datos del Evento ─────────────────────────────────── */}
                <Card className="rounded-2xl shadow-sm border border-border/60">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400">
                                <CalendarDays className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold tracking-tight">
                                    Datos del Evento
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Información básica del partido o práctica
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <Separator className="mx-6 mb-2 w-auto" />
                    <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Fecha */}
                            <FormField
                                control={form.control}
                                name="fecha"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Tipo */}
                            <FormField
                                control={form.control}
                                name="tipo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Evento</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccioná tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Partido">
                                                    <span className="flex items-center gap-2">
                                                        <Swords className="h-3.5 w-3.5" /> Partido
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="Practica">
                                                    <span className="flex items-center gap-2">
                                                        <Trophy className="h-3.5 w-3.5" /> Práctica
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Categoría */}
                        <FormField
                            control={form.control}
                            name="categoria_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plantel / Categoría</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccioná un plantel" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Nombre de la Jornada */}
                        <FormField
                            control={form.control}
                            name="jornada"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de la Jornada</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej: Jornada 1"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Rival - solo visible si tipo es Partido */}
                        {tipoSeleccionado === "Partido" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="rival"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rival</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ej: Club Sport Colombia"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Resultado */}
                                <FormField
                                    control={form.control}
                                    name="resultado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Resultado</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sin resultado aún" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Victoria">
                                                        <span className="flex items-center gap-2">
                                                            🏆 Victoria
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="Empate">
                                                        <span className="flex items-center gap-2">
                                                            🤝 Empate
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="Derrota">
                                                        <span className="flex items-center gap-2">
                                                            ❌ Derrota
                                                        </span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Submit ────────────────────────────────────────────── */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting || isPending}
                    className="w-full h-12 text-base font-semibold gap-2"
                >
                    {(form.formState.isSubmitting || isPending) ? (
                        <>
                            <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                            Creando evento...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Crear Evento
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}
