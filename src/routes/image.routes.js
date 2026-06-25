const express = require("express");

const { imageUpload } = require("../middleware/upload");
const {
  deleteImage,
  findImage,
  listImages,
  saveImage
} = require("../services/image.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { withAbsoluteUrl } = require("../utils/url");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const images = await listImages();
  res.json(images.map((image) => withAbsoluteUrl(req, image)));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const image = await findImage(req.params.id);
  if (!image) {
    return res.status(404).json({ error: "Image not found." });
  }

  res.json(withAbsoluteUrl(req, image));
}));

router.post("/", imageUpload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Upload an image field named 'image' using multipart/form-data." });
  }

  const image = await saveImage(req.file);
  res.status(201).json(withAbsoluteUrl(req, image));
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await deleteImage(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Image not found." });
  }

  res.status(204).end();
}));

module.exports = router;
