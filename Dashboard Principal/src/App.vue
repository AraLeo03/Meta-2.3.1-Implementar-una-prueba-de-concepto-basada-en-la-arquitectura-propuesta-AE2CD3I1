<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <router-link to="/" class="logo">PeerReview AI</router-link>
        <div class="user-info">
          <span class="user-name">Usuario Demo</span>
          <div class="user-avatar">UD</div>
        </div>
      </div>
    </header>
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <ToastContainer />
  </div>
</template>

<script setup>
import ToastContainer from '@/shared/components/ToastContainer.vue'
</script>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; }
.header { background: var(--white); border-bottom: 1px solid var(--border); padding: 16px 24px; position: sticky; top: 0; z-index: 100; }
.header-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 20px; font-weight: 700; color: var(--blue); text-decoration: none; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }
.user-name { font-weight: 500; font-size: 14px; }
.main { max-width: 1200px; margin: 0 auto; padding: 32px 24px; flex: 1; width: 100%; }
</style>
