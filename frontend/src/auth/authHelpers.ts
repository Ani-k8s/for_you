/**
 * Centralized authentication helpers
 */

export const getAccessToken = () => {
  return localStorage.getItem("access");
};

export const isAuthenticated = () => {
  return !!getAccessToken();
};

export const getDashboardRoute = (role: string | undefined) => {
  console.log("[Auth] Determining dashboard route for role:", role);
  switch (role) {
    case 'super_admin':
      return '/dashboard/super-admin';
    case 'gym_owner':
      return '/dashboard/owner';
    case 'staff':
      return '/dashboard/trainer';
    case 'member':
      return '/dashboard/member';
    default:
      return '/';
  }
};
