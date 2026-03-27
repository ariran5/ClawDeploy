<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { login, loading } = useAuth();
const email = ref('');
const password = ref('');
const error = ref('');

async function handleSubmit() {
  error.value = '';
  try {
    await login(email.value, password.value);
  } catch (e: any) {
    error.value = e.message || 'Login failed';
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <h2 class="text-xl font-semibold text-center">Sign In</h2>

    <div v-if="error" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
      {{ error }}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
      <input
        v-model="email"
        type="email"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        placeholder="you@example.com"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
      <input
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        placeholder="********"
      />
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
    >
      {{ loading ? 'Signing in...' : 'Sign In' }}
    </button>

    <p class="text-center text-sm text-gray-500">
      Don't have an account?
      <RouterLink to="/register" class="text-primary-600 hover:underline">Sign Up</RouterLink>
    </p>
  </form>
</template>
