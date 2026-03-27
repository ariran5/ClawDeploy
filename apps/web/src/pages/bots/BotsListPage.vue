<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { Bot } from '@openclaw/shared';

const { data, isLoading } = useQuery({
  queryKey: ['bots'],
  queryFn: () => api<{ success: boolean; data: Bot[]; pagination: any }>('/bots'),
});

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
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Bots</h1>
      <RouterLink
        to="/bots/new"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        + New Bot
      </RouterLink>
    </div>

    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <div v-else-if="!data?.data?.length" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p class="text-gray-500 mb-4">No bots yet. Create your first bot to get started.</p>
      <RouterLink
        to="/bots/new"
        class="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
      >
        Create Bot
      </RouterLink>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="bot in data.data"
        :key="bot.id"
        :to="`/bots/${bot.id}`"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-gray-900">{{ bot.name }}</h3>
          <span
            class="px-2 py-0.5 rounded-full text-xs font-medium"
            :class="statusColors[bot.status] || 'bg-gray-100 text-gray-600'"
          >
            {{ bot.status }}
          </span>
        </div>
        <p v-if="bot.description" class="text-sm text-gray-500 mb-3 line-clamp-2">
          {{ bot.description }}
        </p>
        <p class="text-xs text-gray-400">
          Created {{ new Date(bot.createdAt).toLocaleDateString() }}
        </p>
      </RouterLink>
    </div>
  </div>
</template>
