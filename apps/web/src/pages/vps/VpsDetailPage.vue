<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { VpsServer, VpsHealth } from '@clawdeploy/shared';

const route = useRoute();
const vpsId = route.params.id as string;

const { data: vpsData, isLoading } = useQuery({
  queryKey: ['vps', vpsId],
  queryFn: () => api<{ success: boolean; data: VpsServer }>(`/vps/${vpsId}`),
});

const { data: healthData } = useQuery({
  queryKey: ['vps-health', vpsId],
  queryFn: () => api<{ success: boolean; data: VpsHealth }>(`/vps/${vpsId}/health`),
  retry: false,
});

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <template v-else-if="vpsData?.data">
      <div class="flex items-center gap-3 mb-6">
        <RouterLink to="/vps" class="text-gray-500 hover:text-gray-700">&larr; Back</RouterLink>
        <h1 class="text-2xl font-bold">{{ vpsData.data.name }}</h1>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="font-semibold mb-4">Server Info</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b"><span class="text-gray-500">Host</span><span class="font-medium">{{ vpsData.data.host }}</span></div>
            <div class="flex justify-between py-2 border-b"><span class="text-gray-500">Port</span><span class="font-medium">{{ vpsData.data.port }}</span></div>
            <div class="flex justify-between py-2 border-b"><span class="text-gray-500">Username</span><span class="font-medium">{{ vpsData.data.username }}</span></div>
            <div class="flex justify-between py-2 border-b"><span class="text-gray-500">Provider</span><span class="font-medium">{{ vpsData.data.provider }}</span></div>
            <div class="flex justify-between py-2"><span class="text-gray-500">Status</span><span class="font-medium">{{ vpsData.data.status }}</span></div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="font-semibold mb-4">Health</h2>
          <div v-if="healthData?.data" class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-500">CPU</span>
                <span>{{ healthData.data.cpuUsage.toFixed(1) }}%</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 bg-blue-500 rounded-full" :style="{ width: `${healthData.data.cpuUsage}%` }" /></div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-500">Memory</span>
                <span>{{ formatBytes(healthData.data.memoryUsage) }} / {{ formatBytes(healthData.data.memoryTotal) }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 bg-purple-500 rounded-full" :style="{ width: `${(healthData.data.memoryUsage / healthData.data.memoryTotal * 100)}%` }" /></div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-500">Disk</span>
                <span>{{ formatBytes(healthData.data.diskUsage) }} / {{ formatBytes(healthData.data.diskTotal) }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 bg-orange-500 rounded-full" :style="{ width: `${(healthData.data.diskUsage / healthData.data.diskTotal * 100)}%` }" /></div>
            </div>
            <div class="text-sm text-gray-500 mt-2">Uptime: {{ formatUptime(healthData.data.uptime) }}</div>
          </div>
          <div v-else class="text-sm text-gray-500">Unable to fetch health data. Server may be unreachable.</div>
        </div>
      </div>
    </template>
  </div>
</template>
