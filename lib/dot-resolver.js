import tls from 'tls';
import { performance } from 'perf_hooks';
import logger from './advanced-logger.js';

class DoTResolver {
    constructor() {
        this.timeout = 5000;
    }

    async resolve(domain, server, type = 'A') {
        const startTime = performance.now();
        const requestId = logger.generateRequestId();
        
        logger.logDNSRequest('DoT', domain, server, type, requestId);
        
        return new Promise((resolve, reject) => {
            const socket = tls.connect({
                host: server.address,
                port: server.port || 853,
                rejectUnauthorized: false,
                timeout: this.timeout
            });

            let responseBuffer = Buffer.alloc(0);
            let expectedLength = null;
            let timeoutHandle;

            const cleanup = () => {
                if (timeoutHandle) clearTimeout(timeoutHandle);
                socket.destroy();
            };

            timeoutHandle = setTimeout(() => {
                cleanup();
                const endTime = performance.now();
                const errorResult = {
                    success: false,
                    responseTime: endTime - startTime,
                    error: 'Connection timeout',
                    server: server,
                    domain: domain,
                    type: type
                };
                logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                resolve(errorResult);
            }, this.timeout);

            socket.on('connect', () => {
                try {
                    const query = this.createDNSQuery(domain, type);
                    const lengthPrefix = Buffer.allocUnsafe(2);
                    lengthPrefix.writeUInt16BE(query.length, 0);
                    socket.write(Buffer.concat([lengthPrefix, query]));
                } catch (error) {
                    cleanup();
                    const endTime = performance.now();
                    const errorResult = {
                        success: false,
                        responseTime: endTime - startTime,
                        error: error.message,
                        server: server,
                        domain: domain,
                        type: type
                    };
                    logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                    resolve(errorResult);
                }
            });

            socket.on('data', (data) => {
                try {
                    responseBuffer = Buffer.concat([responseBuffer, data]);

                    if (expectedLength === null && responseBuffer.length >= 2) {
                        expectedLength = responseBuffer.readUInt16BE(0);
                        responseBuffer = responseBuffer.slice(2);
                    }

                    if (expectedLength !== null && responseBuffer.length >= expectedLength) {
                        const response = responseBuffer.slice(0, expectedLength);
                        
                        try {
                            const result = this.parseDNSResponse(response, type);
                            const endTime = performance.now();
                            
                            // Validate result
                            if (!Array.isArray(result)) {
                                logger.logInvalidResponse('DoT', domain, server, type, requestId, result,
                                    new Error('DoT result is not an array'),
                                    endTime - startTime);
                            } else if (result.length === 0) {
                                logger.warn('DoT query returned empty result', {
                                    requestId,
                                    resolver: 'DoT',
                                    domain,
                                    server: server.name,
                                    type,
                                    rawResponseLength: response.length
                                });
                            }
                            
                            const finalResult = {
                                success: true,
                                responseTime: endTime - startTime,
                                result: result,
                                server: server,
                                domain: domain,
                                type: type,
                                rawResponse: response
                            };
                            
                            cleanup();
                            logger.logDNSResponse('DoT', domain, server, type, requestId, finalResult, endTime - startTime);
                            resolve(finalResult);
                        } catch (parseError) {
                            const endTime = performance.now();
                            logger.logParsingError('DoT', domain, server, type, requestId, response, parseError, endTime - startTime);
                            
                            const errorResult = {
                                success: false,
                                responseTime: endTime - startTime,
                                error: `Failed to parse DoT response: ${parseError.message}`,
                                server: server,
                                domain: domain,
                                type: type
                            };
                            
                            cleanup();
                            logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                            resolve(errorResult);
                        }
                    }
                } catch (error) {
                    cleanup();
                    const endTime = performance.now();
                    logger.logInvalidResponse('DoT', domain, server, type, requestId, responseBuffer, error, endTime - startTime);
                    
                    const errorResult = {
                        success: false,
                        responseTime: endTime - startTime,
                        error: error.message,
                        server: server,
                        domain: domain,
                        type: type
                    };
                    
                    logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                    resolve(errorResult);
                }
            });

            socket.on('error', (error) => {
                cleanup();
                const endTime = performance.now();
                
                logger.error('DoT socket error', {
                    requestId,
                    resolver: 'DoT',
                    domain,
                    server: {
                        name: server.name,
                        address: server.address,
                        port: server.port || 853
                    },
                    type,
                    error: error.message,
                    errorCode: error.code,
                    errorStack: error.stack
                });
                
                const errorResult = {
                    success: false,
                    responseTime: endTime - startTime,
                    error: error.message,
                    server: server,
                    domain: domain,
                    type: type
                };
                
                logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                resolve(errorResult);
            });

            socket.on('close', () => {
                if (timeoutHandle) {
                    cleanup();
                    const endTime = performance.now();
                    
                    logger.warn('DoT connection closed unexpectedly', {
                        requestId,
                        resolver: 'DoT',
                        domain,
                        server: server.name,
                        type,
                        responseTime: endTime - startTime
                    });
                    
                    const errorResult = {
                        success: false,
                        responseTime: endTime - startTime,
                        error: 'Connection closed unexpectedly',
                        server: server,
                        domain: domain,
                        type: type
                    };
                    
                    logger.logDNSResponse('DoT', domain, server, type, requestId, errorResult, endTime - startTime);
                    resolve(errorResult);
                }
            });
        });
    }

    createDNSQuery(domain, type) {
        const query = Buffer.alloc(512);
        let offset = 0;

        query.writeUInt16BE(Math.floor(Math.random() * 65536), offset);
        offset += 2;

        query.writeUInt16BE(0x0100, offset);
        offset += 2;

        query.writeUInt16BE(1, offset);
        offset += 2;
        query.writeUInt16BE(0, offset);
        offset += 2;
        query.writeUInt16BE(0, offset);
        offset += 2;
        query.writeUInt16BE(0, offset);
        offset += 2;

        const labels = domain.split('.');
        for (const label of labels) {
            query.writeUInt8(label.length, offset);
            offset += 1;
            query.write(label, offset, 'ascii');
            offset += label.length;
        }
        query.writeUInt8(0, offset);
        offset += 1;

        const dnsType = this.getDNSType(type);
        query.writeUInt16BE(dnsType, offset);
        offset += 2;
        query.writeUInt16BE(1, offset);
        offset += 2;

        return query.slice(0, offset);
    }

    parseDNSResponse(buffer, type) {
        try {
            const answers = [];
            let offset = 12;

            const qdcount = buffer.readUInt16BE(4);
            for (let i = 0; i < qdcount; i++) {
                while (buffer[offset] !== 0) {
                    offset += buffer[offset] + 1;
                }
                offset += 5;
            }

            const ancount = buffer.readUInt16BE(6);
            for (let i = 0; i < ancount; i++) {
                if ((buffer[offset] & 0xC0) === 0xC0) {
                    offset += 2;
                } else {
                    while (buffer[offset] !== 0) {
                        offset += buffer[offset] + 1;
                    }
                    offset += 1;
                }

                const answerType = buffer.readUInt16BE(offset);
                offset += 8;
                const rdlength = buffer.readUInt16BE(offset);
                offset += 2;

                if (answerType === 1 && rdlength === 4) {
                    const ip = `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
                    answers.push(ip);
                } else if (answerType === 28 && rdlength === 16) {
                    const ipv6Parts = [];
                    for (let j = 0; j < 8; j++) {
                        const part = buffer.readUInt16BE(offset + j * 2);
                        ipv6Parts.push(part.toString(16));
                    }
                    answers.push(ipv6Parts.join(':'));
                }

                offset += rdlength;
            }

            return answers;
        } catch (error) {
            throw new Error(`Failed to parse DNS response: ${error.message}`);
        }
    }

    getDNSType(type) {
        const types = {
            'A': 1,
            'AAAA': 28,
            'MX': 15,
            'TXT': 16,
            'NS': 2,
            'CNAME': 5,
            'SOA': 6,
            'PTR': 12
        };
        return types[type.toUpperCase()] || 1;
    }

    setTimeout(timeout) {
        this.timeout = timeout;
    }
}

export default DoTResolver;