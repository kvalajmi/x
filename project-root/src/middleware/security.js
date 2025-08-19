import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from frontend URL or no origin (mobile apps, postman, etc.)
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5174'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Helmet configuration for security headers
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Disable for WhatsApp Web compatibility
};

/**
 * Rate limiting configuration
 */
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs, // Time window in milliseconds
    max, // Maximum requests per window
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/';
    }
  });
};

/**
 * Upload-specific rate limiter (more restrictive)
 */
export const uploadRateLimit = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // 100 uploads per 15 minutes (increased from 10)
);

/**
 * General API rate limiter
 */
export const apiRateLimit = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // 100 requests per 15 minutes
);

/**
 * Socket.IO rate limiter
 */
export const socketRateLimit = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  50 // 50 socket events per 5 minutes
);

/**
 * Security middleware setup
 */
export const setupSecurity = (app) => {
  // Trust proxy if behind reverse proxy (Railway, Render, etc.)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Apply helmet for security headers
  app.use(helmet(helmetConfig));
  
  // Apply CORS
  app.use(cors(corsOptions));
  
  // Apply general rate limiting
  app.use(apiRateLimit);
  
  console.log('🔒 Security middleware configured');
};

/**
 * Error handler for CORS
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Cross-Origin Request Blocked',
      details: 'This API can only be accessed from authorized domains'
    });
  }
  next(err);
};

/**
 * Validate API key middleware (if needed for production)
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  
  // Skip API key validation in development
  if (!apiKey || process.env.NODE_ENV === 'development') {
    return next();
  }
  
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }
  
  next();
};
