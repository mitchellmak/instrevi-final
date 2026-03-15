const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  const isAudio = file.mimetype.startsWith('audio/');
  const isVideoField = file.fieldname === 'video' || file.fieldname === 'videos';
  const isAudioField = file.fieldname === 'soundtrack';

  if (isImage) {
    cb(null, true);
  } else if (isVideoField && isVideo) {
    cb(null, true);
  } else if (isAudioField && isAudio) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for this field (video is allowed only in video fields and audio only in soundtrack)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
