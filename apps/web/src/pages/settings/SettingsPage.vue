<script setup lang="ts">
import { ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { useAuth } from '@/composables/useAuth';
import { api } from '@/lib/api-client';

const { currentUser, fetchUser } = useAuth();

const name = ref(currentUser.value?.name || '');
const updateError = ref('');
const updateSuccess = ref(false);

const updateProfileMutation = useMutation({
  mutationFn: () => api('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ name: name.value }),
  }),
  onSuccess: () => {
    updateSuccess.value = true;
    fetchUser();
    setTimeout(() => { updateSuccess.value = false; }, 3000);
  },
  onError: (e: any) => { updateError.value = e.message; },
});

const currentPassword = ref('');
const newPassword = ref('');
const passwordError = ref('');
const passwordSuccess = ref(false);

const changePasswordMutation = useMutation({
  mutationFn: () => api('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    }),
  }),
  onSuccess: () => {
    passwordSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
    setTimeout(() => { passwordSuccess.value = false; }, 3000);
  },
  onError: (e: any) => { passwordError.value = e.message; },
});
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>

    <!-- Profile -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 class="font-semibold mb-4">Profile</h2>

      <div v-if="updateSuccess" class="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">Profile updated!</div>
      <div v-if="updateError" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{{ updateError }}</div>

      <form @submit.prevent="updateProfileMutation.mutate()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input :value="currentUser?.email" disabled class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input v-model="name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <button type="submit" :disabled="updateProfileMutation.isPending.value" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">
          {{ updateProfileMutation.isPending.value ? 'Saving...' : 'Save' }}
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="font-semibold mb-4">Change Password</h2>

      <div v-if="passwordSuccess" class="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">Password changed!</div>
      <div v-if="passwordError" class="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{{ passwordError }}</div>

      <form @submit.prevent="changePasswordMutation.mutate()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input v-model="currentPassword" type="password" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input v-model="newPassword" type="password" required minlength="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <button type="submit" :disabled="changePasswordMutation.isPending.value" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">
          {{ changePasswordMutation.isPending.value ? 'Changing...' : 'Change Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
