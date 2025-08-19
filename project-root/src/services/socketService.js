import { handleSocketError } from '../middleware/errorHandler.js';

class SocketService {
  constructor(io, whatsappService, messageService) {
    this.io = io;
    this.whatsappService = whatsappService;
    this.messageService = messageService;
    this.connectedClients = new Map();
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Send current status on connection
      this.sendCurrentStatus(socket);

      // Handle WhatsApp connection request
      socket.on('connect_whatsapp', async () => {
        try {
          console.log(`📱 WhatsApp connection requested by ${socket.id}`);
          await this.whatsappService.initialize();
        } catch (error) {
          console.error('❌ Error connecting to WhatsApp:', error);
          handleSocketError(socket, error);
        }
      });

      socket.on('disconnect_whatsapp', async () => {
        try {
          console.log(`📱 WhatsApp disconnect requested by ${socket.id}`);
          await this.whatsappService.logout();
          socket.emit('whatsapp_disconnected', {
            success: true,
            message: 'تم تسجيل الخروج من واتساب بنجاح'
          });
        } catch (error) {
          console.error('❌ Error disconnecting from WhatsApp:', error);
          socket.emit('disconnect_error', { error: error.message });
        }
      });

      // Handle messaging controls
      socket.on('start_messaging', async (data) => {
        try {
          console.log(`🚀 Start messaging requested by ${socket.id}`);
          
          if (!data.messageRows) {
            throw new Error('Message rows are required');
          }

          await this.messageService.startBulkMessaging(data.messageRows, data.message);
          
          socket.emit('messaging_started', {
            success: true,
            message: 'Bulk messaging started successfully'
          });
          
        } catch (error) {
          console.error('❌ Error starting messaging:', error);
          socket.emit('messaging_error', {
            success: false,
            error: error.message
          });
        }
      });

      socket.on('pause_messaging', () => {
        try {
          console.log(`⏸️ Pause messaging requested by ${socket.id}`);
          this.messageService.pauseMessaging();
          
          socket.emit('messaging_paused', {
            success: true,
            message: 'Messaging paused successfully'
          });
          
        } catch (error) {
          console.error('❌ Error pausing messaging:', error);
          socket.emit('messaging_error', {
            success: false,
            error: error.message
          });
        }
      });

      socket.on('resume_messaging', () => {
        try {
          console.log(`▶️ Resume messaging requested by ${socket.id}`);
          this.messageService.resumeMessaging();
          
          socket.emit('messaging_resumed', {
            success: true,
            message: 'Messaging resumed successfully'
          });
          
        } catch (error) {
          console.error('❌ Error resuming messaging:', error);
          socket.emit('messaging_error', {
            success: false,
            error: error.message
          });
        }
      });

      socket.on('cancel_messaging', () => {
        try {
          console.log(`🛑 Cancel messaging requested by ${socket.id}`);
          this.messageService.cancelMessaging();
          
          socket.emit('messaging_cancelled', {
            success: true,
            message: 'Messaging cancelled successfully'
          });
          
        } catch (error) {
          console.error('❌ Error cancelling messaging:', error);
          socket.emit('messaging_error', {
            success: false,
            error: error.message
          });
        }
      });

      // Handle status requests
      socket.on('get_status', () => {
        this.sendCurrentStatus(socket);
      });

      socket.on('get_whatsapp_status', () => {
        this.sendCurrentStatus(socket);
      });

      socket.on('get_stats', () => {
        const stats = this.messageService.getStats();
        socket.emit('stats_update', stats);
      });

      socket.on('get_logs', () => {
        const logs = this.messageService.getMessageLog();
        socket.emit('logs_update', logs);
      });

      socket.on('clear_logs', () => {
        try {
          this.messageService.clearMessageLog();
          socket.emit('logs_cleared', {
            success: true,
            message: 'Logs cleared successfully'
          });
        } catch (error) {
          console.error('❌ Error clearing logs:', error);
          socket.emit('error', {
            success: false,
            error: error.message
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
        this.connectedClients.delete(socket.id);
        
        // Continue messaging even if no clients are connected
      });

      // Update last activity on any event
      socket.onAny(() => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastActivity = new Date();
        }
      });
    });

    console.log('🔌 Socket.IO handlers configured');
  }

  sendCurrentStatus(socket) {
    try {
      const whatsappStatus = this.whatsappService.getStatus();
      const qrCode = this.whatsappService.getCurrentQR();
      
      const status = {
        state: whatsappStatus,
        isReady: whatsappStatus === 'ready',
        hasQR: !!qrCode,
        qrCode: qrCode,
        sessionName: 'whatsapp-bulk-client',
        timestamp: new Date().toISOString()
      };

      socket.emit('whatsapp_status', status);
      socket.emit('status_update', {
        whatsapp: whatsappStatus,
        messaging: this.messageService.getStatus(),
        stats: this.messageService.getStats(),
        timestamp: new Date().toISOString()
      });

      // Send QR code if available
      if (qrCode) {
        socket.emit('qr', qrCode);
      }
    } catch (error) {
      console.error('❌ Error sending current status:', error);
      handleSocketError(socket, error);
    }
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Get connected clients info
  getConnectedClients() {
    const clients = [];
    for (const [socketId, client] of this.connectedClients) {
      clients.push({
        id: socketId,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity
      });
    }
    return clients;
  }

  // Cleanup inactive clients
  cleanupInactiveClients() {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [socketId, client] of this.connectedClients) {
      if (now - client.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive client: ${socketId}`);
        client.socket.disconnect(true);
        this.connectedClients.delete(socketId);
      }
    }
  }
}

export default SocketService;
