/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Default error
  let error = {
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.error = 'Validation failed';
    error.details = err.message;
    return res.status(400).json(error);
  }

  if (err.name === 'CastError') {
    error.error = 'Invalid data format';
    error.details = err.message;
    return res.status(400).json(error);
  }

  if (err.code === 'ENOENT') {
    error.error = 'File not found';
    return res.status(404).json(error);
  }

  if (err.code === 'EACCES') {
    error.error = 'Permission denied';
    return res.status(403).json(error);
  }

  // Handle multer errors (file upload)
  if (err.code && err.code.startsWith('LIMIT_')) {
    error.error = 'File upload error';
    error.details = err.message;
    return res.status(400).json(error);
  }

  // Socket.IO errors
  if (err.type === 'socket_error') {
    error.error = 'Socket connection error';
    error.details = err.message;
    return res.status(500).json(error);
  }

  // WhatsApp errors
  if (err.message && err.message.includes('WhatsApp')) {
    error.error = 'WhatsApp service error';
    error.details = err.message;
    return res.status(503).json(error);
  }

  // Development vs Production error details
  if (process.env.NODE_ENV === 'development') {
    error.details = err.message;
    error.stack = err.stack;
  }

  // Send error response
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(error);
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Socket error handler
 */
export const handleSocketError = (socket, error) => {
  console.error(`❌ Socket error for ${socket.id}:`, error);
  
  socket.emit('error', {
    type: 'socket_error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
};
