export function getRequiredRoleUrl(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/system")) return "/dashboard/system";
  if (pathname.startsWith("/dashboard/user-group")) return "/dashboard/user-group";
  if (pathname.startsWith("/dashboard/analytics")) return "/dashboard/analytics";
  if (pathname.startsWith("/dashboard")) return "/dashboard";

  // Content module: granular page-level URL mapping
  if (pathname.startsWith("/content/post/add")) return "/content/post/add";
  if (pathname.startsWith("/content/post/edit")) return "/content/post/edit";
  if (pathname.startsWith("/content/post/detail")) return "/content/post/detail";
  if (pathname.startsWith("/content/post")) return "/content/post";

  if (pathname.startsWith("/content/page/add")) return "/content/page/add";
  if (pathname.startsWith("/content/page/edit")) return "/content/page/edit";
  if (pathname.startsWith("/content/page/detail")) return "/content/page/detail";
  if (pathname.startsWith("/content/page")) return "/content/page";

  if (pathname.startsWith("/content/category/add")) return "/content/category/add";
  if (pathname.startsWith("/content/category/edit")) return "/content/category/edit";
  if (pathname.startsWith("/content/category")) return "/content/category";

  if (pathname.startsWith("/content/media/add")) return "/content/media/add";
  if (pathname.startsWith("/content/media/detail")) return "/content/media/detail";
  if (pathname.startsWith("/content/media")) return "/content/media";

  if (pathname.startsWith("/content/ad/add")) return "/content/ad/add";
  if (pathname.startsWith("/content/ad/edit")) return "/content/ad/edit";
  if (pathname.startsWith("/content/ad")) return "/content/ad";

  if (pathname.startsWith("/content")) return "/content";

  if (pathname.startsWith("/system/redirects")) return "/system/redirects";
  if (pathname.startsWith("/system/users")) return "/system/users";
  if (pathname.startsWith("/system/group")) return "/system/group";
  if (pathname.startsWith("/system/logs")) return "/system/logs";
  if (pathname.startsWith("/system")) return "/system";
  return null;
}

export function hasAccess(pathname: string, roleUrls: string[]): boolean {
  const required = getRequiredRoleUrl(pathname);
  if (!required) return true;
  return roleUrls.some((url) => url === required || url.startsWith(required + "/"));
}
