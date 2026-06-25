const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const sharp = require("sharp");

const { paths } = require("../config/paths");

async function ensureStorage() {
  await fs.mkdir(paths.imageUploadDir, { recursive: true });
  await fs.mkdir(paths.dataDir, { recursive: true });

  try {
    await fs.access(paths.imageIndexFile);
  } catch {
    await writeImages([]);
  }
}

async function listImages() {
  const images = await readImages();
  return images.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function findImage(id) {
  const images = await readImages();
  return images.find((image) => image.id === id);
}

async function saveImage(file) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fileName = `${id}.webp`;
  const outputPath = path.join(paths.imageUploadDir, fileName);

  const input = sharp(file.buffer, { failOn: "warning" }).rotate();
  const metadata = await input.metadata();

  await input
    .clone()
    .resize({
      width: 2560,
      height: 2560,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: 82, effort: 5 })
    .toFile(outputPath);

  const stat = await fs.stat(outputPath);
  const image = {
    id,
    originalName: file.originalname,
    originalMimeType: file.mimetype,
    originalSize: file.size,
    compressedSize: stat.size,
    width: metadata.width || null,
    height: metadata.height || null,
    fileName,
    path: `/uploads/images/${encodeURIComponent(fileName)}`,
    createdAt: now
  };

  const images = await readImages();
  images.push(image);
  await writeImages(images);

  return image;
}

async function deleteImage(id) {
  const images = await readImages();
  const image = images.find((item) => item.id === id);

  if (!image) {
    return false;
  }

  await removeImageFile(image.fileName);
  await writeImages(images.filter((item) => item.id !== id));

  return true;
}

async function readImages() {
  await ensureStorage();
  const content = await fs.readFile(paths.imageIndexFile, "utf8");
  return JSON.parse(content);
}

async function writeImages(images) {
  await fs.mkdir(paths.dataDir, { recursive: true });
  await fs.writeFile(paths.imageIndexFile, JSON.stringify(images, null, 2));
}

async function removeImageFile(fileName) {
  if (!fileName || path.basename(fileName) !== fileName) {
    return;
  }

  try {
    await fs.unlink(path.join(paths.imageUploadDir, fileName));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  deleteImage,
  ensureStorage,
  findImage,
  listImages,
  saveImage
};
