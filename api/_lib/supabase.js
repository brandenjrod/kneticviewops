const { createClient } = require("@supabase/supabase-js");

let cachedClient = null;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return cachedClient;
}

module.exports = {
  getRequiredEnv,
  getServiceClient
};
