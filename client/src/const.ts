export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (email?: string) => {
  const useDevLogin = Boolean(import.meta.env.VITE_USE_DEV_LOGIN);
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const serverOrigin = import.meta.env.VITE_SERVER_ORIGIN || window.location.origin;
  const redirectUri = `${serverOrigin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (useDevLogin) {
    const url = new URL(serverOrigin + "/api/dev/login");
    if (email) url.searchParams.set("email", email);
    return url.toString();
  }
  try {
    if (!oauthPortalUrl || !appId) throw new Error("Missing OAuth config");
    const base = oauthPortalUrl.endsWith("/")
      ? oauthPortalUrl.slice(0, -1)
      : oauthPortalUrl;
    const url = new URL(`${base}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    const url = new URL(serverOrigin + "/api/dev/login");
    if (email) url.searchParams.set("email", email);
    return url.toString();
  }
};
