const multer = require('multer');
const { Errors } = require('../errors');

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// En memoria: el archivo nunca toca el disco del contenedor (efímero); va directo a S3.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
}).single('file');

function photoUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(Errors.photoTooLarge());
      return next(Errors.photoRequired());
    }
    return next(err);
  });
}

module.exports = { photoUpload, MAX_PHOTO_BYTES };
