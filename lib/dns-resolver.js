import { promises as dns } from 'dns';
import { performance } from 'perf_hooks';
import logger from './advanced-logger.js';

class DNSResolver {
    constructor() {
        this.timeout = 5000;
    }

    async resolve(domain, server, type = 'A') {
        const startTime = performance.now();
        const requestId = logger.generateRequestId();
        
        logger.logDNSRequest('DNS', domain, server, type, requestId);
        
        try {
            const resolver = new dns.Resolver();
            resolver.setServers([`${server.address}:${server.port || 53}`]);
            
            let result;
            switch (type.toLowerCase()) {
                case 'a':
                    result = await resolver.resolve4(domain);
                    break;
                case 'aaaa':
                    result = await resolver.resolve6(domain);
                    break;
                case 'mx':
                    result = await resolver.resolveMx(domain);
                    break;
                case 'txt':
                    result = await resolver.resolveTxt(domain);
                    break;
                case 'ns':
                    result = await resolver.resolveNs(domain);
                    break;
                case 'cname':
                    result = await resolver.resolveCname(domain);
                    break;
                default:
                    result = await resolver.resolve4(domain);
            }

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Validate result structure
            if (!Array.isArray(result)) {
                logger.logInvalidResponse('DNS', domain, server, type, requestId, result,
                    new Error('DNS result is not an array'),
                    responseTime);
            } else if (result.length === 0) {
                logger.warn('DNS query returned empty result', {
                    requestId,
                    resolver: 'DNS',
                    domain,
                    server: server.name,
                    type
                });
            }

            const finalResult = {
                success: true,
                responseTime: responseTime,
                result: result,
                server: server,
                domain: domain,
                type: type
            };

            logger.logDNSResponse('DNS', domain, server, type, requestId, finalResult, responseTime);
            return finalResult;
        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Log detailed error information
            logger.error('DNS resolution failed', {
                requestId,
                resolver: 'DNS',
                domain,
                server: {
                    name: server.name,
                    address: server.address,
                    port: server.port || 53
                },
                type,
                responseTime: Math.round(responseTime * 100) / 100,
                error: error.message,
                errorCode: error.code,
                errorStack: error.stack
            });

            const errorResult = {
                success: false,
                responseTime: responseTime,
                error: error.message,
                server: server,
                domain: domain,
                type: type
            };

            logger.logDNSResponse('DNS', domain, server, type, requestId, errorResult, responseTime);
            return errorResult;
        }
    }

    async resolveIPv4(domain, server) {
        return this.resolve(domain, server, 'A');
    }

    async resolveIPv6(domain, server) {
        return this.resolve(domain, server, 'AAAA');
    }

    setTimeout(timeout) {
        this.timeout = timeout;
    }
}

export default DNSResolver;