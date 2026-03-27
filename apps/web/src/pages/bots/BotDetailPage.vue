<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { Bot, BotConfig } from '@openclaw/shared';

const route = useRoute();
const queryClient = useQueryClient();
const botId = route.params.id as string;
const activeTab = ref('overview');

const { data: botData, isLoading } = useQuery({
  queryKey: ['bot', botId],
  queryFn: () => api<{ success: boolean; data: Bot }>(`/bots/${botId}`),
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

const deployMutation = useMutation({
  mutationFn: () => api(`/bots/${botId}/deploy`, { method: 'POST', body: '{}' }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot', botId] }),
});

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
          <button
            @click="deployMutation.mutate()"
            :disabled="deployMutation.isPending.value || botData.data.status === 'draft'"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            Deploy
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

        <!-- OpenClaw Config Preview -->
        <div v-if="botData.data.openclawConfig" class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="font-semibold mb-4">openclaw.json</h3>
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
  </div>
</template>
