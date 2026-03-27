<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { VpsServer } from '@openclaw/shared';

const queryClient = useQueryClient();
const showForm = ref(false);

const { data, isLoading } = useQuery({
  queryKey: ['vps'],
  queryFn: () => api<{ success: boolean; data: VpsServer[] }>('/vps'),
});

const form = ref({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  authMethod: 'password' as 'password' | 'key',
  credential: '',
});

const createMutation = useMutation({
  mutationFn: () => api('/vps', {
    method: 'POST',
    body: JSON.stringify(form.value),
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vps'] });
    showForm.value = false;
    form.value = { name: '', host: '', port: 22, username: 'root', authMethod: 'password', credential: '' };
  },
});

const testMutation = useMutation({
  mutationFn: (vpsId: string) => api<{ success: boolean; data: { connected: boolean } }>(`/vps/${vpsId}/test`, { method: 'POST' }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vps'] }),
});

const statusColors: Record<string, string> = {
  pending: 'bg-gray-400',
  connecting: 'bg-yellow-400',
  active: 'bg-green-400',
  unreachable: 'bg-red-400',
  error: 'bg-red-600',
};
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">VPS Servers</h1>
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
      >
        {{ showForm ? 'Cancel' : '+ Add Server' }}
      </button>
    </div>

    <!-- Add form -->
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 class="font-semibold mb-4">Add VPS Server</h2>
      <form @submit.prevent="createMutation.mutate()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
          <input v-model="form.name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="My VPS Server" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Host (IP)</label>
            <input v-model="form.host" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="123.45.67.89" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input v-model.number="form.port" type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input v-model="form.username" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Auth Method</label>
            <select v-model="form.authMethod" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="password">Password</option>
              <option value="key">SSH Key</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ form.authMethod === 'password' ? 'Password' : 'Private Key' }}
          </label>
          <textarea
            v-if="form.authMethod === 'key'"
            v-model="form.credential"
            rows="4"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none font-mono text-sm"
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
          />
          <input
            v-else
            v-model="form.credential"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <button
          type="submit"
          :disabled="createMutation.isPending.value"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {{ createMutation.isPending.value ? 'Adding...' : 'Add Server' }}
        </button>
      </form>
    </div>

    <!-- List -->
    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <div v-else-if="!data?.data?.length && !showForm" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p class="text-gray-500 mb-4">No VPS servers added yet.</p>
      <button @click="showForm = true" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
        Add Server
      </button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="vps in data?.data"
        :key="vps.id"
        class="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <div class="w-3 h-3 rounded-full" :class="statusColors[vps.status]" />
          <div>
            <RouterLink :to="`/vps/${vps.id}`" class="font-semibold hover:text-primary-600">{{ vps.name }}</RouterLink>
            <p class="text-sm text-gray-500">{{ vps.host }}:{{ vps.port }}</p>
          </div>
        </div>
        <button
          @click="testMutation.mutate(vps.id)"
          :disabled="testMutation.isPending.value"
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Test Connection
        </button>
      </div>
    </div>
  </div>
</template>
