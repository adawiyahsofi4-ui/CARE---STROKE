/* Global app config for frontend usage.
 * Fill values from your .env manually for static deployments.
 */
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
};

window.validateAppConfig = function validateAppConfig() {
  const missing = [];
  if (!window.APP_CONFIG.SUPABASE_URL || window.APP_CONFIG.SUPABASE_URL.includes("YOUR_PROJECT_ID")) {
    missing.push("SUPABASE_URL");
  }
  if (!window.APP_CONFIG.SUPABASE_ANON_KEY || window.APP_CONFIG.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")) {
    missing.push("SUPABASE_ANON_KEY");
  }

  if (missing.length) {
    // Warn in console so setup errors are visible during development.
    console.warn("Config belum lengkap. Isi:", missing.join(", "));
  }
};
