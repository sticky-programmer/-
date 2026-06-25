const express = require("express");

const { requireAdmin } = require("../middleware/auth");
const {
  getApiKeyStatus,
  getCorsSettings,
  updateApiKey,
  updateCorsOrigins
} = require("../services/apiKey.service");
const { createUser, listUsers } = require("../services/user.service");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/users", requireAdmin, asyncHandler(async (req, res) => {
  const users = await listUsers();
  res.json(users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  })));
}));

router.post("/users", requireAdmin, asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = await createUser({
    username,
    password,
    role: role === "admin" ? "admin" : "user"
  });

  res.status(201).json({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  });
}));

router.get("/api-key", requireAdmin, asyncHandler(async (req, res) => {
  res.json(await getApiKeyStatus());
}));

router.put("/api-key", requireAdmin, asyncHandler(async (req, res) => {
  const { key } = req.body;
  res.json(await updateApiKey(key));
}));

router.get("/cors", requireAdmin, asyncHandler(async (req, res) => {
  res.json(await getCorsSettings());
}));

router.put("/cors", requireAdmin, asyncHandler(async (req, res) => {
  const { origins } = req.body;
  res.json(await updateCorsOrigins(origins));
}));

module.exports = router;
