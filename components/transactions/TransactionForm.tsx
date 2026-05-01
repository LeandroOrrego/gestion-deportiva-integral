
"use client";

import { todayLocal } from "@/lib/utils/date";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const transactionSchema = z.object({
    fecha: z.string().min(1, "La fecha es requerida"),
    flow: z.enum(["income", "expense"]),
    fondo: z.enum(["deportivo", "administrativo"]),
    monto: z.string().min(1, "El monto es requerido").transform(v => v.replace(/\./g, '')),
    transaction_type_id: z.string().min(1, "La categoría financiera es requerida"),
    category_id: z.string().optional(),
    entidad_id: z.string().optional(),
    cuenta_id: z.string().min(1, "La cuenta es requerida"),
    comprobante_numero: z.string().optional(),
    descripcion: z.string().optional(),
    evento_id: z.string().optional(),
    cantidad: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    formData: {
        types: any[];
        categories: any[];
        accounts: any[];
        entities: any[];
        eventos?: any[];
    };
}

export function TransactionForm({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    formData
}: TransactionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            fecha: todayLocal(),
            flow: "income",
            fondo: "deportivo",
            monto: "",
            transaction_type_id: "",
            category_id: "",
            entidad_id: "",
            cuenta_id: "",
            comprobante_numero: "",
            descripcion: "",
            evento_id: "",
            cantidad: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                monto: initialData.monto.toString(),
                category_id: initialData.category_id || "",
                entidad_id: initialData.entidad_id || "",
                comprobante_numero: initialData.comprobante_numero || "",
                descripcion: initialData.descripcion || "",
                evento_id: initialData.evento_id || "",
                cantidad: initialData.cantidad ? String(initialData.cantidad) : "",
                fecha: initialData.fecha?.split('T')[0] || todayLocal()
            });
        } else {
            form.reset({
                fecha: todayLocal(),
                flow: "income",
                fondo: "deportivo",
                monto: "",
                transaction_type_id: "",
                category_id: "",
                entidad_id: "",
                cuenta_id: "",
                comprobante_numero: "",
                descripcion: "",
                evento_id: "",
                cantidad: "",
            });
        }
    }, [initialData, form, open]);

    const handleFormSubmit = async (values: TransactionFormValues) => {
        setIsSubmitting(true);
        try {
            // Sanitizar campos opcionales UUID/Integer para evitar errores de tipo en Supabase
            const sanitized = {
                ...values,
                evento_id: (values.evento_id && values.evento_id !== "" && values.evento_id !== "none") ? values.evento_id : null,
                cantidad: (values.cantidad && values.cantidad !== "") ? parseInt(values.cantidad, 10) : null,
                category_id: (values.category_id && values.category_id !== "" && values.category_id !== "none") ? values.category_id : null,
                entidad_id: (values.entidad_id && values.entidad_id !== "" && values.entidad_id !== "none") ? values.entidad_id : null,
            };
            await onSubmit(sanitized);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
        const raw = e.target.value.replace(/\D/g, '');
        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        onChange(formatted);
    };

    const currentFlow = form.watch("flow");
    const filteredTypes = formData.types.filter(t => t.flow === currentFlow);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[480px] p-0 flex flex-col h-full"
            >
                <div className="flex-1 overflow-y-auto">
                    <SheetHeader className="p-6 pb-2">
                        <SheetTitle className="text-xl">
                            {initialData ? "Editar Transacción" : "Nueva Transacción"}
                        </SheetTitle>
                        <SheetDescription>
                            {initialData ? "Modifique los detalles de la transacción existente." : "Registrá un ingreso o egreso en el sistema."}
                        </SheetDescription>
                    </SheetHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                            <div className="p-6 space-y-6">
                                {/* Datos Principales */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Datos Principales</h4>

                                    <div className="grid grid-cols-2 gap-5">
                                        <FormField
                                            control={form.control}
                                            name="fecha"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Fecha</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" className="px-4 py-3 h-auto" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="flow"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tipo de Movimiento</FormLabel>
                                                    <FormControl>
                                                        <div className="flex rounded-md p-1 bg-muted/30 border">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className={cn(
                                                                    "flex-1 h-9 text-xs transition-all",
                                                                    field.value === 'income'
                                                                        ? "bg-green-500/20 text-green-600 border border-green-500/30 hover:bg-green-500/30 hover:text-green-700 dark:text-green-400"
                                                                        : "text-muted-foreground hover:bg-transparent"
                                                                )}
                                                                onClick={() => field.onChange('income')}
                                                            >
                                                                Ingreso
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className={cn(
                                                                    "flex-1 h-9 text-xs transition-all",
                                                                    field.value === 'expense'
                                                                        ? "bg-red-500/20 text-red-600 border border-red-500/30 hover:bg-red-500/30 hover:text-red-700 dark:text-red-400"
                                                                        : "text-muted-foreground hover:bg-transparent"
                                                                )}
                                                                onClick={() => field.onChange('expense')}
                                                            >
                                                                Egreso
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="monto"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Monto (₲)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="0"
                                                        className="text-lg font-medium px-4 py-3 h-auto"
                                                        {...field}
                                                        onChange={(e) => handleMontoChange(e, field.onChange)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="fondo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fondo Afectado</FormLabel>
                                                <FormControl>
                                                    <div className="flex rounded-md p-1 bg-muted/30 border">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className={cn(
                                                                "flex-1 h-9 text-xs transition-all",
                                                                field.value === 'deportivo'
                                                                    ? "bg-blue-500/20 text-blue-600 border border-blue-500/30 hover:bg-blue-500/30 hover:text-blue-700 dark:text-blue-400"
                                                                    : "text-muted-foreground hover:bg-transparent"
                                                            )}
                                                            onClick={() => field.onChange('deportivo')}
                                                        >
                                                            Deportivo
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className={cn(
                                                                "flex-1 h-9 text-xs transition-all",
                                                                field.value === 'administrativo'
                                                                    ? "bg-gray-500/20 text-gray-700 border border-gray-500/30 hover:bg-gray-500/30 dark:text-gray-300"
                                                                    : "text-muted-foreground hover:bg-transparent"
                                                            )}
                                                            onClick={() => field.onChange('administrativo')}
                                                        >
                                                            Administrativo
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                {/* Clasificación */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clasificación</h4>

                                    <FormField
                                        control={form.control}
                                        name="transaction_type_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría Financiera</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="px-4 py-3 h-auto">
                                                            <SelectValue placeholder="Seleccione categoría" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {filteredTypes.map(t => (
                                                            <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="entidad_id"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Razón / Entidad (Opcional)</FormLabel>
                                                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={comboboxOpen}
                                                                className={cn(
                                                                    "w-full justify-between h-auto px-4 py-3 font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? formData.entities.find((e) => e.id === field.value)?.nombre
                                                                    : "Buscar entidad o persona..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar..." />
                                                            <CommandList>
                                                                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        value="none"
                                                                        onSelect={() => {
                                                                            form.setValue("entidad_id", "none");
                                                                            setComboboxOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                field.value === "none" ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        Ninguna
                                                                    </CommandItem>
                                                                    {formData.entities.map((entidad) => (
                                                                        <CommandItem
                                                                            key={entidad.id}
                                                                            value={entidad.nombre}
                                                                            onSelect={() => {
                                                                                form.setValue("entidad_id", entidad.id);
                                                                                setComboboxOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    field.value === entidad.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {entidad.nombre}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-5">
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Plantel (Opcional)</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="px-4 py-3 h-auto">
                                                                <SelectValue placeholder="-" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">Ninguno</SelectItem>
                                                            {formData.categories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="cuenta_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cuenta</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="px-4 py-3 h-auto">
                                                                <SelectValue placeholder="Cuenta" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {formData.accounts.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <FormField
                                            control={form.control}
                                            name="evento_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Jornada Deportiva (Opcional)</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="px-4 py-3 h-auto">
                                                                <SelectValue placeholder="-" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">Ninguno</SelectItem>
                                                            {formData.eventos?.map(e => {
                                                                const label = e.jornada
                                                                    ? e.jornada
                                                                    : `${format(new Date(e.fecha + 'T12:00:00'), 'dd/MM/yyyy')} - ${e.tipo} vs ${e.rival || "ND"}`;
                                                                return (
                                                                    <SelectItem key={e.id} value={e.id}>{label}</SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="cantidad"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cantidad / Unidades</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Opcional" className="px-4 py-3 h-auto" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Detalles Adicionales */}
                                <div className="space-y-5 pb-20">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Detalles Adicionales</h4>

                                    <FormField
                                        control={form.control}
                                        name="comprobante_numero"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Comprobante N° (Opcional)</FormLabel>
                                                <FormControl>
                                                    <Input className="px-4 py-3 h-auto" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="descripcion"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descripción / Notas</FormLabel>
                                                <FormControl>
                                                    <Textarea className="resize-none min-h-[100px] px-4 py-3" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="sticky bottom-0 border-t bg-background p-6 mt-auto">
                                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-12 text-base font-semibold">
                                    {isSubmitting ? "Guardando..." : (initialData ? "Guardar Cambios" : "Crear Transacción")}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
