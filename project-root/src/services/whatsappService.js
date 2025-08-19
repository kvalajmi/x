import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

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
    console.log('🚀 Initializing WhatsApp client...');

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
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps'
        ],
        timeout: 60000, // Reduced timeout for faster response
        slowMo: 50 // Reduced delay for faster response
      }
    });

    this.setupEventHandlers();
  }

  clearSessions() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.removeSync(this.sessionPath);
        console.log('🧹 Cleared WhatsApp sessions for development');
      }
      fs.ensureDirSync(this.sessionPath);
    } catch (error) {
      console.error('❌ Error clearing sessions:', error);
    }
  }

  setupEventHandlers() {
    // Add more detailed logging
    this.client.on('loading_screen', (percent, message) => {
      console.log(`📱 Loading WhatsApp: ${percent}% - ${message}`);
    });

    // QR Code generation
    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code received, generating image...');
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
        console.log('✅ QR Code generated successfully, sending to clients...');
        this.io.emit('qr', qrCodeDataURL);

      } catch (error) {
        console.error('❌ Error generating QR code:', error);
        this.io.emit('auth_failure', { error: 'Failed to generate QR code' });
      }
    });

    // Authentication success
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp authenticated successfully');
      this.qrCode = null; // Clear QR code after authentication
      this.io.emit('authenticated', { message: 'تم التوثيق بنجاح' });
    });

    // Client ready
    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.isReady = true;
      this.qrCode = null; // Clear QR code when ready
      this.io.emit('ready', { message: 'واتساب جاهز للاستخدام' });
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.isReady = false;
      this.qrCode = null;
      this.io.emit('auth_failure', { error: msg || 'فشل في التوثيق' });
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      console.log('📱 WhatsApp disconnected:', reason);
      this.isReady = false;
      this.qrCode = null;
      this.io.emit('disconnected', { reason: reason || 'تم قطع الاتصال' });
    });

    // Add more event handlers for better debugging
    this.client.on('change_state', (state) => {
      console.log('📱 WhatsApp state changed:', state);
    });

    this.client.on('message', (msg) => {
      // Just log that we received a message (for debugging)
      console.log('📨 Message received (connection working)');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.isReady = false;
      this.io.emit('auth_failure', { error: msg });
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp disconnected:', reason);
      this.isReady = false;
      this.io.emit('disconnected', { reason });
    });

    // Message sent acknowledgment
    this.client.on('message_ack', (msg, ack) => {
      // ack status: 1 = sent, 2 = received, 3 = read
      if (ack === 1) {
        console.log(`📤 Message sent: ${msg.id.id}`);
      }
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('❌ WhatsApp client error:', error);
      this.io.emit('error', { error: error.message });
    });
  }

  async initialize() {
    // Prevent multiple initialization attempts
    if (this.isInitializing) {
      console.log('⚠️ WhatsApp client is already initializing, skipping...');
      return false;
    }

    if (this.isReady) {
      console.log('✅ WhatsApp client is already ready');
      return true;
    }

    try {
      this.isInitializing = true;
      console.log('🔄 Starting WhatsApp client...');
      console.log('📱 Puppeteer will launch browser...');

      // Destroy existing client if any
      if (this.client && this.client.pupPage) {
        try {
          await this.client.destroy();
          console.log('🧹 Destroyed existing client');
        } catch (destroyError) {
          console.error('⚠️ Error destroying existing client:', destroyError);
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
      console.log('✅ WhatsApp client initialization completed');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp client:', error);
      console.error('Error details:', error.stack);
      this.io.emit('auth_failure', { error: error.message });

      // Try to destroy the client if it exists
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (destroyError) {
          console.error('❌ Error destroying client:', destroyError);
        }
      }

      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Format phone number for WhatsApp
      const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      
      console.log(`📤 Sending message to ${phoneNumber}`);
      const sentMessage = await this.client.sendMessage(chatId, message);
      
      console.log(`✅ Message sent successfully to ${phoneNumber}`);
      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Failed to send message to ${phoneNumber}:`, error);
      
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
      console.error(`❌ Error checking phone number ${phoneNumber}:`, error);
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
        console.log('📱 Logging out from WhatsApp...');
        await this.client.logout();
        this.isReady = false;
        this.qrCode = null;
        this.io.emit('disconnected', { reason: 'User logout' });
        console.log('✅ Successfully logged out from WhatsApp');
      } catch (error) {
        console.error('❌ Error logging out from WhatsApp:', error);
        throw error;
      }
    }
  }

  async destroy() {
    if (this.client) {
      console.log('🔄 Destroying WhatsApp client...');
      try {
        await this.client.destroy();
        console.log('✅ WhatsApp client destroyed');
      } catch (error) {
        console.error('❌ Error destroying WhatsApp client:', error);
      }
    }
    this.isReady = false;
    this.qrCode = null;
  }
}

export default WhatsAppService;
