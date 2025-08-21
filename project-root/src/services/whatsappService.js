import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppService {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.isInitializing = false;
    this.sessionPath = path.join(__dirname, '../../sessions');

    // Clear sessions in development mode for clean testing
    if (process.env.NODE_ENV === 'development') {
      this.clearSessions();
    }

    this.initializeClient();
  }

  initializeClient() {
    logger.info('🚀 Initializing WhatsApp client...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-bulk-client',
        dataPath: this.sessionPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ],
        timeout: 0, // Use 0 for no timeout, handled by our own logic
        slowMo: 50
      }
    });

    this.setupEventHandlers();
  }

  clearSessions() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.removeSync(this.sessionPath);
        logger.info('🧹 Cleared WhatsApp sessions for development');
      }
      fs.ensureDirSync(this.sessionPath);
    } catch (error) {
      logger.error('❌ Error clearing sessions:', { error });
    }
  }

  setupEventHandlers() {
    // Add more detailed logging
    this.client.on('loading_screen', (percent, message) => {
      logger.info(`📱 Loading WhatsApp: ${percent}% - ${message}`);
    });

    // QR Code generation
    this.client.on('qr', async (qr) => {
      logger.info('📱 QR Code received, generating image...');
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        this.qrCode = qrCodeDataURL;
        logger.info('✅ QR Code generated successfully, sending to clients...');
        this.io.emit('qr', qrCodeDataURL);

      } catch (error) {
        logger.error('❌ Error generating QR code:', { error });
        this.io.emit('auth_failure', { error: 'Failed to generate QR code' });
      }
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logger.info('🔐 WhatsApp authenticated successfully');
      this.qrCode = null; // Clear QR code after authentication
      this.io.emit('authenticated', { message: 'تم التوثيق بنجاح' });
    });

    // Client ready
    this.client.on('ready', () => {
      logger.info('✅ WhatsApp client is ready!');
      this.isReady = true;
      this.qrCode = null; // Clear QR code when ready
      this.io.emit('ready', { message: 'واتساب جاهز للاستخدام' });
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('❌ WhatsApp authentication failed:', { msg });
      this.isReady = false;
      this.qrCode = null;
      this.io.emit('auth_failure', { error: msg || 'فشل في التوثيق' });
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      logger.info('📱 WhatsApp disconnected:', { reason });
      this.isReady = false;
      this.qrCode = null;
      this.io.emit('disconnected', { reason: reason || 'تم قطع الاتصال' });
    });

    // Add more event handlers for better debugging
    this.client.on('change_state', (state) => {
      logger.info('📱 WhatsApp state changed:', { state });
    });

    this.client.on('message', (msg) => {
      // Just log that we received a message (for debugging)
      logger.debug('📨 Message received (connection working)');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('❌ WhatsApp authentication failed:', { msg });
      this.isReady = false;
      this.io.emit('auth_failure', { error: msg });
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      logger.info('🔌 WhatsApp disconnected:', { reason });
      this.isReady = false;
      this.io.emit('disconnected', { reason });
    });

    // Message sent acknowledgment
    this.client.on('message_ack', (msg, ack) => {
      // ack status: 1 = sent, 2 = received, 3 = read
      if (ack === 1) {
        logger.debug(`📤 Message sent: ${msg.id.id}`);
      }
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('❌ WhatsApp client error:', { error });
      this.io.emit('error', { error: error.message });
    });
  }

  async initialize(retryCount = 0) {
    const maxRetries = 3;

    // Prevent multiple initialization attempts
    if (this.isInitializing) {
      logger.warn('⚠️ WhatsApp client is already initializing, skipping...');
      return false;
    }

    if (this.isReady) {
      logger.info('✅ WhatsApp client is already ready');
      return true;
    }

    try {
      this.isInitializing = true;
      this.io.emit('whatsapp_connection_started', { attempt: retryCount + 1, maxAttempts: maxRetries });
      logger.info(`🔄 Starting WhatsApp client (Attempt ${retryCount + 1}/${maxRetries})...`);
      logger.info('📱 Puppeteer will launch browser...');

      // Destroy existing client if any
      if (this.client && this.client.pupPage) {
        try {
          await this.client.destroy();
          logger.info('🧹 Destroyed existing client');
        } catch (destroyError) {
          logger.error('⚠️ Error destroying existing client:', { destroyError });
        }
      }

      // Reinitialize client
      this.initializeClient();

      // Add timeout for initialization
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WhatsApp initialization timeout after 2 minutes')), 120000);
      });

      await Promise.race([initPromise, timeoutPromise]);

      logger.info('✅ WhatsApp client initialization completed');
      this.isInitializing = false;
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize WhatsApp client (Attempt ${retryCount + 1}/${maxRetries}):`, { error });
      this.isInitializing = false;

      // Try to destroy the client if it exists
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (destroyError) {
          logger.error('❌ Error destroying client:', { destroyError });
        }
      }

      if (retryCount < maxRetries - 1) {
        const delay = 5000;
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initialize(retryCount + 1);
      } else {
        logger.error('❌ Max retries reached. Could not initialize WhatsApp client.');
        this.io.emit('whatsapp_connection_failed', { error: 'فشل في تهيئة واتساب بعد عدة محاولات. يرجى المحاولة مرة أخرى لاحقًا.' });
        return false;
      }
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Format phone number for WhatsApp
      const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      
      logger.info(`📤 Sending message to ${phoneNumber}`);
      const sentMessage = await this.client.sendMessage(chatId, message);
      
      logger.info(`✅ Message sent successfully to ${phoneNumber}`);
      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`❌ Failed to send message to ${phoneNumber}:`, { error });
      
      // Check if it's a phone number issue
      if (error.message.includes('Phone number is not registered')) {
        throw new Error('Phone number is not registered on WhatsApp');
      } else if (error.message.includes('Rate limit')) {
        throw new Error('Rate limit exceeded, please wait');
      } else {
        throw new Error(`Failed to send message: ${error.message}`);
      }
    }
  }

  async checkPhoneNumber(phoneNumber) {
    if (!this.isReady) {
      return { valid: false, reason: 'WhatsApp client not ready' };
    }

    try {
      const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      const isRegistered = await this.client.isRegisteredUser(chatId);
      
      return {
        valid: isRegistered,
        reason: isRegistered ? 'Valid WhatsApp number' : 'Number not registered on WhatsApp'
      };
    } catch (error) {
      logger.error(`❌ Error checking phone number ${phoneNumber}:`, { error });
      return {
        valid: false,
        reason: `Error checking number: ${error.message}`
      };
    }
  }

  getStatus() {
    if (!this.client) {
      return 'disconnected';
    }
    
    if (this.isReady) {
      return 'ready';
    }
    
    if (this.qrCode) {
      return 'qr';
    }
    
    return 'disconnected';
  }

  getCurrentQR() {
    return this.qrCode;
  }

  async logout() {
    if (this.client && this.isReady) {
      try {
        logger.info('📱 Logging out from WhatsApp...');
        await this.client.logout();
        this.isReady = false;
        this.qrCode = null;
        this.io.emit('disconnected', { reason: 'User logout' });
        logger.info('✅ Successfully logged out from WhatsApp');
      } catch (error) {
        logger.error('❌ Error logging out from WhatsApp:', { error });
        throw error;
      }
    }
  }

  async destroy() {
    if (this.client) {
      logger.info('🔄 Destroying WhatsApp client...');
      try {
        await this.client.destroy();
        logger.info('✅ WhatsApp client destroyed');
      } catch (error) {
        logger.error('❌ Error destroying WhatsApp client:', { error });
      }
    }
    this.isReady = false;
    this.qrCode = null;
  }
}

export default WhatsAppService;
