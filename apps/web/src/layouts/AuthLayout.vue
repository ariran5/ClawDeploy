<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">ClawDeploy</h1>
        <p class="text-gray-500 mt-2">Bot Management Platform</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <slot />
      </div>
    </div>
  </div>
</template>
