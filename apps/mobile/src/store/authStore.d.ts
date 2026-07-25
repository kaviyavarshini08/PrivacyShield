import { User } from '@privacyshield/shared';
export declare const API_URL: string;
interface AuthState {
    user: User | null;
    accessToken: string | null;
    mfaRequiredEmail: string | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<{
        status: string;
        message?: string;
    }>;
    verifyMfa: (code: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
