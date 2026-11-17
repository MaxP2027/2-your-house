export class ConfigurationError extends Error {
  constructor() {
    super("Account services are not configured.");
    this.name = "ConfigurationError";
  }
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_SITE_URL,
  );
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ConfigurationError();
  return { url, key };
}

export function getSiteOrigin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) throw new ConfigurationError();
  try {
    const url = new URL(site);
    if (!["https:", "http:"].includes(url.protocol))
      throw new ConfigurationError();
    if (url.username || url.password) throw new ConfigurationError();
    return url.origin;
  } catch {
    throw new ConfigurationError();
  }
}
