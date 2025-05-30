import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import logger from './advanced-logger.js';

class DoHResolver {
    constructor() {
        this.timeout = 5000;
        this.providerConfigs = {
            'dns.google': { method: 'POST', format: 'wireformat' },
            'dns10.quad9.net': { method: 'POST', format: 'wireformat' },
            'doh.opendns.com': { method: 'POST', format: 'wireformat' },
            'dns.adguard-dns.com': { method: 'POST', format: 'wireformat' },
            'freedns.controld.com': { method: 'POST', format: 'wireformat' },
            'dns.mullvad.net': { method: 'POST', format: 'wireformat' },
            'cloudflare-dns.com': { method: 'GET', format: 'json' },
            'dns.nextdns.io': { method: 'GET', format: 'json' }
        };
    }

    getProviderConfig(serverAddress) {
        for (const [domain, config] of Object.entries(this.providerConfigs)) {
            if (serverAddress.includes(domain)) {
                return config;
            }
        }
        return { method: 'GET', format: 'json' };
    }

    async resolve(domain, server, type = 'A') {
        const startTime = performance.now();
        const requestId = logger.generateRequestId();
        
        logger.logDNSRequest('DoH', domain, server, type, requestId);
        
        const config = this.getProviderConfig(server.address);
        
        try {
            if (config.method === 'POST' && config.format === 'wireformat') {
                return await this.resolveWithPOST(domain, server, type, requestId, startTime);
            } else {
                return await this.resolveWithGET(domain, server, type, requestId, startTime);
            }
        } catch (error) {
            logger.warn('Primary DoH method failed, trying fallback', {
                requestId,
                primaryMethod: config.method,
                error: error.message
            });
            
            try {
                if (config.method === 'POST') {
                    return await this.resolveWithGET(domain, server, type, requestId, startTime);
                } else {
                    return await this.resolveWithPOST(domain, server, type, requestId, startTime);
                }
            } catch (fallbackError) {
                return this.handleError(fallbackError, domain, server, type, requestId, startTime);
            }
        }
    }

    async resolveWithPOST(domain, server, type, requestId, startTime) {
        const dnsType = this.getDNSType(type);
        let url = new URL(server.address);
        
        if (!url.pathname.includes('dns-query')) {
            url.pathname = url.pathname.endsWith('/') ? url.pathname + 'dns-query' : url.pathname + '/dns-query';
        }

        const dnsMessage = this.createDNSMessage(domain, dnsType);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Accept': 'application/dns-message',
                'Content-Type': 'application/dns-message',
                'User-Agent': 'YADNSB/1.0'
            },
            body: dnsMessage,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.logHTTPDetails('DoH-POST', url, {
                'Accept': 'application/dns-message',
                'Content-Type': 'application/dns-message',
                'User-Agent': 'YADNSB/1.0'
            }, response.status, response.headers.get('content-type'), null, requestId);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        const responseBuffer = await response.arrayBuffer();
        
        logger.logHTTPDetails('DoH-POST', url, {
            'Accept': 'application/dns-message',
            'Content-Type': 'application/dns-message',
            'User-Agent': 'YADNSB/1.0'
        }, response.status, contentType, `Binary data (${responseBuffer.byteLength} bytes)`, requestId);

        let result;
        if (contentType && contentType.includes('application/dns-message')) {
            result = this.parseDNSMessage(Buffer.from(responseBuffer));
        } else if (contentType && (contentType.includes('application/json') || contentType.includes('application/dns-json'))) {
            const responseText = Buffer.from(responseBuffer).toString('utf-8');
            const data = JSON.parse(responseText);
            result = this.extractAnswersFromJSON(data, dnsType);
        } else {
            throw new Error(`Unexpected content type: ${contentType}`);
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const finalResult = {
            success: true,
            responseTime: responseTime,
            result: result,
            server: server,
            domain: domain,
            type: type,
            method: 'POST'
        };

        logger.logDNSResponse('DoH-POST', domain, server, type, requestId, finalResult, responseTime);
        return finalResult;
    }

    async resolveWithGET(domain, server, type, requestId, startTime) {
        const dnsType = this.getDNSType(type);
        let url;
        
        if (server.address.includes('dns.nextdns.io')) {
            url = new URL(server.address.endsWith('/') ? server.address + 'dns-query' : server.address + '/dns-query');
        } else if (server.address.includes('freedns.controld.com')) {
            url = new URL(server.address);
        } else {
            url = new URL(server.address);
            if (!url.pathname.includes('dns-query')) {
                url.pathname = url.pathname.endsWith('/') ? url.pathname + 'dns-query' : url.pathname + '/dns-query';
            }
        }
        
        url.searchParams.set('name', domain);
        url.searchParams.set('type', type.toUpperCase());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/dns-json',
                'User-Agent': 'YADNSB/1.0'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.logHTTPDetails('DoH-GET', url, {
                'Accept': 'application/dns-json',
                'User-Agent': 'YADNSB/1.0'
            }, response.status, response.headers.get('content-type'), null, requestId);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        let data;
        let responseText;
        
        if (contentType && contentType.includes('application/dns-message')) {
            const responseBuffer = await response.arrayBuffer();
            const result = this.parseDNSMessage(Buffer.from(responseBuffer));
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            const finalResult = {
                success: true,
                responseTime: responseTime,
                result: result,
                server: server,
                domain: domain,
                type: type,
                method: 'GET-binary'
            };

            logger.logDNSResponse('DoH-GET', domain, server, type, requestId, finalResult, responseTime);
            return finalResult;
        } else if (contentType && (contentType.includes('application/json') || contentType.includes('application/dns-json'))) {
            try {
                responseText = await response.text();
                logger.logHTTPDetails('DoH-GET', url, {
                    'Accept': 'application/dns-json',
                    'User-Agent': 'YADNSB/1.0'
                }, response.status, contentType, responseText, requestId);
                data = JSON.parse(responseText);
            } catch (parseError) {
                logger.logParsingError('DoH-GET', domain, server, type, requestId, responseText, parseError, performance.now() - startTime);
                throw new Error(`Failed to parse JSON response: ${parseError.message}`);
            }
        } else {
            logger.logInvalidResponse('DoH-GET', domain, server, type, requestId,
                `Content-Type: ${contentType}`,
                new Error(`Invalid content type: ${contentType}. Expected JSON or DNS message.`),
                performance.now() - startTime);
            throw new Error(`Invalid content type: ${contentType}. Expected JSON or DNS message.`);
        }

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (data.Status !== 0) {
            logger.logInvalidResponse('DoH-GET', domain, server, type, requestId, data,
                new Error(`DNS query failed with status: ${data.Status}`),
                responseTime);
            throw new Error(`DNS query failed with status: ${data.Status}`);
        }

        const result = this.extractAnswersFromJSON(data, dnsType);

        const finalResult = {
            success: true,
            responseTime: responseTime,
            result: result,
            server: server,
            domain: domain,
            type: type,
            rawResponse: data,
            method: 'GET-json'
        };

        logger.logDNSResponse('DoH-GET', domain, server, type, requestId, finalResult, responseTime);
        return finalResult;
    }

    extractAnswersFromJSON(data, dnsType) {
        if (!data.hasOwnProperty('Answer') && !data.hasOwnProperty('Authority')) {
            logger.warn('Response missing Answer and Authority sections', { data });
        }

        const answers = data.Answer || [];
        return answers
            .filter(answer => {
                if (!answer.hasOwnProperty('type') || !answer.hasOwnProperty('data')) {
                    logger.warn('Invalid answer record structure', { invalidAnswer: answer });
                    return false;
                }
                return answer.type === dnsType;
            })
            .map(answer => answer.data);
    }

    handleError(error, domain, server, type, requestId, startTime) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        let errorMessage = error.message;
        
        if (error.name === 'AbortError') {
            errorMessage = `Request timeout after ${this.timeout}ms`;
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = `DNS server not found: ${server.address}`;
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused to ${server.address}`;
        } else if (error.message.includes('Unexpected token')) {
            errorMessage = `Invalid JSON response from DoH server`;
        }

        const errorResult = {
            success: false,
            responseTime: responseTime,
            error: errorMessage,
            server: server,
            domain: domain,
            type: type
        };

        logger.logDNSResponse('DoH', domain, server, type, requestId, errorResult, responseTime);
        return errorResult;
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

    createDNSMessage(domain, type) {
        const message = Buffer.alloc(512);
        let offset = 0;

        message.writeUInt16BE(Math.floor(Math.random() * 65536), offset);
        offset += 2;

        message.writeUInt16BE(0x0100, offset);
        offset += 2;

        message.writeUInt16BE(1, offset);
        offset += 2;
        message.writeUInt16BE(0, offset);
        offset += 2;
        message.writeUInt16BE(0, offset);
        offset += 2;
        message.writeUInt16BE(0, offset);
        offset += 2;

        const labels = domain.split('.');
        for (const label of labels) {
            message.writeUInt8(label.length, offset);
            offset += 1;
            message.write(label, offset, 'ascii');
            offset += label.length;
        }
        message.writeUInt8(0, offset);
        offset += 1;

        message.writeUInt16BE(type, offset);
        offset += 2;
        message.writeUInt16BE(1, offset);
        offset += 2;

        return message.slice(0, offset);
    }

    parseDNSMessage(buffer) {
        try {
            const answers = [];
            let offset = 12;

            const qdcount = (buffer[4] << 8) | buffer[5];
            for (let i = 0; i < qdcount; i++) {
                while (buffer[offset] !== 0) {
                    offset += buffer[offset] + 1;
                }
                offset += 5;
            }

            const ancount = (buffer[6] << 8) | buffer[7];
            for (let i = 0; i < ancount; i++) {
                if ((buffer[offset] & 0xC0) === 0xC0) {
                    offset += 2;
                } else {
                    while (buffer[offset] !== 0) {
                        offset += buffer[offset] + 1;
                    }
                    offset += 1;
                }

                const type = (buffer[offset] << 8) | buffer[offset + 1];
                offset += 8;
                const rdlength = (buffer[offset] << 8) | buffer[offset + 1];
                offset += 2;

                if (type === 1 && rdlength === 4) {
                    const ip = `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
                    answers.push(ip);
                }

                offset += rdlength;
            }

            return answers;
        } catch (error) {
            throw new Error(`Failed to parse DNS message: ${error.message}`);
        }
    }

    setTimeout(timeout) {
        this.timeout = timeout;
    }
}

export default DoHResolver;