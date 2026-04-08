"use client";

import { Currency } from "@/components/ui/currency";
import { StatusBadge } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DesignPreviewPage() {
    return (
        <div className="container mx-auto py-10 space-y-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold font-display text-brand-primary">Design System Preview</h1>
                    <p className="text-muted-foreground mt-2">ClubManager PY - Typography, Colors, and Components</p>
                </div>
                <ThemeToggle />
            </div>

            {/* Typography Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">1. Typography</h2>
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Headings (DM Sans)</p>
                        <h1 className="text-4xl font-bold font-display">Heading 1 - DM Sans Bold</h1>
                        <h2 className="text-3xl font-bold font-display">Heading 2 - DM Sans Bold</h2>
                        <h3 className="text-2xl font-medium font-display">Heading 3 - DM Sans Medium</h3>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Body (Geist Sans)</p>
                        <p className="text-base">
                            The quick brown fox jumps over the lazy dog. This is the default body text using Geist Sans.
                            It is optimized for legibility and UI interfaces.
                        </p>
                        <p className="text-sm">Small text for captions and secondary information.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Monospace (Geist Mono)</p>
                        <p className="font-mono text-sm">此1234567890 - Code snippets and financial data.</p>
                    </div>
                </div>
            </section>

            {/* Colors Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">2. Brand Colors</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ColorSwatch name="brand-primary" className="bg-brand-primary" />
                    <ColorSwatch name="brand-secondary" className="bg-brand-secondary" />
                    <ColorSwatch name="brand-accent" className="bg-brand-accent" />
                    <ColorSwatch name="brand-success" className="bg-brand-success" />
                    <ColorSwatch name="brand-warning" className="bg-brand-warning" />
                    <ColorSwatch name="brand-danger" className="bg-brand-danger" />
                    <ColorSwatch name="brand-info" className="bg-brand-info" />
                </div>
            </section>

            {/* Currency Component */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">3. Components: Currency</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Sizes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end gap-4">
                                <Currency amount={150000} size="sm" />
                                <Currency amount={150000} size="md" />
                                <Currency amount={150000} size="lg" />
                                <Currency amount={150000} size="xl" />
                                <Currency amount={150000} size="2xl" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between">
                                    <span>Default</span>
                                    <Currency amount={150000} color="default" />
                                </div>
                                <div className="flex justify-between">
                                    <span>Income (Success)</span>
                                    <Currency amount={2500000} color="income" />
                                </div>
                                <div className="flex justify-between">
                                    <span>Expense (Danger)</span>
                                    <Currency amount={-150000} color="expense" />
                                </div>
                                <div className="flex justify-between">
                                    <span>Muted</span>
                                    <Currency amount={5000} color="muted" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Status Badge Component */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">4. Components: StatusBadge</h2>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Transacciones</h3>
                    <div className="flex flex-wrap gap-4">
                        <StatusBadge status="pending" />
                        <StatusBadge status="pre_confirmed" />
                        <StatusBadge status="confirmed" />
                        <StatusBadge status="voided" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Atletas</h3>
                    <div className="flex flex-wrap gap-4">
                        <StatusBadge status="active" />
                        <StatusBadge status="inactive" />
                        <StatusBadge status="loaned" />
                        <StatusBadge status="transferred" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Eventos</h3>
                    <div className="flex flex-wrap gap-4">
                        <StatusBadge status="planned" />
                        <StatusBadge status="in_progress" />
                        <StatusBadge status="pre_closed" />
                        <StatusBadge status="closed" />
                    </div>
                </div>
            </section>
        </div>
    );
}

function ColorSwatch({ name, className }: { name: string; className: string }) {
    return (
        <div className="space-y-1.5">
            <div className={`h-12 w-full rounded-md shadow-sm border ${className}`} />
            <div className="text-xs font-mono text-muted-foreground">{name}</div>
        </div>
    );
}
