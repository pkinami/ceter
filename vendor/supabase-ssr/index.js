const { createClient } = require("@supabase/supabase-js");

function cookieStorage(cookies) {
  return {
    getItem(key) {
      const entry = cookies.getAll().find((cookie) => cookie.name === key);
      return entry ? entry.value : null;
    },
    setItem(key, value) {
      cookies.setAll([{ name: key, value, options: { path: "/" } }]);
    },
    removeItem(key) {
      cookies.setAll([{ name: key, value: "", options: { path: "/", maxAge: 0 } }]);
    }
  };
}

function createBrowserClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

function createServerClient(url, key, { cookies }) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: cookieStorage(cookies)
    }
  });
}

module.exports = { createBrowserClient, createServerClient };
