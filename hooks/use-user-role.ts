import { useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'OBSERVADOR' | 'USER' | null;

export function useUserRole() {
    const [role, setRole] = useState<UserRole>('ADMIN'); // Default to ADMIN for dev
    const [loading, setLoading] = useState(false);

    // TODO: Connect to Supabase Auth and Profiles
    // useEffect(() => {
    //   async function fetchRole() {
    //      const { data: { user } } = await supabase.auth.getUser();
    //      // fetch profile...
    //   }
    //   fetchRole();
    // }, []);

    return { role, loading };
}
