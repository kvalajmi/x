import PQueue from 'p-queue';
import { saveLog, createLogEntry } from '../utils/logUtils.js';

class MessageService {
  constructor(whatsappService, io) {
    this.whatsappService = whatsappService;
    this.io = io;
    this.queue = new PQueue({ 
      concurrency: 1,
      interval: 6000, // Minimum 6 seconds between messages
      intervalCap: 1
    });
    
    this.isRunning = false;
    this.isPaused = false;
    this.contacts = [];
    this.messageTemplate = '';
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      remaining: 0
    };
    this.messageLog = [];
    this.retryAttempts = new Map(); // Track retry attempts per message
  }

  /**
   * Start bulk messaging process with message rows
   */
  async startBulkMessaging(messageRows, messageTemplate = null) {
    if (this.isRunning) {
      throw new Error('Messaging process is already running');
    }

    if (!this.whatsappService.isReady) {
      throw new Error('WhatsApp is not ready');
    }

    // Calculate total messages to send
    const totalMessages = messageRows.reduce((total, row) => total + row.validPhones.length, 0);
    
    console.log(`🚀 Starting bulk messaging for ${messageRows.length} rows with ${totalMessages} total messages`);
    
    this.messageRows = messageRows;
    this.messageTemplate = messageTemplate; // Not used in new structure
    this.isRunning = true;
    this.isPaused = false;
    
    // Reset stats
    this.stats = {
      total: totalMessages,
      sent: 0,
      failed: 0,
      remaining: totalMessages
    };
    
    this.messageLog = [];
    this.retryAttempts.clear();

    // Emit initial stats
    this.io.emit('stats_update', this.stats);
    this.io.emit('status_update', { status: 'sending' });

    // Process each message row
    for (const messageRow of messageRows) {
      if (!this.isRunning) {
        console.log('⏹️ Messaging stopped by user');
        break;
      }

      // Process each phone in the row
      for (const phoneData of messageRow.validPhones) {
        if (!this.isRunning) break;

        // Add message task to queue
        this.queue.add(() => this.processMessage(messageRow, phoneData), {
          priority: 1
        });
      }
    }

    // Wait for queue to finish or be paused/cancelled
    try {
      await this.queue.onIdle();
      
      if (this.isRunning && !this.isPaused) {
        console.log('✅ Bulk messaging completed');
        this.io.emit('status_update', { status: 'completed' });
        this.isRunning = false;
      }
    } catch (error) {
      console.error('❌ Error in bulk messaging:', error);
      this.io.emit('status_update', { status: 'error', error: error.message });
      this.isRunning = false;
    }
  }

  /**
   * Process a single message (row + phone combination)
   */
  async processMessage(messageRow, phoneData) {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    try {
      const message = messageRow.message; // Use message directly from Excel column G
      const phone = phoneData.phone;
      
      // Check if phone number is registered (optional validation)
      const phoneCheck = await this.whatsappService.checkPhoneNumber(phone);
      if (!phoneCheck.valid) {
        console.warn(`⚠️ Phone ${phone} is not registered: ${phoneCheck.reason}`);
        await this.handleFailedMessage(messageRow, phoneData, `Phone not registered: ${phoneCheck.reason}`);
        return;
      }

      // Send message
      const result = await this.whatsappService.sendMessage(phone, message);
      
      if (result.success) {
        await this.handleSuccessfulMessage(messageRow, phoneData, message, result);
      } else {
        await this.handleFailedMessage(messageRow, phoneData, 'Failed to send message');
      }
    } catch (error) {
      console.error(`❌ Failed to send to ${phoneData.phone}:`, error);
      await this.handleFailedMessage(messageRow, phoneData, error.message);
    }
  }

  /**
   * Handle successful message
   */
  async handleSuccessfulMessage(messageRow, phoneData, message, result) {
    this.stats.sent++;
    this.stats.remaining--;
    
    const logEntry = createLogEntry(
      messageRow, 
      phoneData.phone, 
      'sent', 
      message, 
      null, 
      result.timestamp,
      phoneData.column
    );
    this.messageLog.push(logEntry);
    
    // Emit updates
    this.io.emit('message_sent', {
      contact: messageRow.name,
      phone: phoneData.phone,
      column: phoneData.column,
      row: messageRow.rowNumber,
      timestamp: result.timestamp
    });
    
    this.io.emit('stats_update', this.stats);
    this.io.emit('log_update', logEntry);

    // Save to file
    await saveLog(logEntry);
  }

  /**
   * Handle failed message with retry logic
   */
  async handleFailedMessage(messageRow, phoneData, error) {
    const messageKey = `${messageRow.rowNumber}_${phoneData.column}_${phoneData.phone}`;
    const currentAttempts = this.retryAttempts.get(messageKey) || 0;
    
    // Check if we should retry
    if (currentAttempts < 2) { // Max 2 retry attempts
      this.retryAttempts.set(messageKey, currentAttempts + 1);
      
      console.log(`🔄 Retrying message to ${messageRow.name} (Row ${messageRow.rowNumber}, Column ${phoneData.column}) - Attempt ${currentAttempts + 1}`);
      
      // Add retry to queue with delay
      setTimeout(() => {
        if (this.isRunning && !this.isPaused) {
          this.queue.add(() => this.processMessage(messageRow, phoneData), { priority: 0 });
        }
      }, 15000); // 15 second delay before retry
      
      return;
    }

    // Max retries reached, mark as failed
    this.stats.failed++;
    this.stats.remaining--;
    
    const logEntry = createLogEntry(
      messageRow, 
      phoneData.phone, 
      'failed', 
      null, 
      error, 
      new Date(),
      phoneData.column
    );
    this.messageLog.push(logEntry);
    
    // Emit updates
    this.io.emit('message_failed', {
      contact: messageRow.name,
      phone: phoneData.phone,
      column: phoneData.column,
      row: messageRow.rowNumber,
      error,
      timestamp: new Date()
    });
    
    this.io.emit('stats_update', this.stats);
    this.io.emit('log_update', logEntry);

    // Save to file
    await saveLog(logEntry);
    
    console.log(`❌ Message failed for ${messageRow.name} (Row ${messageRow.rowNumber}, Column ${phoneData.column}) at ${phoneData.phone}: ${error}`);
  }

  // Template replacement is no longer used - messages come directly from Excel column G

  /**
   * Pause messaging
   */
  pauseMessaging() {
    if (!this.isRunning) {
      throw new Error('No messaging process is running');
    }
    
    console.log('⏸️ Pausing messaging...');
    this.isPaused = true;
    this.queue.pause();
    this.io.emit('status_update', { status: 'paused' });
  }

  /**
   * Resume messaging
   */
  resumeMessaging() {
    if (!this.isRunning || !this.isPaused) {
      throw new Error('No paused messaging process to resume');
    }
    
    console.log('▶️ Resuming messaging...');
    this.isPaused = false;
    this.queue.start();
    this.io.emit('status_update', { status: 'sending' });
  }

  /**
   * Cancel messaging
   */
  cancelMessaging() {
    if (!this.isRunning) {
      throw new Error('No messaging process is running');
    }
    
    console.log('🛑 Cancelling messaging...');
    this.isRunning = false;
    this.isPaused = false;
    this.queue.clear();
    this.queue.pause();
    
    this.io.emit('status_update', { status: 'cancelled' });
    
    // Reset queue for next use
    setTimeout(() => {
      this.queue.start();
    }, 1000);
  }

  /**
   * Get current status
   */
  getStatus() {
    if (!this.isRunning) {
      return 'idle';
    }
    if (this.isPaused) {
      return 'paused';
    }
    return 'sending';
  }

  /**
   * Get current stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get message log
   */
  getMessageLog() {
    return [...this.messageLog];
  }

  /**
   * Clear message log
   */
  clearMessageLog() {
    this.messageLog = [];
    this.io.emit('log_cleared');
  }
}

export default MessageService;
