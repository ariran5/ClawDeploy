<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';

const { currentUser, logout } = useAuth();
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
    <div />
    <div class="flex items-center gap-4">
      <span class="text-sm text-gray-600">{{ currentUser?.name || currentUser?.email }}</span>
      <button
        @click="logout"
        class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>
