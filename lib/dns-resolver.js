import { promises as dns } from 'dns';
import { performance } from 'perf_hooks';

class DNSResolver {
    constructor() {
        this.timeout = 5000;
    }

    async resolve(domain, server, type = 'A') {
        const startTime = performance.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`[DNS] Request initiated: ${domain} (${type}) via ${server.name}`);
        
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
                console.warn(`[DNS] Invalid response: DNS result is not an array for ${domain} (${type}) via ${server.name}`);
            } else if (result.length === 0) {
                console.warn(`[DNS] Empty result for ${domain} (${type}) via ${server.name}`);
            }

            const finalResult = {
                success: true,
                responseTime: responseTime,
                result: result,
                server: server,
                domain: domain,
                type: type
            };

            console.log(`[DNS] Response successful: ${domain} (${type}) via ${server.name} - ${Math.round(responseTime * 100) / 100}ms`);
            return finalResult;
        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Log detailed error information
            console.error(`[DNS] Resolution failed: ${domain} (${type}) via ${server.name} - ${error.message}`);

            const errorResult = {
                success: false,
                responseTime: responseTime,
                error: error.message,
                server: server,
                domain: domain,
                type: type
            };

            console.log(`[DNS] Response failed: ${domain} (${type}) via ${server.name} - ${Math.round(responseTime * 100) / 100}ms`);
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