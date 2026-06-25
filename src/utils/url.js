const { env } = require("../config/env");

function withAbsoluteUrl(req, image) {
  return {
    ...image,
    url: `${getBaseUrl(req)}${image.path}`
  };
}

function getBaseUrl(req) {
  if (env.baseUrl) {
    return env.baseUrl;
  }

  return `${req.protocol}://${req.get("host")}`;
}

module.exports = { getBaseUrl, withAbsoluteUrl };
