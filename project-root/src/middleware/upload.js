import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file is allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected field name. Use "file" as the field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          error: `Upload error: ${error.message}`
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  next();
};
