const { getCorsOrigins } = require("../services/apiKey.service");

const defaultAllowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const defaultAllowedHeaders = "Content-Type,Authorization,X-Requested-With,KEY";

async function corsMiddleware(req, res, next) {
  try {
    const requestOrigin = req.headers.origin;
    const allowedOrigin = await getAllowedOrigin(requestOrigin);

    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", appendVary(res.getHeader("Vary"), "Origin"));
    }

    res.setHeader("Access-Control-Allow-Methods", defaultAllowedMethods);
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || defaultAllowedHeaders
    );
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function getAllowedOrigin(requestOrigin) {
  if (!requestOrigin) {
    return "";
  }

  const normalizedOrigin = requestOrigin.replace(/\/+$/, "");
  const allowedOrigins = await getCorsOrigins();

  if (allowedOrigins.includes("*")) {
    return normalizedOrigin;
  }

  if (allowedOrigins.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return "";
}

function appendVary(current, value) {
  if (!current) {
    return value;
  }

  const parts = String(current)
    .split(",")
    .map((part) => part.trim().toLowerCase());

  if (parts.includes(value.toLowerCase())) {
    return current;
  }

  return `${current}, ${value}`;
}

module.exports = { corsMiddleware };
