'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
    nombre_completo?: string;
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
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = useRef(createClient()).current;
    const signingOutRef = useRef(false);

    // ── Fetch profile (stable ref) ──────────────────────────────────────
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[AuthProvider] Error fetching profile:', error.message);
                return null;
            }

            if (data) {
                const nombre_completo =
                    data.nombre_completo ||
                    `${data.nombre || ''} ${data.apellido || ''}`.trim();
                return { ...data, nombre_completo } as Profile;
            }

            return null;
        } catch (err) {
            console.error('[AuthProvider] Exception in fetchProfile:', err);
            return null;
        }
    }, [supabase]);

    useEffect(() => {
        let mounted = true;

        // ── Single source of truth: onAuthStateChange ────────────────────
        // Supabase fires INITIAL_SESSION immediately upon subscription,
        // so we do NOT need a separate getSession()/getUser() call.
        // This eliminates the race condition between init and the listener.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // If we're explicitly signing out, let signOut() handle cleanup
                if (signingOutRef.current) return;

                if (session?.user) {
                    setUser(session.user);

                    // Fetch profile — use setTimeout(0) to avoid Supabase
                    // deadlock when making DB calls inside onAuthStateChange.
                    // See: https://github.com/supabase/auth-js/issues/888
                    setTimeout(async () => {
                        if (!mounted) return;
                        const profileData = await fetchProfile(session.user.id);
                        if (mounted) {
                            setProfile(profileData);
                            setIsLoading(false);
                        }
                    }, 0);
                } else {
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);

                    if (event === 'SIGNED_OUT') {
                        router.push('/login');
                        router.refresh();
                    }
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, router, fetchProfile]);

    // ── Sign out ────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        if (signingOutRef.current) return;
        signingOutRef.current = true;

        // Clean up state immediately so the UI reflects it
        setUser(null);
        setProfile(null);

        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('[AuthProvider] signOut error (forcing redirect):', err);
        }

        // Refresh server cache FIRST, then navigate
        router.refresh();
        router.push('/login');

        setTimeout(() => { signingOutRef.current = false; }, 2000);
    }, [supabase, router]);

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
