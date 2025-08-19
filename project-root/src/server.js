import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services and middleware
import { setupSecurity, corsOptions } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import WhatsAppService from './services/whatsappService.js';
import MessageService from './services/messageService.js';
import SocketService from './services/socketService.js';
import apiRoutes from './routes/api.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

class WhatsAppBulkServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });
    
    this.port = process.env.PORT || 5000;
    this.whatsappService = null;
    this.messageService = null;
    this.socketService = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Initializing WhatsApp Bulk Messaging Server...');
      
      // Setup middleware
      this.setupMiddleware();
      
      // Initialize services
      await this.initializeServices();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Start server
      this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    console.log('⚙️ Setting up middleware...');
    
    // Basic middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Security middleware
    setupSecurity(this.app);
    
    // Request logging in development
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.path}`);
        next();
      });
    }
  }

  async initializeServices() {
    console.log('🔧 Initializing services...');
    
    // Initialize WhatsApp service
    this.whatsappService = new WhatsAppService(this.io);
    
    // Initialize message service
    this.messageService = new MessageService(this.whatsappService, this.io);
    
    // Initialize Socket service
    this.socketService = new SocketService(this.io, this.whatsappService, this.messageService);
    
    // Make services available to routes
    this.app.set('whatsappService', this.whatsappService);
    this.app.set('messageService', this.messageService);
    this.app.set('socketService', this.socketService);
    
    console.log('✅ Services initialized successfully');
  }

  setupRoutes() {
    console.log('🛣️ Setting up routes...');
    
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'WhatsApp Bulk Messaging API',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          upload: '/api/upload',
          uploadInfo: '/api/upload/info',
          status: '/api/status'
        },
        socketEvents: {
          client: [
            'connect_whatsapp',
            'start_messaging',
            'pause_messaging',
            'resume_messaging',
            'cancel_messaging',
            'get_status',
            'get_stats',
            'get_logs',
            'clear_logs'
          ],
          server: [
            'qr',
            'ready',
            'auth_failure',
            'disconnected',
            'status_update',
            'stats_update',
            'message_sent',
            'message_failed',
            'log_update',
            'messaging_started',
            'messaging_paused',
            'messaging_resumed',
            'messaging_cancelled',
            'messaging_error'
          ]
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    console.log('🛡️ Setting up error handling...');
    
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log('');
      console.log('🎉 WhatsApp Bulk Messaging Server Started!');
      console.log('');
      console.log(`📍 Server running on port: ${this.port}`);
      console.log(`🌐 Local URL: http://localhost:${this.port}`);
      console.log(`🔗 API Base: http://localhost:${this.port}/api`);
      console.log(`🔌 Socket.IO: ws://localhost:${this.port}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   GET  /              - API information`);
      console.log(`   GET  /api/health    - Health check`);
      console.log(`   GET  /api/status    - System status`);
      console.log(`   POST /api/upload    - Upload Excel file`);
      console.log(`   GET  /api/upload/info - Upload requirements`);
      console.log('');
      console.log('🔌 Socket.IO Events:');
      console.log('   Client → Server: connect_whatsapp, start_messaging, pause_messaging, etc.');
      console.log('   Server → Client: qr, ready, status_update, message_sent, etc.');
      console.log('');
      console.log(`📁 Sessions stored in: ./sessions/`);
      console.log(`📝 Logs stored in: ./logs/`);
      console.log('');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode - CORS enabled for localhost');
      } else {
        console.log('🚀 Production mode - Security headers enabled');
      }
      
      console.log('');
      console.log('✅ Server ready to accept connections!');
      console.log('');
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
    
    // Periodic cleanup
    this.setupPeriodicTasks();
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop accepting new connections
        this.server.close(async () => {
          console.log('📡 HTTP server closed');
          
          // Cancel any ongoing messaging
          if (this.messageService && this.messageService.getStatus() !== 'idle') {
            console.log('⏹️ Cancelling ongoing messaging...');
            this.messageService.cancelMessaging();
          }
          
          // Destroy WhatsApp client
          if (this.whatsappService) {
            console.log('📱 Destroying WhatsApp client...');
            await this.whatsappService.destroy();
          }
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
          console.log('⚠️ Force shutdown after timeout');
          process.exit(1);
        }, 30000);
        
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  setupPeriodicTasks() {
    // Cleanup inactive socket connections every 10 minutes
    setInterval(() => {
      if (this.socketService) {
        this.socketService.cleanupInactiveClients();
      }
    }, 10 * 60 * 1000);

    console.log('⏰ Periodic tasks scheduled');
  }
}

// Start the server
new WhatsAppBulkServer();

export default WhatsAppBulkServer;
