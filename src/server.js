const { createApp } = require("./app");
const { env } = require("./config/env");
const { ensureApiKeySettings } = require("./services/apiKey.service");
const { ensureStorage } = require("./services/image.service");
const { ensureInitialAdmin } = require("./services/user.service");

async function bootstrap() {
  await ensureStorage();
  await ensureInitialAdmin();
  await ensureApiKeySettings();

  const app = createApp();

  app.listen(env.port, env.host, () => {
    console.log(`Image service is running at http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start image service:", error);
  process.exit(1);
});
