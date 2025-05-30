import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

class AdvancedLogger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
        this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
        this.logDir = process.env.LOG_DIR || './logs';
        this.maxLogSize = parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 5;
        
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };

        this.currentLevel = this.levels[this.logLevel] || this.levels.INFO;
        
        if (this.enableFileLogging) {
            this.ensureLogDirectory();
        }
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    formatLogEntry(level, message, metadata = {}) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level,
            message,
            ...metadata
        };

        return JSON.stringify(logEntry, null, 2);
    }

    shouldLog(level) {
        return this.levels[level] <= this.currentLevel;
    }

    writeToFile(logEntry) {
        if (!this.enableFileLogging) return;

        try {
            const logFile = path.join(this.logDir, `dns-debug-${new Date().toISOString().split('T')[0]}.log`);
            
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.maxLogSize) {
                    this.rotateLogFile(logFile);
                }
            }

            fs.appendFileSync(logFile, logEntry + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    rotateLogFile(currentFile) {
        try {
            const baseName = path.basename(currentFile, '.log');
            const dir = path.dirname(currentFile);
            
            for (let i = this.maxLogFiles - 1; i > 0; i--) {
                const oldFile = path.join(dir, `${baseName}.${i}.log`);
                const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxLogFiles - 1) {
                        fs.unlinkSync(oldFile);
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            
            const rotatedFile = path.join(dir, `${baseName}.1.log`);
            fs.renameSync(currentFile, rotatedFile);
        } catch (error) {
            console.error('Failed to rotate log file:', error.message);
        }
    }

    log(level, message, metadata = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatLogEntry(level, message, metadata);
        
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[35m', // Magenta
            TRACE: '\x1b[37m'  // White
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || '';
        
        console.log(`${color}[${level}]${reset} ${message}`, metadata);
        
        this.writeToFile(logEntry);
    }

    error(message, metadata = {}) {
        this.log('ERROR', message, metadata);
    }

    warn(message, metadata = {}) {
        this.log('WARN', message, metadata);
    }

    info(message, metadata = {}) {
        this.log('INFO', message, metadata);
    }

    debug(message, metadata = {}) {
        this.log('DEBUG', message, metadata);
    }

    trace(message, metadata = {}) {
        this.log('TRACE', message, metadata);
    }

    logDNSRequest(resolver, domain, server, type, requestId) {
        this.debug('DNS Request initiated', {
            requestId,
            resolver,
            domain,
            server: {
                name: server.name,
                address: server.address,
                port: server.port
            },
            type,
            timestamp: performance.now()
        });
    }

    logDNSResponse(resolver, domain, server, type, requestId, response, responseTime) {
        const logData = {
            requestId,
            resolver,
            domain,
            server: {
                name: server.name,
                address: server.address,
                port: server.port
            },
            type,
            responseTime: Math.round(responseTime * 100) / 100,
            success: response.success
        };

        if (response.success) {
            logData.resultCount = response.result ? response.result.length : 0;
            logData.results = response.result;
            
            if (response.rawResponse) {
                logData.rawResponse = response.rawResponse;
            }
            
            this.info('DNS Response successful', logData);
        } else {
            logData.error = response.error;
            this.warn('DNS Response failed', logData);
        }
    }

    logInvalidResponse(resolver, domain, server, type, requestId, rawData, error, responseTime) {
        this.error('Invalid DNS Response detected', {
            requestId,
            resolver,
            domain,
            server: {
                name: server.name,
                address: server.address,
                port: server.port
            },
            type,
            responseTime: Math.round(responseTime * 100) / 100,
            error: error.message,
            rawDataType: typeof rawData,
            rawDataLength: rawData ? (rawData.length || Object.keys(rawData).length) : 0,
            rawDataSample: this.sanitizeRawData(rawData),
            stack: error.stack
        });
    }

    logHTTPDetails(resolver, url, headers, statusCode, contentType, responseText, requestId) {
        this.debug('HTTP Request/Response details', {
            requestId,
            resolver,
            url: url.toString(),
            requestHeaders: headers,
            statusCode,
            contentType,
            responseLength: responseText ? responseText.length : 0,
            responseSample: responseText ? responseText.substring(0, 500) : null
        });
    }

    logParsingError(resolver, domain, server, type, requestId, rawData, parseError, responseTime) {
        this.error('DNS Response parsing failed', {
            requestId,
            resolver,
            domain,
            server: {
                name: server.name,
                address: server.address,
                port: server.port
            },
            type,
            responseTime: Math.round(responseTime * 100) / 100,
            parseError: parseError.message,
            rawDataType: typeof rawData,
            rawDataLength: rawData ? (rawData.length || Object.keys(rawData).length) : 0,
            rawDataSample: this.sanitizeRawData(rawData),
            stack: parseError.stack
        });
    }

    sanitizeRawData(data) {
        if (!data) return null;
        
        try {
            if (typeof data === 'string') {
                return data.length > 1000 ? data.substring(0, 1000) + '...[truncated]' : data;
            }
            
            if (Buffer.isBuffer(data)) {
                return {
                    type: 'Buffer',
                    length: data.length,
                    hex: data.length > 100 ? data.slice(0, 100).toString('hex') + '...[truncated]' : data.toString('hex'),
                    ascii: data.length > 100 ? data.slice(0, 100).toString('ascii') + '...[truncated]' : data.toString('ascii')
                };
            }
            
            if (typeof data === 'object') {
                const sanitized = JSON.parse(JSON.stringify(data));
                const str = JSON.stringify(sanitized);
                return str.length > 1000 ? str.substring(0, 1000) + '...[truncated]' : sanitized;
            }
            
            return data;
        } catch (error) {
            return `[Error sanitizing data: ${error.message}]`;
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

const logger = new AdvancedLogger();

export default logger;