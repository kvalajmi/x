import express from 'express';
import { uploadExcelFile, getUploadInfo } from '../controllers/uploadController.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import { uploadRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Bulk Messaging API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Get upload information and requirements
 */
router.get('/upload/info', asyncHandler(getUploadInfo));

/**
 * Upload Excel file endpoint
 */
router.post('/upload', 
  uploadRateLimit,
  uploadSingle,
  handleUploadError,
  asyncHandler(uploadExcelFile)
);

/**
 * Get system status
 */
router.get('/status', (req, res) => {
  // This will be populated by the main server
  const whatsappService = req.app.get('whatsappService');
  const messageService = req.app.get('messageService');
  
  if (!whatsappService || !messageService) {
    return res.status(503).json({
      success: false,
      error: 'Services not initialized'
    });
  }
  
  res.json({
    success: true,
    status: {
      whatsapp: whatsappService.getStatus(),
      messaging: messageService.getStatus(),
      stats: messageService.getStats()
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
