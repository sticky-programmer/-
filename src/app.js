const compression = require("compression");
const express = require("express");
const path = require("path");

const { env } = require("./config/env");
const { paths } = require("./config/paths");
const { requireAuth } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const imageRoutes = require("./routes/image.routes");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(compression());
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  app.use(express.static(paths.publicDir));
  app.use("/uploads/images", express.static(paths.imageUploadDir, {
    etag: true,
    lastModified: true,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-cache");
    }
  }));

  app.get("/", (req, res) => {
    res.sendFile(path.join(paths.publicDir, "index.html"));
  });

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      environment: env.nodeEnv
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/images", requireAuth, imageRoutes);
  app.use("/api/admin", requireAuth, adminRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
