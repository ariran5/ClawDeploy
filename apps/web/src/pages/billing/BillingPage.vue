<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { Subscription, Plan } from '@clawdeploy/shared';

const queryClient = useQueryClient();

const { data, isLoading } = useQuery({
  queryKey: ['subscription'],
  queryFn: () => api<{ success: boolean; data: Subscription }>('/billing/subscription'),
});

const subscribeMutation = useMutation({
  mutationFn: (plan: Plan) => api('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription'] }),
});

const plans = [
  { id: 'free' as Plan, name: 'Free', price: '$0', bots: 1, vps: 1, features: ['1 bot', '1 VPS server', 'Basic monitoring'] },
  { id: 'starter' as Plan, name: 'Starter', price: '$9', bots: 5, vps: 3, features: ['5 bots', '3 VPS servers', 'Full monitoring', 'Priority support'] },
  { id: 'pro' as Plan, name: 'Pro', price: '$29', bots: 20, vps: 10, features: ['20 bots', '10 VPS servers', 'Advanced analytics', 'API access'] },
  { id: 'enterprise' as Plan, name: 'Enterprise', price: '$99', bots: 100, vps: 50, features: ['100 bots', '50 VPS servers', 'Custom integrations', 'Dedicated support'] },
];
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Billing</h1>

    <!-- Current plan -->
    <div v-if="!isLoading && data?.data" class="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 class="font-semibold mb-2">Current Plan</h2>
      <p class="text-lg font-bold text-primary-600 capitalize">{{ data.data.plan }}</p>
      <p class="text-sm text-gray-500">{{ data.data.maxBots }} bots, {{ data.data.maxVpsServers }} VPS servers</p>
    </div>

    <!-- Plans -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="bg-white rounded-xl border p-6"
        :class="data?.data?.plan === plan.id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'"
      >
        <h3 class="font-semibold text-lg">{{ plan.name }}</h3>
        <p class="text-2xl font-bold mt-2">{{ plan.price }}<span class="text-sm font-normal text-gray-500">/mo</span></p>

        <ul class="mt-4 space-y-2">
          <li v-for="feature in plan.features" :key="feature" class="text-sm text-gray-600 flex items-center gap-2">
            <span class="text-green-500">&#10003;</span>
            {{ feature }}
          </li>
        </ul>

        <button
          @click="subscribeMutation.mutate(plan.id)"
          :disabled="data?.data?.plan === plan.id || subscribeMutation.isPending.value"
          class="mt-6 w-full py-2 rounded-lg text-sm font-medium transition-colors"
          :class="data?.data?.plan === plan.id
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700'"
        >
          {{ data?.data?.plan === plan.id ? 'Current Plan' : 'Select' }}
        </button>
      </div>
    </div>
  </div>
</template>
