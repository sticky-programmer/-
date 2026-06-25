const crypto = require("crypto");
const fs = require("fs/promises");

const { env } = require("../config/env");
const { paths } = require("../config/paths");

async function ensureApiKeySettings() {
  await fs.mkdir(paths.dataDir, { recursive: true });

  try {
    await fs.access(paths.settingsFile);
  } catch {
    await writeSettings(await buildInitialSettings());
  }
}

async function getApiKeyStatus() {
  const settings = await readSettings();

  return {
    enabled: Boolean(settings.apiKeyHash),
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
  settings.apiKeySalt = crypto.randomBytes(16).toString("base64url");
  settings.apiKeyHash = hashApiKey(normalizedKey, settings.apiKeySalt);
  settings.apiKeyUpdatedAt = new Date().toISOString();
  await writeSettings(settings);

  return getApiKeyStatus();
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
    apiKeySalt: "",
    apiKeyHash: "",
    apiKeyUpdatedAt: null
  };

  if (env.apiKey) {
    settings.apiKeySalt = crypto.randomBytes(16).toString("base64url");
    settings.apiKeyHash = hashApiKey(env.apiKey, settings.apiKeySalt);
    settings.apiKeyUpdatedAt = new Date().toISOString();
  }

  return settings;
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
  getApiKeyStatus,
  updateApiKey,
  verifyApiKey
};
