<script setup>
import { useRoute } from 'vue-router';
import { Sun, Moon } from 'lucide-vue-next';
import { SidebarTrigger } from '@/components/ui/sidebar';

defineProps({
  isDark: Boolean,
});
defineEmits(['toggleTheme']);

const route = useRoute();
</script>

<template>
  <header
    class="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-300">
    <div class="flex items-center gap-3">
      <SidebarTrigger class="-ml-1 h-8 w-8 rounded-md border bg-background hover:bg-muted" />
      <div class="h-4 w-px bg-border mx-1"></div>
      <div class="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <span class="hover:text-foreground cursor-pointer transition-colors">Plataforma</span>
        <span class="text-[8px] opacity-40">/</span>
        <span class="text-foreground font-black">{{ route.name?.toUpperCase() || 'INICIO' }}</span>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button @click="$emit('toggleTheme')"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground shadow-sm active:scale-95"
        title="Cambiar Tema">
        <Sun v-if="isDark" :size="16" />
        <Moon v-else :size="16" />
      </button>
    </div>
  </header>
</template>

<style scoped>
/* Transiciones sutiles para el header */
</style>
