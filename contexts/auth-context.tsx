'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Profile = {
    id: string;
    organization_id: string;
    nombre: string;
    apellido: string;
    rol: string;
    email: string;
    // Add other fields as needed based on schema
    nombre_completo?: string; // Derived or field?
};

type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isLoading: true,
    signOut: async () => { },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: detect AbortError from Supabase Auth locks
// ─────────────────────────────────────────────────────────────────────────────

function isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
        return (
            error.name === 'AbortError' ||
            error.message?.includes('aborted') ||
            error.message?.includes('signal')
        );
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = useRef(createClient()).current;
    const signingOutRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        // ── Fetch profile helper ────────────────────────────────────────
        const fetchProfile = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('perfiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (!mounted) return;

                if (error) {
                    console.error('Error fetching profile:', error);
                } else if (data) {
                    const nombre_completo =
                        data.nombre_completo ||
                        `${data.nombre || ''} ${data.apellido || ''}`.trim();
                    setProfile({ ...data, nombre_completo });
                }
            } catch (err) {
                if (isAbortError(err)) return; // Silently ignore aborts
                console.error('Error in fetchProfile:', err);
            }
        };

        // ── Initialize session ──────────────────────────────────────────
        const initializeAuth = async () => {
            try {
                const { data: { session }, error: sessionError } =
                    await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    } else {
                        setUser(null);
                        setProfile(null);
                    }
                }
            } catch (err) {
                // ✅ Silently ignore AbortError from Supabase's internal locks
                if (isAbortError(err)) return;
                console.error('Error initializing auth:', err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initializeAuth();

        // ── Subscribe to auth changes (after initial check) ─────────────
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // If we're explicitly signing out, let signOut() handle everything
                if (signingOutRef.current) return;

                try {
                    if (session?.user) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    } else {
                        setUser(null);
                        setProfile(null);
                        setIsLoading(false);
                    }

                    if (event === 'SIGNED_OUT') {
                        router.refresh();
                        router.push('/login');
                    }
                } catch (err) {
                    if (isAbortError(err)) return;
                    console.error('Error in auth state change:', err);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router, supabase]);



    const signOut = async () => {
        if (signingOutRef.current) return; // Prevent double-calls
        signingOutRef.current = true;

        try {
            await supabase.auth.signOut();
        } catch (err) {
            if (isAbortError(err)) {
                console.warn('Sign-out aborted, forcing redirect.');
            } else {
                console.error('Error during sign out:', err);
            }
        }

        // Clean up local state immediately
        setUser(null);
        setProfile(null);

        // Always redirect regardless of error
        router.push('/login');
        router.refresh();

        // Reset flag after a short delay to allow re-login
        setTimeout(() => { signingOutRef.current = false; }, 1000);
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
