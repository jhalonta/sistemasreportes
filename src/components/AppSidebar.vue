<script setup>
import {
  ClipboardCheck,
  PenLine,
  LayoutDashboard,
  FileText,
  Users,
  Lock,
  Building2,
  CircleUser,
  Truck,
  LogOut,
  ChevronUp,
  User,
  Settings,
  Sparkles,
  BadgeCheck,
  Bell,
  CreditCard,
  ChevronsUpDown,
  Tag
} from 'lucide-vue-next';
import { useAuthStore } from '../features/auth/store/authStore';
import { usePersonalStore } from '../features/personal/store/personalStore';
import { useLocationStore } from '../features/locations/store/locationStore';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from '@/components/ui/sidebar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';

const authStore = useAuthStore();
const techStore = usePersonalStore();
const locationStore = useLocationStore();
const router = useRouter();
const { isMobile, state } = useSidebar();

const userEmail = computed(() => authStore.user?.email || '');

onMounted(async () => {
  if (techStore.technicians.length === 0) techStore.fetchTechnicians();
  if (locationStore.locations.length === 0) locationStore.fetchLocations();
});

const userDisplayName = computed(() => {
  const profile = authStore.userProfile;
  if (!profile) return 'Invitado';

  if (profile.role === 'tecnico') {
    const tech = techStore.technicians.find(t => t.id === profile.technicianId);
    return tech ? tech.fullName : 'Técnico';
  } else if (profile.role === 'sede') {
    const sede = locationStore.locations.find(l => l.id === profile.locationId);
    return sede ? sede.nombre : 'Sede';
  } else if (profile.role === 'admin') {
    return 'Administrador';
  }
  return 'Usuario';
});

const userDisplayRole = computed(() => {
  const role = authStore.userProfile?.role;
  if (!role) return '';
  switch (role) {
    case 'admin': return 'Gestión Total';
    case 'sede': return 'Administrativo';
    case 'tecnico': return 'Operativo';
    default: return role;
  }
});

const navItems = computed(() => {
  const role = authStore.userProfile?.role;
  const items = [
    { title: 'Dashboard', to: '/', icon: LayoutDashboard },
    { title: 'Asistencia', to: '/attendance', icon: ClipboardCheck },
    { title: 'Actividades', to: '/activities', icon: PenLine },
    { title: 'Reportes', to: '/reports', icon: FileText },
  ];

  if (role === 'admin') {
    items.push({ title: 'Sedes', to: '/locations', icon: Building2 });
  }

  if (['admin', 'sede'].includes(role)) {
    items.push({ title: 'Personal', to: '/personal', icon: Users });
    items.push({ title: 'Vehículos', to: '/vehicles', icon: Truck });
    items.push({ title: 'Partidas', to: '/partidas', icon: Tag });
  }

  if (role === 'admin') {
    items.push({ title: 'Usuarios', to: '/users', icon: Lock });
  }

  return items;
});

async function handleLogout() {
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } catch (err) {
    console.error('Logout failed:', err);
  }
}
</script>

<template>
  <Sidebar collapsible="icon">
    <!-- Sidebar Header: Brand -->
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <div
              class="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 class="size-4" />
            </div>
            <div v-show="state !== 'collapsed'" class="grid flex-1 text-left text-sm leading-tight ml-2">
              <span class="truncate font-semibold italic">Consorcio Galcas</span>
              <span class="truncate text-xs opacity-70">Sistema de Gestión</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel v-show="state !== 'collapsed'">Navegación Principal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <SidebarMenuItem v-for="item in navItems" :key="item.to">
              <SidebarMenuButton as-child :tooltip="item.title">
                <router-link :to="item.to">
                  <component :is="item.icon" />
                  <span v-show="state !== 'collapsed'">{{ item.title }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar class="h-8 w-8 rounded-md">
                  <AvatarFallback
                    class="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs uppercase">
                    {{ userDisplayName.charAt(0) }}
                  </AvatarFallback>
                </Avatar>
                <div v-show="state !== 'collapsed'" class="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span class="truncate font-semibold">{{ userDisplayName }}</span>
                  <span class="truncate text-xs opacity-70">{{ userDisplayRole }}</span>
                </div>
                <ChevronsUpDown v-show="state !== 'collapsed'" class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-md"
              :side="isMobile ? 'bottom' : 'right'" :align="isMobile ? 'end' : 'start'" :side-offset="4">
              <DropdownMenuLabel class="p-0 font-normal">
                <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar class="h-8 w-8 rounded-md">
                    <AvatarFallback
                      class="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs uppercase">
                      {{ userDisplayName.charAt(0) }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">{{ userDisplayName }}</span>
                    <span class="truncate text-xs text-muted-foreground">{{ userEmail }}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @click="router.push('/profile')" class="cursor-pointer">
                  <BadgeCheck class="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="handleLogout" class="text-destructive focus:bg-destructive/10">
                <LogOut class="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped>
/* Transiciones suaves para el modo colapsado */
:deep(.router-link-active) {
  background-color: var(--sidebar-accent);
  color: var(--sidebar-accent-foreground);
  font-weight: 600;
}
</style>
