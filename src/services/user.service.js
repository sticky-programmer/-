const crypto = require("crypto");
const fs = require("fs/promises");

const { env } = require("../config/env");
const { paths } = require("../config/paths");

async function ensureInitialAdmin() {
  await fs.mkdir(paths.dataDir, { recursive: true });

  try {
    await fs.access(paths.userFile);
  } catch {
    const admin = await buildUser({
      username: env.adminUsername,
      password: env.adminPassword,
      role: "admin"
    });
    await writeUsers([admin]);
    console.log(`Initial admin user created: ${env.adminUsername}`);
  }
}

async function listUsers() {
  return readUsers();
}

async function findUserById(id) {
  const users = await readUsers();
  return users.find((user) => user.id === id);
}

async function createUser({ username, password, role = "user" }) {
  const users = await readUsers();
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    const error = new Error("Username is invalid.");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters.");
    error.statusCode = 400;
    throw error;
  }

  if (users.some((user) => user.username === normalizedUsername)) {
    const error = new Error("Username already exists.");
    error.statusCode = 409;
    throw error;
  }

  const user = await buildUser({
    username: normalizedUsername,
    password,
    role
  });

  users.push(user);
  await writeUsers(users);

  return user;
}

async function verifyPassword(username, password) {
  const users = await readUsers();
  const normalizedUsername = normalizeUsername(username);
  const user = users.find((item) => item.username === normalizedUsername);

  if (!user) {
    return null;
  }

  const hash = await hashPassword(password, user.salt);
  if (!safeEqual(hash, user.passwordHash)) {
    return null;
  }

  return user;
}

async function readUsers() {
  await ensureInitialAdmin();
  const content = await fs.readFile(paths.userFile, "utf8");
  return JSON.parse(content);
}

async function writeUsers(users) {
  await fs.mkdir(paths.dataDir, { recursive: true });
  await fs.writeFile(paths.userFile, JSON.stringify(users, null, 2));
}

async function buildUser({ username, password, role }) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const passwordHash = await hashPassword(password, salt);

  return {
    id: crypto.randomUUID(),
    username: normalizeUsername(username),
    role,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 210000, 32, "sha256", (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("base64url"));
    });
  });
}

function normalizeUsername(username) {
  if (typeof username !== "string") {
    return "";
  }

  return username.trim().toLowerCase().slice(0, 64);
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
  createUser,
  ensureInitialAdmin,
  findUserById,
  listUsers,
  verifyPassword
};
