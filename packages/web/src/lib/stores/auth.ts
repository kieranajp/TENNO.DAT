import { writable, derived } from 'svelte/store';
import type { AuthUser } from '$lib/api';

export type { AuthUser };

interface AuthState {
	user: AuthUser | null;
	loading: boolean;
	checked: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		loading: true,
		checked: false
	});

	return {
		subscribe,
		setUser: (user: AuthUser | null) => {
			update((state) => ({ ...state, user, loading: false, checked: true }));
		},
		setLoading: (loading: boolean) => {
			update((state) => ({ ...state, loading }));
		},
		clear: () => {
			set({ user: null, loading: false, checked: true });
		}
	};
}

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, ($auth) => $auth.user !== null);
export const needsOnboarding = derived(
	auth,
	($auth) => $auth.user !== null && !$auth.user.onboardingComplete
);
