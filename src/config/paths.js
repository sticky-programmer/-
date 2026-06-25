const path = require("path");

const { env } = require("./env");

const paths = {
  rootDir: env.rootDir,
  publicDir: path.join(env.rootDir, "public"),
  dataDir: path.join(env.rootDir, "data"),
  uploadDir: path.join(env.rootDir, "uploads"),
  imageUploadDir: path.join(env.rootDir, "uploads", "images"),
  imageIndexFile: path.join(env.rootDir, "data", "images.json"),
  userFile: path.join(env.rootDir, "data", "users.json")
};

module.exports = { paths };
