const multer = require("multer");

const { env } = require("../config/env");

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxImageSize,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed.");
      error.statusCode = 415;
      return callback(error);
    }

    callback(null, true);
  }
});

module.exports = { imageUpload };
