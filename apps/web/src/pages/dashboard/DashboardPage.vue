<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';

const { data: dashboard, isLoading } = useQuery({
  queryKey: ['dashboard'],
  queryFn: () => api<{ success: boolean; data: { totalBots: number; runningBots: number; todayCost: string; todayTokens: number } }>('/monitoring/dashboard'),
});

type DashboardData = { totalBots: number; runningBots: number; todayCost: string; todayTokens: number };

const stats: Array<{ key: keyof DashboardData; label: string; color: string }> = [
  { key: 'totalBots', label: 'Total Bots', color: 'bg-blue-50 text-blue-700' },
  { key: 'runningBots', label: 'Running', color: 'bg-green-50 text-green-700' },
  { key: 'todayTokens', label: 'Tokens Today', color: 'bg-purple-50 text-purple-700' },
  { key: 'todayCost', label: 'Cost Today ($)', color: 'bg-orange-50 text-orange-700' },
];
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.key"
        class="bg-white rounded-xl border border-gray-200 p-6"
      >
        <p class="text-sm text-gray-500 mb-1">{{ stat.label }}</p>
        <p class="text-2xl font-bold" :class="stat.color.split(' ')[1]">
          {{ dashboard?.data?.[stat.key] ?? 0 }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="font-semibold mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <RouterLink to="/bots/new" class="block w-full text-left px-4 py-3 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
            + Create New Bot
          </RouterLink>
          <RouterLink to="/vps" class="block w-full text-left px-4 py-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
            Manage VPS Servers
          </RouterLink>
          <RouterLink to="/monitoring" class="block w-full text-left px-4 py-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors">
            View Usage & Costs
          </RouterLink>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="font-semibold mb-4">Getting Started</h2>
        <ol class="space-y-3 text-sm text-gray-600">
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span>Add your VPS server</span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span>Get your OpenRouter API key</span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span>Create a bot and configure models</span>
          </li>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <span>Connect Telegram and deploy</span>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>
