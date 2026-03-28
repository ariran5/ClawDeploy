import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, setTokens, clearTokens, getAccessToken } from '@/lib/api-client';
import type { User, LoginResponse } from '@clawdeploy/shared';

const currentUser = ref<User | null>(null);
const loading = ref(false);

export function useAuth() {
  const router = useRouter();
  const isAuthenticated = computed(() => !!currentUser.value || !!getAccessToken());

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await api<{ success: boolean; data: LoginResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      currentUser.value = res.data.user;
      router.push('/');
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string, name: string) {
    loading.value = true;
    try {
      const res = await api<{ success: boolean; data: LoginResponse }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      currentUser.value = res.data.user;
      router.push('/');
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    if (!getAccessToken()) return;
    try {
      const res = await api<{ success: boolean; data: User }>('/auth/me');
      currentUser.value = res.data;
    } catch {
      clearTokens();
      currentUser.value = null;
    }
  }

  function logout() {
    clearTokens();
    currentUser.value = null;
    router.push('/login');
  }

  return { currentUser, loading, isAuthenticated, login, register, fetchUser, logout };
}
