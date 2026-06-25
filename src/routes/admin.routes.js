const express = require("express");

const { requireAdmin } = require("../middleware/auth");
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

module.exports = router;
