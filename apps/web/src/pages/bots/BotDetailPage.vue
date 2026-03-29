<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { Bot, BotConfig } from '@clawdeploy/shared';

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const botId = route.params.id as string;
const activeTab = ref('overview');
const showDeleteModal = ref(false);
const deleteError = ref<string | null>(null);

const { data: botData, isLoading } = useQuery({
  queryKey: ['bot', botId],
  queryFn: () => api<{ success: boolean; data: Bot }>(`/bots/${botId}`),
});

// Sync actual status from VPS on page load
useQuery({
  queryKey: ['bot-sync', botId],
  queryFn: async () => {
    const res = await api<{ success: boolean; data: Bot }>(`/bots/${botId}/sync`);
    queryClient.setQueryData(['bot', botId], res);
    return res;
  },
  staleTime: 0,
});

const { data: configData } = useQuery({
  queryKey: ['bot-config', botId],
  queryFn: () => api<{ success: boolean; data: BotConfig | null }>(`/bots/${botId}/config`),
});

const { data: telegramData } = useQuery({
  queryKey: ['bot-telegram', botId],
  queryFn: () => api<{ success: boolean; data: any }>(`/telegram/bots/${botId}`),
});

const allowedUsersInput = ref('');

// Initialize allowedUsersInput when telegram data loads
useQuery({
  queryKey: ['bot-telegram-init', botId],
  queryFn: async () => {
    const res = await api<{ success: boolean; data: any }>(`/telegram/bots/${botId}`);
    if (res.data?.allowedUsers?.length) {
      allowedUsersInput.value = res.data.allowedUsers.join(', ');
    }
    return res;
  },
});

const invalidateBot = () => queryClient.invalidateQueries({ queryKey: ['bot', botId] });

const deployMutation = useMutation({
  mutationFn: () => api(`/bots/${botId}/deploy`, { method: 'POST', body: '{}' }),
  onSuccess: invalidateBot,
});

const startMutation = useMutation({
  mutationFn: () => api(`/bots/${botId}/start`, { method: 'POST', body: '{}' }),
  onSuccess: invalidateBot,
});

const stopMutation = useMutation({
  mutationFn: () => api(`/bots/${botId}/stop`, { method: 'POST', body: '{}' }),
  onSuccess: invalidateBot,
});

const restartMutation = useMutation({
  mutationFn: () => api(`/bots/${botId}/restart`, { method: 'POST', body: '{}' }),
  onSuccess: invalidateBot,
});

const deleteMutation = useMutation({
  mutationFn: (force: boolean) => api(`/bots/${botId}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  onSuccess: () => router.push('/bots'),
  onError: (err: any) => {
    deleteError.value = err?.message || 'Delete failed';
  },
});

const anyActionPending = () =>
  deployMutation.isPending.value || startMutation.isPending.value ||
  stopMutation.isPending.value || restartMutation.isPending.value ||
  deleteMutation.isPending.value;

const saveAllowedUsersMutation = useMutation({
  mutationFn: () => {
    const users = allowedUsersInput.value.trim()
      ? allowedUsersInput.value.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    return api(`/telegram/bots/${botId}/allowed-users`, {
      method: 'PATCH',
      body: JSON.stringify({ allowedUsers: users }),
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bot-telegram', botId] });
    queryClient.invalidateQueries({ queryKey: ['bot', botId] });
  },
});

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'config', label: 'Configuration' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'logs', label: 'Logs' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  configured: 'bg-blue-100 text-blue-700',
  deploying: 'bg-yellow-100 text-yellow-700',
  running: 'bg-green-100 text-green-700',
  stopped: 'bg-red-100 text-red-600',
  error: 'bg-red-100 text-red-700',
};
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <template v-else-if="botData?.data">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ botData.data.name }}</h1>
          <p v-if="botData.data.description" class="text-gray-500 mt-1">{{ botData.data.description }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="statusColors[botData.data.status]"
          >
            {{ botData.data.status }}
          </span>

          <!-- Start (only when stopped) -->
          <button
            v-if="botData.data.status === 'stopped'"
            @click="startMutation.mutate()"
            :disabled="anyActionPending()"
            class="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {{ startMutation.isPending.value ? 'Starting...' : 'Start' }}
          </button>

          <!-- Stop (only when running) -->
          <button
            v-if="botData.data.status === 'running'"
            @click="stopMutation.mutate()"
            :disabled="anyActionPending()"
            class="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
          >
            {{ stopMutation.isPending.value ? 'Stopping...' : 'Stop' }}
          </button>

          <!-- Restart (only when running) -->
          <button
            v-if="botData.data.status === 'running'"
            @click="restartMutation.mutate()"
            :disabled="anyActionPending()"
            class="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {{ restartMutation.isPending.value ? 'Restarting...' : 'Restart' }}
          </button>

          <!-- Deploy -->
          <button
            @click="deployMutation.mutate()"
            :disabled="anyActionPending() || botData.data.status === 'draft'"
            class="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {{ deployMutation.isPending.value ? 'Deploying...' : botData.data.status === 'running' ? 'Redeploy' : 'Deploy' }}
          </button>

          <!-- Delete -->
          <button
            @click="showDeleteModal = true"
            :disabled="anyActionPending()"
            class="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <div class="flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="pb-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.id
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab: Overview -->
      <div v-if="activeTab === 'overview'" class="space-y-4">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="font-semibold mb-4">Bot Info</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Status</span>
              <p class="font-medium">{{ botData.data.status }}</p>
            </div>
            <div>
              <span class="text-gray-500">Created</span>
              <p class="font-medium">{{ new Date(botData.data.createdAt).toLocaleString() }}</p>
            </div>
            <div>
              <span class="text-gray-500">Model</span>
              <p class="font-medium">{{ configData?.data?.primaryModel || 'Not configured' }}</p>
            </div>
            <div>
              <span class="text-gray-500">Telegram</span>
              <p class="font-medium">{{ telegramData?.data?.telegramUsername ? `@${telegramData.data.telegramUsername}` : 'Not connected' }}</p>
            </div>
          </div>
        </div>

        <div v-if="botData.data.lastError" class="bg-red-50 border border-red-200 rounded-xl p-4">
          <p class="text-sm font-medium text-red-700">Last Error</p>
          <p class="text-sm text-red-600 mt-1">{{ botData.data.lastError }}</p>
        </div>

        <!-- ClawDeploy Config Preview -->
        <div v-if="botData.data.openclawConfig" class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="font-semibold mb-4">Bot Config</h3>
          <pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto">{{ JSON.stringify(botData.data.openclawConfig, null, 2) }}</pre>
        </div>
      </div>

      <!-- Tab: Config -->
      <div v-if="activeTab === 'config'" class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold mb-4">Configuration</h3>
        <div v-if="configData?.data" class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Primary Model</span>
            <span class="font-medium">{{ configData.data.primaryModel }}</span>
          </div>
          <div v-if="configData.data.fallbackModel" class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Fallback Model</span>
            <span class="font-medium">{{ configData.data.fallbackModel }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Max Tokens/Request</span>
            <span class="font-medium">{{ configData.data.maxTokensPerRequest }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Temperature</span>
            <span class="font-medium">{{ configData.data.temperature }}</span>
          </div>
          <div v-if="configData.data.systemPrompt" class="py-2">
            <span class="text-gray-500 block mb-2">System Prompt</span>
            <p class="bg-gray-50 p-3 rounded-lg">{{ configData.data.systemPrompt }}</p>
          </div>
        </div>
        <div v-else class="text-gray-500">
          Not configured yet. <RouterLink :to="`/bots/new`" class="text-primary-600 hover:underline">Set up configuration</RouterLink>
        </div>
      </div>

      <!-- Tab: Telegram -->
      <div v-if="activeTab === 'telegram'" class="space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="font-semibold mb-4">Telegram Connection</h3>
          <div v-if="telegramData?.data" class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b">
              <span class="text-gray-500">Username</span>
              <span class="font-medium">@{{ telegramData.data.telegramUsername }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-gray-500">Bot Name</span>
              <span class="font-medium">{{ telegramData.data.botName }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-gray-500">Verified</span>
              <span class="font-medium">{{ telegramData.data.isVerified ? 'Yes' : 'No' }}</span>
            </div>
          </div>
          <div v-else class="text-gray-500">
            Telegram not connected.
          </div>
        </div>

        <!-- Allowed Users -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="font-semibold mb-2">Allowed Users</h3>
          <p class="text-sm text-gray-500 mb-4">Telegram usernames or user IDs that can interact with this bot. Leave empty to allow everyone.</p>

          <div class="space-y-3">
            <div>
              <textarea
                v-model="allowedUsersInput"
                rows="3"
                placeholder="username1, 123456789, username2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none text-sm"
              />
            </div>

            <div v-if="telegramData?.data?.allowedUsers?.length" class="flex flex-wrap gap-2">
              <span
                v-for="user in telegramData.data.allowedUsers"
                :key="user"
                class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
              >
                {{ user }}
              </span>
            </div>
            <div v-else class="text-xs text-gray-400">
              No restrictions — all users can interact with this bot.
            </div>

            <button
              @click="saveAllowedUsersMutation.mutate()"
              :disabled="saveAllowedUsersMutation.isPending.value"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saveAllowedUsersMutation.isPending.value ? 'Saving...' : 'Save Allowed Users' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab: Logs -->
      <div v-if="activeTab === 'logs'" class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold mb-4">Message Logs</h3>
        <p class="text-sm text-gray-500">Logs will appear here once the bot starts processing messages.</p>
      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="showDeleteModal = false" />
        <div class="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Bot</h3>
          <p class="text-sm text-gray-600 mb-4">
            This will stop the bot, remove its container and files from the VPS, and delete all data from the database. This action cannot be undone.
          </p>

          <div v-if="deleteError" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-red-700">{{ deleteError }}</p>
            <button
              @click="deleteMutation.mutate(true)"
              :disabled="deleteMutation.isPending.value"
              class="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {{ deleteMutation.isPending.value ? 'Deleting...' : 'Force Delete (skip VPS cleanup)' }}
            </button>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="showDeleteModal = false; deleteError = null"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              @click="deleteMutation.mutate(false)"
              :disabled="deleteMutation.isPending.value"
              class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {{ deleteMutation.isPending.value ? 'Deleting...' : 'Delete Bot' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
