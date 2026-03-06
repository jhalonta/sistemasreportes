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
    component: () => import('../components/DashboardView.vue')
  },
  {
    path: '/attendance',
    name: 'attendance',
    component: () => import('../features/attendance/views/AttendanceView.vue')
  },
  {
    path: '/activities',
    name: 'activities',
    component: () => import('../components/ActivityLog.vue')
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../components/ReportsView.vue')
  },
  {
    path: '/technicians',
    name: 'technicians',
    component: () => import('../features/technicians/views/TechnicianListView.vue')
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../features/auth/views/UserListView.vue')
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Wait for auth to fully initialize (including profile fetch)
  if (authStore.loading) {
    await authStore.initialized
  }

  const isAuthenticated = !!authStore.user && !!authStore.userProfile

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
    if (role === 'tecnico' && ['locations', 'users', 'technicians', 'reports'].includes(to.name)) {
      next({ name: 'dashboard' })
      return
    }

    next()
  }
})

export default router
