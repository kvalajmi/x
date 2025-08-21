import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../../logs');
fs.ensureDirSync(logDir);
const logFile = path.join(logDir, 'app.log');

const log = (level, message, data) => {
  const timestamp = new Date().toISOString();
  let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
  if (data) {
    logMessage += `\n${JSON.stringify(data, null, 2)}`;
  }
  logMessage += '\n';

  // Log to console
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }

  // Append to log file
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
};

export const logger = {
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data),
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      log('debug', message, data);
    }
  },
};
