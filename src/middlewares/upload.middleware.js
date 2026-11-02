const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadBaseDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

// Ensure subdirectories exist
const subDirs = ['proposals', 'contracts', 'milestones', 'reports', 'dispositions', 'responses'];
subDirs.forEach((sub) => {
  const dir = path.join(uploadBaseDir, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fn = (file.fieldname || '').toLowerCase();
    let sub = 'proposals';
    if (
      fn.includes('contract') ||
      fn.includes('statement') ||
      (fn.includes('letter') && !fn.includes('cover')) ||
      fn.includes('kak') ||
      fn.includes('rka') ||
      fn.includes('pks')
    ) {
      sub = 'contracts';
    } else if (fn.includes('milestone') || fn.includes('evidence')) {
      sub = 'milestones';
    } else if (fn.includes('report') || fn.includes('academic') || fn.includes('policy')) {
      sub = 'reports';
    } else if (fn.includes('disposition')) {
      sub = 'dispositions';
    } else if (fn.includes('response') || fn.includes('proof')) {
      sub = 'responses';
    }

    const dest = path.join(uploadBaseDir, sub);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, DOC, DOCX, ZIP, XLS, XLSX
  const allowedExts = ['.pdf', '.doc', '.docx', '.zip', '.xls', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format berkas tidak diizinkan. Harap unggah berkas PDF, DOC, DOCX, XLS, XLSX, atau ZIP.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100 MB max global upload limit
  },
  fileFilter
});

module.exports = upload;

