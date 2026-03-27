<script setup lang="ts">
import Sidebar from '@/components/layout/Sidebar.vue';
import Navbar from '@/components/layout/Navbar.vue';
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <Sidebar />
    <div class="flex-1 flex flex-col ml-64">
      <Navbar />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
