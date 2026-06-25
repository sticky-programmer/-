const crypto = require("crypto");
const fs = require("fs/promises");

const { env } = require("../config/env");
const { paths } = require("../config/paths");

async function ensureApiKeySettings() {
  await fs.mkdir(paths.dataDir, { recursive: true });

  try {
    await fs.access(paths.settingsFile);
    const settings = JSON.parse(await fs.readFile(paths.settingsFile, "utf8"));
    const migratedSettings = migrateSettings(settings);
    if (JSON.stringify(settings) !== JSON.stringify(migratedSettings)) {
      await writeSettings(migratedSettings);
    }
  } catch {
    await writeSettings(await buildInitialSettings());
  }
}

async function getApiKeyStatus() {
  const settings = await readSettings();

  return {
    enabled: Boolean(settings.apiKeyHash),
    key: settings.apiKeyValue || "",
    updatedAt: settings.apiKeyUpdatedAt || null
  };
}

async function updateApiKey(apiKey) {
  const normalizedKey = normalizeApiKey(apiKey);

  if (normalizedKey.length < 12) {
    const error = new Error("API key must be at least 12 characters.");
    error.statusCode = 400;
    throw error;
  }

  const settings = await readSettings();
  settings.apiKeyValue = normalizedKey;
  settings.apiKeySalt = crypto.randomBytes(16).toString("base64url");
  settings.apiKeyHash = hashApiKey(normalizedKey, settings.apiKeySalt);
  settings.apiKeyUpdatedAt = new Date().toISOString();
  await writeSettings(settings);

  return getApiKeyStatus();
}

async function getCorsSettings() {
  const settings = await readSettings();

  return {
    origins: settings.corsOrigins,
    updatedAt: settings.corsUpdatedAt || null
  };
}

async function getCorsOrigins() {
  const settings = await readSettings();
  return settings.corsOrigins;
}

async function updateCorsOrigins(origins) {
  const normalizedOrigins = normalizeCorsOrigins(origins);
  const settings = await readSettings();
  settings.corsOrigins = normalizedOrigins;
  settings.corsUpdatedAt = new Date().toISOString();
  await writeSettings(settings);

  return getCorsSettings();
}

async function verifyApiKey(apiKey) {
  const normalizedKey = normalizeApiKey(apiKey);
  if (!normalizedKey) {
    return false;
  }

  const settings = await readSettings();
  if (!settings.apiKeyHash || !settings.apiKeySalt) {
    return false;
  }

  const hash = hashApiKey(normalizedKey, settings.apiKeySalt);
  return safeEqual(hash, settings.apiKeyHash);
}

async function readSettings() {
  await ensureApiKeySettings();
  const content = await fs.readFile(paths.settingsFile, "utf8");
  return JSON.parse(content);
}

async function writeSettings(settings) {
  await fs.mkdir(paths.dataDir, { recursive: true });
  await fs.writeFile(paths.settingsFile, JSON.stringify(settings, null, 2));
}

async function buildInitialSettings() {
  const settings = {
    apiKeyValue: "",
    apiKeySalt: "",
    apiKeyHash: "",
    apiKeyUpdatedAt: null,
    corsOrigins: env.corsOrigins,
    corsUpdatedAt: null
  };

  if (env.apiKey) {
    settings.apiKeyValue = env.apiKey;
    settings.apiKeySalt = crypto.randomBytes(16).toString("base64url");
    settings.apiKeyHash = hashApiKey(env.apiKey, settings.apiKeySalt);
    settings.apiKeyUpdatedAt = new Date().toISOString();
  }

  return settings;
}

function migrateSettings(settings) {
  return {
    apiKeyValue: settings.apiKeyValue || env.apiKey || "",
    apiKeySalt: settings.apiKeySalt || "",
    apiKeyHash: settings.apiKeyHash || "",
    apiKeyUpdatedAt: settings.apiKeyUpdatedAt || null,
    corsOrigins: Array.isArray(settings.corsOrigins) ? settings.corsOrigins : env.corsOrigins,
    corsUpdatedAt: settings.corsUpdatedAt || null
  };
}

function hashApiKey(apiKey, salt) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${apiKey}`)
    .digest("base64url");
}

function normalizeApiKey(apiKey) {
  if (typeof apiKey !== "string") {
    return "";
  }

  return apiKey.trim();
}

function normalizeCorsOrigins(origins) {
  const rawOrigins = Array.isArray(origins)
    ? origins
    : String(origins || "").split(/[\n,]/);

  const normalized = [];

  for (const origin of rawOrigins) {
    const value = String(origin || "").trim().replace(/\/+$/, "");
    if (!value || normalized.includes(value)) {
      continue;
    }

    if (value === "*" || /^https?:\/\/[^/\s]+$/i.test(value)) {
      normalized.push(value);
    }
  }

  return normalized;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  ensureApiKeySettings,
  getCorsOrigins,
  getCorsSettings,
  getApiKeyStatus,
  updateCorsOrigins,
  updateApiKey,
  verifyApiKey
};
