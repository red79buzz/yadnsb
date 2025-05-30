export const loggingConfig = {
    level: process.env.LOG_LEVEL || 'INFO',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDirectory: process.env.LOG_DIR || './logs',
    maxLogSize: parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024, 
    maxLogFiles: parseInt(process.env.MAX_LOG_FILES) || 5,
    
    dns: {
        logAllRequests: process.env.DNS_LOG_ALL_REQUESTS === 'true',
        logInvalidResponses: process.env.DNS_LOG_INVALID_RESPONSES !== 'false',
        logHttpDetails: process.env.DNS_LOG_HTTP_DETAILS === 'true',
        logRawResponses: process.env.DNS_LOG_RAW_RESPONSES === 'true',
        rawDataLimit: parseInt(process.env.DNS_RAW_DATA_LIMIT) || 1000,
        slowQueryThreshold: parseInt(process.env.DNS_SLOW_QUERY_THRESHOLD) || 2000
    },
    
    format: {
        includeTimestamp: true,
        includeStackTrace: process.env.LOG_INCLUDE_STACK === 'true',
        timestampFormat: 'ISO', // ISO, LOCAL, UNIX
        useColors: process.env.LOG_USE_COLORS !== 'false'
    }
};

export const developmentConfig = {
    ...loggingConfig,
    level: 'DEBUG',
    enableFileLogging: true,
    dns: {
        ...loggingConfig.dns,
        logAllRequests: true,
        logHttpDetails: true,
        logRawResponses: true
    }
};

export const productionConfig = {
    ...loggingConfig,
    level: 'WARN',
    enableFileLogging: true,
    dns: {
        ...loggingConfig.dns,
        logAllRequests: false,
        logHttpDetails: false,
        logRawResponses: false
    }
};

export function getLoggingConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env.toLowerCase()) {
        case 'production':
            return productionConfig;
        case 'development':
        case 'dev':
            return developmentConfig;
        default:
            return loggingConfig;
    }
}