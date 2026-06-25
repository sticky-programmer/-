const path = require("path");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..", "..");
loadDotEnv(path.join(rootDir, ".env"));

const env = {
  rootDir,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123456",
  apiKey: process.env.API_KEY || "",
  baseUrl: normalizeBaseUrl(process.env.BASE_URL),
  productionFallbackBaseUrl: "http://8.137.192.209",
  sessionSecret: process.env.SESSION_SECRET || "change-this-session-secret",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: normalizeSameSite(process.env.COOKIE_SAME_SITE || "lax"),
  corsOrigins: normalizeCorsOrigins(process.env.CORS_ORIGINS),
  sessionCookieName: "image_service_session",
  sessionMaxAgeMs: 12 * 60 * 60 * 1000,
  maxImageSize: 5 * 1024 * 1024
};

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

function normalizeCorsOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function normalizeSameSite(value) {
  const normalized = String(value).trim().toLowerCase();
  if (["lax", "strict", "none"].includes(normalized)) {
    return normalized;
  }

  return "lax";
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

module.exports = { env };
