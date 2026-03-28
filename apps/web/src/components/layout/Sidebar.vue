<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { path: '/', label: 'Dashboard', icon: '&#9632;' },
  { path: '/bots', label: 'Bots', icon: '&#9881;' },
  { path: '/vps', label: 'VPS Servers', icon: '&#9729;' },
  { path: '/monitoring', label: 'Monitoring', icon: '&#9636;' },
  { path: '/tariff', label: 'Tariff', icon: '&#9733;' },
  { path: '/settings', label: 'Settings', icon: '&#9881;' },
];

function isActive(path: string) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>

<template>
  <aside class="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
    <div class="p-6 border-b border-gray-200">
      <RouterLink to="/" class="text-xl font-bold text-primary-600">
        ClawDeploy
      </RouterLink>
    </div>

    <nav class="flex-1 p-4 space-y-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isActive(item.path)
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
      >
        <span v-html="item.icon" class="w-5 text-center" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
