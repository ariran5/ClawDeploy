<script setup lang="ts">
import { ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';

const days = ref(30);

const { data: costs, isLoading } = useQuery({
  queryKey: ['costs', days],
  queryFn: () => api<{ success: boolean; data: Array<{ date: string; totalCost: string; totalTokens: number; messageCount: number }> }>(`/monitoring/costs?days=${days.value}`),
});

const { data: usage } = useQuery({
  queryKey: ['usage'],
  queryFn: () => api<{ success: boolean; data: { totalTokens: number; totalCost: string; messageCount: number } }>('/monitoring/usage'),
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Monitoring</h1>
      <select v-model="days" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="90">Last 90 days</option>
      </select>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-sm text-gray-500">Total Tokens</p>
        <p class="text-2xl font-bold text-purple-700">{{ (usage?.data?.totalTokens ?? 0).toLocaleString() }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-sm text-gray-500">Total Cost</p>
        <p class="text-2xl font-bold text-orange-700">${{ parseFloat(usage?.data?.totalCost ?? '0').toFixed(4) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-sm text-gray-500">Messages</p>
        <p class="text-2xl font-bold text-blue-700">{{ usage?.data?.messageCount ?? 0 }}</p>
      </div>
    </div>

    <!-- Daily breakdown -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="font-semibold mb-4">Daily Breakdown</h2>

      <div v-if="isLoading" class="text-gray-500">Loading...</div>

      <div v-else-if="!costs?.data?.length" class="text-gray-500 text-sm">
        No usage data yet.
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="pb-2 font-medium">Date</th>
            <th class="pb-2 font-medium">Messages</th>
            <th class="pb-2 font-medium">Tokens</th>
            <th class="pb-2 font-medium text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in costs.data" :key="day.date" class="border-b border-gray-100">
            <td class="py-2">{{ day.date }}</td>
            <td class="py-2">{{ day.messageCount }}</td>
            <td class="py-2">{{ day.totalTokens.toLocaleString() }}</td>
            <td class="py-2 text-right">${{ parseFloat(day.totalCost).toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
