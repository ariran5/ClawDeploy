import { createRouter, createWebHistory } from 'vue-router';
import { getAccessToken } from '@/lib/api-client';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { layout: 'auth', guest: true },
    },
    {
      path: '/register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { layout: 'auth', guest: true },
    },
    {
      path: '/',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/bots',
      component: () => import('@/pages/bots/BotsListPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/bots/new',
      component: () => import('@/pages/bots/BotCreateWizard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/bots/:id',
      component: () => import('@/pages/bots/BotDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vps',
      component: () => import('@/pages/vps/VpsListPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vps/:id',
      component: () => import('@/pages/vps/VpsDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/monitoring',
      component: () => import('@/pages/monitoring/MonitoringPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/billing',
      component: () => import('@/pages/billing/BillingPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      component: () => import('@/pages/settings/SettingsPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAccessToken()) {
    return '/login';
  }
  if (to.meta.guest && getAccessToken()) {
    return '/';
  }
});

export default router;
