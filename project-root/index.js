import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services and middleware
import { setupSecurity, corsOptions } from './src/middleware/security.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import WhatsAppService from './src/services/whatsappService.js';
import MessageService from './src/services/messageService.js';
import SocketService from './src/services/socketService.js';
import apiRoutes from './src/routes/api.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

class WhatsAppBulkServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });
    
    this.port = process.env.PORT || 3000;
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
      
      // Schedule periodic tasks
      this.schedulePeriodicTasks();
      
      // Start server
      await this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    console.log('⚙️ Setting up middleware...');
    
    // Security middleware
    setupSecurity(this.app);
    console.log('🔒 Security middleware configured');
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files from frontend dist
    const frontendPath = path.join(__dirname, './frontend/dist');
    this.app.use(express.static(frontendPath));
    console.log('📂 Serving frontend from:', frontendPath);
  }

  async initializeServices() {
    console.log('🔧 Initializing services...');
    
    try {
      // Initialize WhatsApp service
      this.whatsappService = new WhatsAppService(this.io);
      console.log('🚀 Initializing WhatsApp client...');
      
      // Initialize message service
      this.messageService = new MessageService(this.whatsappService, this.io);
      
      // Initialize socket service
      this.socketService = new SocketService(this.io, this.whatsappService, this.messageService);
      console.log('🔌 Socket.IO handlers configured');
      
      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  setupRoutes() {
    console.log('🛣️ Setting up routes...');
    
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Serve frontend for all non-API routes (SPA routing)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, './frontend/dist/index.html'));
    });
  }

  setupErrorHandling() {
    console.log('🛡️ Setting up error handling...');
    
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  schedulePeriodicTasks() {
    console.log('⏰ Periodic tasks scheduled');
    
    // Clean up old logs every 24 hours
    setInterval(() => {
      // Cleanup logic can be added here if needed
    }, 24 * 60 * 60 * 1000);
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error) => {
        if (error) {
          reject(error);
          return;
        }
        
        console.log('🎉 WhatsApp Bulk Messaging Server Started!');
        console.log(`📍 Server running on port: ${this.port}`);
        console.log(`🌐 Local URL: http://localhost:${this.port}`);
        console.log(`🔗 API Base: http://localhost:${this.port}/api`);
        console.log(`🔌 Socket.IO: ws://localhost:${this.port}`);
        console.log('📋 Available endpoints:');
        console.log('   GET  /              - Frontend application');
        console.log('   GET  /api/health    - Health check');
        console.log('   GET  /api/status    - System status');
        console.log('   POST /api/upload    - Upload Excel file');
        console.log('   GET  /api/upload/info - Upload requirements');
        console.log('🔌 Socket.IO Events:');
        console.log('   Client → Server: connect_whatsapp, start_messaging, pause_messaging, etc.');
        console.log('   Server → Client: qr, ready, status_update, message_sent, etc.');
        console.log('📁 Sessions stored in: ./sessions/');
        console.log('📝 Logs stored in: ./logs/');
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development mode - CORS enabled for localhost');
        } else {
          console.log('🚀 Production mode - Security headers enabled');
        }
        
        console.log('✅ Server ready to accept connections!');
        resolve();
      });
    });
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Received shutdown signal, shutting down gracefully...');
    
    try {
      // Close HTTP server
      await new Promise((resolve) => {
        this.server.close(() => {
          console.log('📡 HTTP server closed');
          resolve();
        });
      });
      
      // Destroy WhatsApp client
      if (this.whatsappService) {
        console.log('📱 Destroying WhatsApp client...');
        await this.whatsappService.destroy();
      }
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Start the server
const server = new WhatsAppBulkServer();

export default server;
