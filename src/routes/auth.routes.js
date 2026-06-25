const express = require("express");

const {
  clearSessionCookie,
  createSessionToken,
  requireAuth,
  setSessionCookie
} = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyPassword } = require("../services/user.service");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = await verifyPassword(username, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = createSessionToken(user);
  setSessionCookie(res, token);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
}));

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", requireAuth, (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

module.exports = router;
