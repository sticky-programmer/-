const crypto = require("crypto");

const { env } = require("../config/env");
const { verifyApiKey } = require("../services/apiKey.service");
const { findUserById } = require("../services/user.service");

async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req, env.sessionCookieName);
    const session = verifySessionToken(token);

    if (session) {
      const user = await findUserById(session.userId);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          authType: "cookie"
        };
        return next();
      }
    }

    const apiKey = req.get("KEY");
    if (await verifyApiKey(apiKey)) {
      req.user = {
        id: "api-key",
        username: "api-key",
        role: "api",
        authType: "api-key"
      };
      return next();
    }

    return res.status(401).json({ error: "Please login first or provide a valid KEY header." });
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin permission is required." });
  }

  next();
}

function createSessionToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    exp: Date.now() + env.sessionMaxAgeMs
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expected = sign(encodedPayload);

  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.cookie(env.sessionCookieName, token, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    maxAge: env.sessionMaxAgeMs,
    path: "/"
  });
}

function clearSessionCookie(res) {
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    path: "/"
  });
}

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) {
    return "";
  }

  return decodeURIComponent(target.slice(name.length + 1));
}

function sign(value) {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(value)
    .digest("base64url");
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
  clearSessionCookie,
  createSessionToken,
  requireAdmin,
  requireAuth,
  setSessionCookie
};
