import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => {
                set({ user, token, isAuthenticated: true });
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                }
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                }
            },

            getRole: () => {
                const user = get().user;
                return user?.role || 'citizen';
            },

            isAdmin: () => get().user?.role === 'admin',
            isReviewer: () => get().user?.role === 'reviewer',
            isCitizen: () => get().user?.role === 'citizen',
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
