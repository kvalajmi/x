import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE_PATH = path.join(__dirname, '../../logs/sent-log.json');

/**
 * Create a log entry object for message row
 */
export function createLogEntry(messageRow, phone, status, message = null, error = null, timestamp = new Date(), column = null) {
  return {
    id: `${messageRow.rowNumber}_${column}_${phone}_${Date.now()}`,
    contact: {
      name: messageRow.name,
      civil_id: messageRow.civil_id,
      row: messageRow.rowNumber,
      column: column
    },
    phone,
    status, // 'sent', 'failed', 'pending'
    message,
    error,
    timestamp: timestamp.toISOString(),
    retry_count: 0
  };
}

/**
 * Save log entry to file
 */
export async function saveLog(logEntry) {
  try {
    // Ensure logs directory exists
    await fs.ensureDir(path.dirname(LOG_FILE_PATH));
    
    let logs = [];
    
    // Read existing logs if file exists
    if (await fs.pathExists(LOG_FILE_PATH)) {
      try {
        const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
        logs = JSON.parse(data);
      } catch (error) {
        console.warn('⚠️ Could not read existing log file, creating new one:', error.message);
        logs = [];
      }
    }
    
    // Add new log entry
    logs.push(logEntry);
    
    // Keep only last 10000 entries to prevent file from getting too large
    if (logs.length > 10000) {
      logs = logs.slice(-10000);
    }
    
    // Write back to file
    await fs.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
    
    console.log(`📝 Log entry saved: ${logEntry.contact.name} - ${logEntry.status}`);
  } catch (error) {
    console.error('❌ Error saving log entry:', error);
  }
}

/**
 * Load all logs from file
 */
export async function loadLogs() {
  try {
    if (await fs.pathExists(LOG_FILE_PATH)) {
      const data = await fs.readFile(LOG_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('❌ Error loading logs:', error);
    return [];
  }
}

/**
 * Clear all logs
 */
export async function clearLogs() {
  try {
    if (await fs.pathExists(LOG_FILE_PATH)) {
      await fs.remove(LOG_FILE_PATH);
      console.log('🗑️ Logs cleared');
    }
  } catch (error) {
    console.error('❌ Error clearing logs:', error);
  }
}

/**
 * Get log statistics
 */
export async function getLogStats() {
  try {
    const logs = await loadLogs();
    
    const stats = {
      total: logs.length,
      sent: logs.filter(log => log.status === 'sent').length,
      failed: logs.filter(log => log.status === 'failed').length,
      pending: logs.filter(log => log.status === 'pending').length
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting log stats:', error);
    return { total: 0, sent: 0, failed: 0, pending: 0 };
  }
}

/**
 * Export logs to CSV format
 */
export function exportLogsToCSV(logs) {
  const headers = [
    'ID',
    'Name', 
    'Civil ID',
    'Phone',
    'Amount',
    'Status',
    'Message',
    'Error',
    'Timestamp',
    'Pay Link'
  ];
  
  const csvContent = [
    headers.join(','),
    ...logs.map(log => [
      log.id,
      `"${log.contact.name}"`,
      log.contact.civil_id,
      log.phone,
      log.contact.amount,
      log.status,
      log.message ? `"${log.message.replace(/"/g, '""')}"` : '',
      log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
      log.timestamp,
      log.contact.pay_link
    ].join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Archive old logs (move to archive folder)
 */
export async function archiveLogs() {
  try {
    if (await fs.pathExists(LOG_FILE_PATH)) {
      const archiveDir = path.join(__dirname, '../../logs/archive');
      await fs.ensureDir(archiveDir);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const archiveFile = path.join(archiveDir, `sent-log-${timestamp}.json`);
      
      await fs.move(LOG_FILE_PATH, archiveFile);
      console.log(`📦 Logs archived to: ${archiveFile}`);
    }
  } catch (error) {
    console.error('❌ Error archiving logs:', error);
  }
}
