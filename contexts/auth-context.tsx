'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Get current session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    // No session
                    setUser(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setIsLoading(false);
            }

            // Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    if (!profile || profile.id !== session.user.id) {
                        await fetchProfile(session.user.id);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);
                }

                if (event === 'SIGNED_OUT') {
                    router.refresh();
                    router.push('/login');
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        };

        initializeAuth();
    }, [router]); // supabase is stable

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else if (data) {
                // Construct nombre_completo if not present
                const nombre_completo = data.nombre_completo || `${data.nombre || ''} ${data.apellido || ''}`.trim();
                setProfile({ ...data, nombre_completo });
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
