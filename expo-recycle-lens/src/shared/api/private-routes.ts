// /shared/api/private-routes.ts
export const PRIVATE_ROUTES = {
  me: "/users/me",
  editUser: "/users",
  changePassword: "/users/change-password",
  uploadAvatar: "/users/upload-avatar",
  likedArticles: "/articles/liked",
  analyzeWaste: "/vision/analyze-waste",
  visionHistory: "/vision/my",
} as const;

