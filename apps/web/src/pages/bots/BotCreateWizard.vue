<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/lib/api-client';
import type { VpsServer } from '@openclaw/shared';

const router = useRouter();
const queryClient = useQueryClient();

const currentStep = ref(1);
const totalSteps = 5;

// Step 1: VPS
const selectedVpsId = ref<string | null>(null);
const newVps = ref({ name: '', host: '', port: 22, username: 'root', authMethod: 'password' as const, credential: '' });

const { data: vpsList } = useQuery({
  queryKey: ['vps'],
  queryFn: () => api<{ success: boolean; data: VpsServer[] }>('/vps'),
});

// Step 2: OpenRouter
const openrouterKey = ref('');
const keyValidation = ref<{ valid: boolean; credits?: any } | null>(null);

const validateKeyMutation = useMutation({
  mutationFn: (apiKey: string) => api<{ success: boolean; data: { valid: boolean; credits?: any } }>('/openrouter/validate-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  }),
  onSuccess: (data) => { keyValidation.value = data.data; },
});

// Step 3: Bot Config
const botName = ref('');
const primaryModel = ref('anthropic/claude-sonnet-4-6');
const fallbackModel = ref('');
const maxTokensPerRequest = ref(4096);
const maxTokensPerDay = ref<number | null>(null);
const temperature = ref('0.7');
const systemPrompt = ref('');

const { data: models } = useQuery({
  queryKey: ['openrouter-models'],
  queryFn: () => api<{ success: boolean; data: any[] }>('/openrouter/models'),
});

// Step 4: Telegram
const telegramToken = ref('');
const allowedUsers = ref('');
const telegramVerified = ref<{ telegramUsername: string; botName: string } | null>(null);

const verifyTelegramMutation = useMutation({
  mutationFn: (botToken: string) => api<{ success: boolean; data: any }>('/telegram/verify', {
    method: 'POST',
    body: JSON.stringify({ botToken }),
  }),
  onSuccess: (data) => { telegramVerified.value = data.data; },
});

// Step 5: Deploy
const createBotMutation = useMutation({
  mutationFn: async () => {
    // Create bot
    const botRes = await api<{ success: boolean; data: { id: string } }>('/bots', {
      method: 'POST',
      body: JSON.stringify({
        name: botName.value,
        vpsId: selectedVpsId.value,
      }),
    });

    const botId = botRes.data.id;

    // Set config
    await api(`/bots/${botId}/config`, {
      method: 'PUT',
      body: JSON.stringify({
        openrouterKey: openrouterKey.value,
        primaryModel: primaryModel.value,
        fallbackModel: fallbackModel.value || null,
        maxTokensPerRequest: maxTokensPerRequest.value,
        maxTokensPerDay: maxTokensPerDay.value,
        temperature: temperature.value,
        systemPrompt: systemPrompt.value || null,
      }),
    });

    // Set telegram if provided
    if (telegramToken.value) {
      await api(`/telegram/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify({
          botToken: telegramToken.value,
          allowedUsers: allowedUsers.value.trim() ? allowedUsers.value.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        }),
      });
    }

    return botId;
  },
  onSuccess: (botId) => {
    queryClient.invalidateQueries({ queryKey: ['bots'] });
    router.push(`/bots/${botId}`);
  },
});

const stepTitles = ['VPS Server', 'OpenRouter Key', 'Bot Config', 'Telegram', 'Review & Deploy'];

function nextStep() {
  if (currentStep.value < totalSteps) currentStep.value++;
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--;
}

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return !!selectedVpsId.value;
    case 2: return keyValidation.value?.valid === true;
    case 3: return botName.value.length > 0 && primaryModel.value.length > 0;
    case 4: return true; // Telegram is optional
    case 5: return true;
    default: return false;
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Create New Bot</h1>

    <!-- Stepper -->
    <div class="flex items-center gap-2 mb-8">
      <template v-for="(title, i) in stepTitles" :key="i">
        <div
          class="flex items-center gap-2"
          :class="i + 1 <= currentStep ? 'text-primary-600' : 'text-gray-400'"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            :class="i + 1 < currentStep ? 'bg-primary-600 text-white'
              : i + 1 === currentStep ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
              : 'bg-gray-100 text-gray-400'"
          >
            {{ i + 1 }}
          </div>
          <span class="text-sm font-medium hidden md:block">{{ title }}</span>
        </div>
        <div v-if="i < stepTitles.length - 1" class="flex-1 h-px bg-gray-200" />
      </template>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <!-- Step 1: VPS -->
      <div v-if="currentStep === 1" class="space-y-4">
        <h2 class="text-lg font-semibold">Select VPS Server</h2>
        <p class="text-sm text-gray-500">Choose where to deploy your OpenClaw bot.</p>

        <div v-if="vpsList?.data?.length" class="space-y-2">
          <label
            v-for="vps in vpsList.data"
            :key="vps.id"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
            :class="selectedVpsId === vps.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input type="radio" :value="vps.id" v-model="selectedVpsId" class="accent-primary-600" />
            <div>
              <p class="font-medium">{{ vps.name }}</p>
              <p class="text-sm text-gray-500">{{ vps.host }}:{{ vps.port }} ({{ vps.provider }})</p>
            </div>
          </label>
        </div>

        <div v-else class="text-sm text-gray-500">
          No VPS servers added yet.
          <RouterLink to="/vps" class="text-primary-600 hover:underline">Add a VPS server first</RouterLink>
        </div>
      </div>

      <!-- Step 2: OpenRouter Key -->
      <div v-if="currentStep === 2" class="space-y-4">
        <h2 class="text-lg font-semibold">OpenRouter API Key</h2>
        <p class="text-sm text-gray-500">Enter your OpenRouter API key to power AI responses.</p>

        <div>
          <input
            v-model="openrouterKey"
            type="password"
            placeholder="sk-or-..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          @click="validateKeyMutation.mutate(openrouterKey)"
          :disabled="!openrouterKey || validateKeyMutation.isPending.value"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {{ validateKeyMutation.isPending.value ? 'Validating...' : 'Validate Key' }}
        </button>

        <div v-if="keyValidation?.valid" class="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Key is valid! Credits: ${{ keyValidation.credits?.total_credits?.toFixed(2) || '0.00' }}
        </div>
        <div v-if="keyValidation && !keyValidation.valid" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          Invalid API key. Please check and try again.
        </div>
      </div>

      <!-- Step 3: Bot Config -->
      <div v-if="currentStep === 3" class="space-y-4">
        <h2 class="text-lg font-semibold">Bot Configuration</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bot Name</label>
          <input v-model="botName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="My Bot" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Primary Model</label>
          <select v-model="primaryModel" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
            <option v-for="model in models?.data?.slice(0, 50)" :key="model.id" :value="model.id">
              {{ model.name || model.id }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fallback Model (optional)</label>
          <select v-model="fallbackModel" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">None</option>
            <option v-for="model in models?.data?.slice(0, 50)" :key="model.id" :value="model.id">
              {{ model.name || model.id }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Tokens/Request</label>
            <input v-model.number="maxTokensPerRequest" type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
            <input v-model="temperature" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">System Prompt (optional)</label>
          <textarea v-model="systemPrompt" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="You are a helpful assistant..." />
        </div>
      </div>

      <!-- Step 4: Telegram -->
      <div v-if="currentStep === 4" class="space-y-4">
        <h2 class="text-lg font-semibold">Connect Telegram Bot</h2>
        <p class="text-sm text-gray-500">Optional. Create a bot via @BotFather and paste the token.</p>

        <div>
          <input
            v-model="telegramToken"
            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          @click="verifyTelegramMutation.mutate(telegramToken)"
          :disabled="!telegramToken || verifyTelegramMutation.isPending.value"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {{ verifyTelegramMutation.isPending.value ? 'Verifying...' : 'Verify Bot' }}
        </button>

        <div v-if="telegramVerified" class="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Bot verified: @{{ telegramVerified.telegramUsername }} ({{ telegramVerified.botName }})
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Allowed Telegram Users (comma-separated usernames or IDs)</label>
          <input
            v-model="allowedUsers"
            placeholder="username1, 123456789, username2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <p class="text-xs text-gray-400 mt-1">Leave empty to allow everyone, or specify who can use this bot</p>
        </div>
      </div>

      <!-- Step 5: Review -->
      <div v-if="currentStep === 5" class="space-y-4">
        <h2 class="text-lg font-semibold">Review & Deploy</h2>

        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Bot Name</span>
            <span class="font-medium">{{ botName }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Primary Model</span>
            <span class="font-medium">{{ primaryModel }}</span>
          </div>
          <div v-if="fallbackModel" class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Fallback Model</span>
            <span class="font-medium">{{ fallbackModel }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Telegram</span>
            <span class="font-medium">{{ telegramVerified ? `@${telegramVerified.telegramUsername}` : 'Not connected' }}</span>
          </div>
          <div class="flex justify-between py-2 border-b">
            <span class="text-gray-500">Max Tokens/Request</span>
            <span class="font-medium">{{ maxTokensPerRequest }}</span>
          </div>
        </div>

        <button
          @click="createBotMutation.mutate()"
          :disabled="createBotMutation.isPending.value"
          class="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {{ createBotMutation.isPending.value ? 'Creating...' : 'Create Bot' }}
        </button>

        <div v-if="createBotMutation.error.value" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {{ (createBotMutation.error.value as any)?.message || 'Failed to create bot' }}
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between mt-6">
      <button
        @click="prevStep"
        :disabled="currentStep === 1"
        class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Back
      </button>
      <button
        v-if="currentStep < totalSteps"
        @click="nextStep"
        :disabled="!canProceed"
        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
</template>
