<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { Subscription } from '@clawdeploy/shared';

const { data, isLoading } = useQuery({
  queryKey: ['subscription'],
  queryFn: () => api<{ success: boolean; data: Subscription }>('/billing/subscription'),
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Tariff</h1>

    <div v-if="isLoading" class="text-gray-500">Loading...</div>

    <template v-else>
      <!-- Current plan -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Free: Your Resources -->
        <div class="bg-white rounded-xl border-2 border-primary-500 ring-2 ring-primary-200 p-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Active</span>
          </div>
          <h3 class="text-xl font-bold">Your Resources</h3>
          <p class="text-3xl font-bold mt-2 text-primary-600">Free</p>
          <p class="text-sm text-gray-500 mt-1">Use your own VPS servers and OpenRouter API keys</p>

          <ul class="mt-6 space-y-3">
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              Up to {{ data?.data?.maxBots || 1000 }} bots
            </li>
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              Up to {{ data?.data?.maxVpsServers || 100 }} VPS servers
            </li>
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              Unlimited messages
            </li>
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              All LLM models via OpenRouter
            </li>
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              Full monitoring & logs
            </li>
            <li class="text-sm text-gray-700 flex items-center gap-2">
              <span class="text-green-500 text-lg">&#10003;</span>
              AES-256 encryption
            </li>
          </ul>

          <div class="mt-6 p-3 bg-primary-50 rounded-lg text-sm text-primary-700">
            You provide your own VPS and OpenRouter API key. No limits, no fees.
          </div>
        </div>

        <!-- Managed: Coming Soon -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 opacity-60 relative">
          <div class="absolute top-4 right-4">
            <span class="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-bold uppercase">Coming Soon</span>
          </div>
          <h3 class="text-xl font-bold">Managed</h3>
          <p class="text-3xl font-bold mt-2 text-gray-400">Pay-as-you-go</p>
          <p class="text-sm text-gray-500 mt-1">We provide servers and API tokens, you just use the bots</p>

          <ul class="mt-6 space-y-3">
            <li class="text-sm text-gray-500 flex items-center gap-2">
              <span class="text-gray-300 text-lg">&#10003;</span>
              No VPS setup required
            </li>
            <li class="text-sm text-gray-500 flex items-center gap-2">
              <span class="text-gray-300 text-lg">&#10003;</span>
              No API keys needed
            </li>
            <li class="text-sm text-gray-500 flex items-center gap-2">
              <span class="text-gray-300 text-lg">&#10003;</span>
              Pay only for tokens used
            </li>
            <li class="text-sm text-gray-500 flex items-center gap-2">
              <span class="text-gray-300 text-lg">&#10003;</span>
              Auto-scaling infrastructure
            </li>
            <li class="text-sm text-gray-500 flex items-center gap-2">
              <span class="text-gray-300 text-lg">&#10003;</span>
              Priority support
            </li>
          </ul>

          <button disabled class="mt-6 w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>

      <!-- How it works -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h3 class="font-semibold mb-4">How "Your Resources" works</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div class="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mb-2">1</div>
            <p class="font-medium">Add your VPS</p>
            <p class="text-gray-500 mt-1">Any VPS with SSH access. Hetzner, DigitalOcean, Vultr — any provider works.</p>
          </div>
          <div>
            <div class="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mb-2">2</div>
            <p class="font-medium">Get an OpenRouter key</p>
            <p class="text-gray-500 mt-1">Register at openrouter.ai, create an API key. Set your own spending limits.</p>
          </div>
          <div>
            <div class="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mb-2">3</div>
            <p class="font-medium">Deploy bots</p>
            <p class="text-gray-500 mt-1">Create a bot, pick a model, connect Telegram — hit deploy. Done.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
