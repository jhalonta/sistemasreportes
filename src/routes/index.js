import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../features/auth/store/authStore'
import { authService } from '../features/auth/services/authService'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../features/auth/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../features/dashboard/views/DashboardView.vue')
  },
  {
    path: '/attendance',
    name: 'attendance',
    component: () => import('../features/attendance/views/AttendanceView.vue')
  },
  {
    path: '/activities',
    name: 'activities',
    component: () => import('../features/activities/views/ActivityLogView.vue')
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../features/reports/views/ReportsView.vue')
  },
  {
    path: '/personal',
    name: 'personal',
    component: () => import('../features/personal/views/PersonalListView.vue')
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../features/users/views/UserListView.vue')
  },
  {
    path: '/locations',
    name: 'locations',
    component: () => import('../features/locations/views/LocationListView.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../features/auth/views/ProfileView.vue')
  },
  {
    path: '/vehicles',
    name: 'vehicles',
    component: () => import('../features/vehicles/views/VehicleListView.vue')
  },
  {
    path: '/partidas',
    name: 'partidas',
    component: () => import('../features/partidas/views/PartidaView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize if loading
  let user = authStore.user
  if (authStore.loading) {
    user = await authService.getCurrentUser()
  }

  const isAuthenticated = !!user

  if (!to.meta.public && !isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    // Role-based access control
    const role = authStore.userProfile?.role

    // Restrictions for SEDE role
    if (role === 'sede' && ['locations', 'users'].includes(to.name)) {
      next({ name: 'dashboard' })
      return
    }

    // Restrictions for TECNICO role (just in case)
    if (role === 'tecnico' && ['locations', 'users', 'personal', 'reports', 'partidas'].includes(to.name)) {
      next({ name: 'dashboard' })
      return
    }

    next()
  }
})

export default router
