'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                setError(error.message);
                // "Invalid login credentials" is common, map to Spanish
                if (error.message.includes('Invalid login credentials')) {
                    setError('Credenciales incorrectas. Verificá tu correo y contraseña.');
                }
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Ocurrió un error inesperado al iniciar sesión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm shadow-lg rounded-2xl border-none">
            <CardHeader className="text-center space-y-2 pb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10">
                    <span className="text-3xl" role="img" aria-label="soccer ball">⚽</span>
                </div>
                <CardTitle className="text-2xl font-bold font-display text-brand-primary">
                    ClubManager PY
                </CardTitle>
                <CardDescription className="text-base">
                    Iniciar sesión
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="nombre@club.com"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-brand-primary hover:bg-brand-secondary font-medium"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Ingresando...
                            </>
                        ) : (
                            'Ingresar'
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center pb-6">
                <Link
                    href="/reset-password"
                    className="text-sm text-muted-foreground hover:text-brand-primary transition-colors"
                >
                    ¿Olvidaste tu contraseña?
                </Link>
            </CardFooter>
        </Card>
    );
}
