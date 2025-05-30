class ResultsManager {
    constructor() {
        this.results = [];
        this.sortBy = 'average';
        this.storageKey = 'yadnsb_results';
        this.loadFromStorage();
    }

    addResults(newResults) {
        if (Array.isArray(newResults)) {
            this.results = this.results.concat(newResults);
        } else if (newResults) {
            this.results.push(newResults);
        }
        this.saveToStorage();
        this.displayResults();
    }

    setResults(results) {
        if (Array.isArray(results)) {
            this.results = [...results];
        } else {
            this.results = [];
        }
        this.saveToStorage();
        this.displayResults();
    }

    clearResults() {
        this.results = [];
        this.saveToStorage();
        this.displayResults();
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.results));
        } catch (error) {
            console.error('Failed to save results to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.results = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load results from localStorage:', error);
            this.results = [];
        }
    }

    calculateStatistics() {
        const stats = new Map();

        this.results.forEach(result => {
            if (!result.provider || !result.server || !result.server.type) {
                console.warn('Invalid result format:', result);
                return;
            }

            const key = `${result.provider}_${result.server.type}`;
            
            if (!stats.has(key)) {
                stats.set(key, {
                    provider: result.provider,
                    protocol: result.server.type,
                    server: result.server,
                    responseTimes: [],
                    successCount: 0,
                    totalCount: 0
                });
            }

            const stat = stats.get(key);
            stat.totalCount++;

            if (result.success && result.responseTime !== null && result.responseTime !== undefined && result.responseTime > 0) {
                stat.responseTimes.push(result.responseTime);
                stat.successCount++;
            }
        });

        const processedStats = Array.from(stats.values())
            .filter(stat => stat.responseTimes.length > 0)
            .map(stat => {
                const times = stat.responseTimes.sort((a, b) => a - b);
                const len = times.length;
                
                return {
                    provider: stat.provider,
                    protocol: stat.protocol,
                    server: stat.server,
                    min: len > 0 ? Math.min(...times) : 0,
                    max: len > 0 ? Math.max(...times) : 0,
                    average: len > 0 ? times.reduce((a, b) => a + b, 0) / len : 0,
                    median: len > 0 ? (len % 2 === 0 ? (times[len/2-1] + times[len/2]) / 2 : times[Math.floor(len/2)]) : 0,
                    successRate: stat.totalCount > 0 ? (stat.successCount / stat.totalCount) * 100 : 0,
                    testCount: stat.totalCount,
                    successCount: stat.successCount
                };
            });

        return this.sortResults(processedStats);
    }

    sortResults(stats) {
        return stats.sort((a, b) => {
            switch (this.sortBy) {
                case 'min':
                    return a.min - b.min;
                case 'max':
                    return a.max - b.max;
                case 'median':
                    return a.median - b.median;
                case 'successRate':
                    return b.successRate - a.successRate;
                case 'average':
                default:
                    return a.average - b.average;
            }
        });
    }

    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.displayResults();
    }

    updateTranslations() {
        this.displayResults();
    }

    displayResults() {
        const container = document.getElementById('resultsContainer');
        if (!container) {
            console.warn('Results container not found');
            return;
        }

        console.log(`Displaying results: ${this.results.length} total results`);

        if (this.results.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-speedometer2 display-1"></i>
                    <p class="mt-3">${window.i18n ? window.i18n.t('results.noResults') : 'No test results yet. Start a benchmark to see DNS performance data.'}</p>
                </div>
            `;
            return;
        }

        const stats = this.calculateStatistics();
        console.log(`Calculated statistics for ${stats.length} provider/protocol combinations`);
        
        if (stats.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-exclamation-triangle display-1"></i>
                    <p class="mt-3">No successful DNS queries found in test results.</p>
                    <p class="small">Total results: ${this.results.length}</p>
                </div>
            `;
            return;
        }
        
        const html = this.generateResultsHTML(stats);
        container.innerHTML = html;
        console.log('Results table updated successfully');
    }

    generateResultsHTML(stats) {
        const i18n = window.i18n;
        const msUnit = i18n ? i18n.t('results.units.ms') : 'ms';
        const percentUnit = i18n ? i18n.t('results.units.percent') : '%';
        
        const rows = stats.map((stat, index) => {
            return `
                <tr>
                    <td class="fw-bold">${index + 1}</td>
                    <td>
                        <div class="fw-semibold">${stat.provider}</div>
                        <small class="text-muted">${this.getProtocolBadge(stat.protocol)}</small>
                    </td>
                    <td class="text-end">${stat.min.toFixed(1)} ${msUnit}</td>
                    <td class="text-end">${stat.median.toFixed(1)} ${msUnit}</td>
                    <td class="text-end">${stat.average.toFixed(1)} ${msUnit}</td>
                    <td class="text-end">${stat.max.toFixed(1)} ${msUnit}</td>
                    <td class="text-end">
                        <span class="badge ${this.getSuccessRateBadge(stat.successRate)}">
                            ${stat.successRate.toFixed(1)}${percentUnit}
                        </span>
                    </td>
                    <td class="text-end">
                        <small class="text-muted">${stat.successCount}/${stat.testCount}</small>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-responsive">
                <table class="table table-dark table-striped table-hover mb-0">
                    <thead class="table-dark">
                        <tr>
                            <th>Rank</th>
                            <th>Provider</th>
                            <th class="text-end">${i18n ? i18n.t('results.metrics.min') : 'Min'}</th>
                            <th class="text-end">${i18n ? i18n.t('results.metrics.median') : 'Median'}</th>
                            <th class="text-end">${i18n ? i18n.t('results.metrics.average') : 'Average'}</th>
                            <th class="text-end">${i18n ? i18n.t('results.metrics.max') : 'Max'}</th>
                            <th class="text-end">${i18n ? i18n.t('results.metrics.successRate') : 'Success Rate'}</th>
                            <th class="text-end">Tests</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            <div class="p-3">
                <small class="text-muted">
                    <i class="bi bi-info-circle me-1"></i>
                    Total results: ${this.results.length} |
                    Successful queries: ${this.results.filter(r => r.success).length} |
                    Last updated: ${new Date().toLocaleString()}
                </small>
            </div>
        `;
    }

    getProtocolBadge(protocol) {
        const badges = {
            'IPv4': '<span class="badge bg-primary">IPv4</span>',
            'IPv6': '<span class="badge bg-info">IPv6</span>',
            'DoH': '<span class="badge bg-success">DoH</span>',
            'DoT': '<span class="badge bg-warning">DoT</span>',
            'DoQ': '<span class="badge bg-danger">DoQ</span>'
        };
        return badges[protocol] || `<span class="badge bg-secondary">${protocol}</span>`;
    }

    getSuccessRateBadge(rate) {
        if (rate >= 95) return 'bg-success';
        if (rate >= 80) return 'bg-warning';
        return 'bg-danger';
    }

    exportResults(format = 'json') {
        const stats = this.calculateStatistics();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        let content, filename, mimeType;

        if (format === 'csv') {
            content = this.generateCSV(stats);
            filename = `yadnsb-results-${timestamp}.csv`;
            mimeType = 'text/csv';
        } else {
            content = JSON.stringify({
                exportDate: new Date().toISOString(),
                totalResults: this.results.length,
                statistics: stats,
                rawResults: this.results
            }, null, 2);
            filename = `yadnsb-results-${timestamp}.json`;
            mimeType = 'application/json';
        }

        this.downloadFile(content, filename, mimeType);
    }

    generateCSV(stats) {
        const headers = ['Rank', 'Provider', 'Protocol', 'Min (ms)', 'Median (ms)', 'Average (ms)', 'Max (ms)', 'Success Rate (%)', 'Successful Tests', 'Total Tests'];
        
        const rows = stats.map((stat, index) => [
            index + 1,
            stat.provider,
            stat.protocol,
            stat.min.toFixed(1),
            stat.median.toFixed(1),
            stat.average.toFixed(1),
            stat.max.toFixed(1),
            stat.successRate.toFixed(1),
            stat.successCount,
            stat.testCount
        ]);

        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    getResultsSummary() {
        const stats = this.calculateStatistics();
        const totalTests = this.results.length;
        const successfulTests = this.results.filter(r => r.success).length;
        
        return {
            totalTests,
            successfulTests,
            failureRate: totalTests > 0 ? ((totalTests - successfulTests) / totalTests) * 100 : 0,
            providers: stats.length,
            fastestProvider: stats.length > 0 ? stats[0] : null,
            averageResponseTime: stats.length > 0 ? stats.reduce((sum, s) => sum + s.average, 0) / stats.length : 0
        };
    }
}

window.resultsManager = new ResultsManager();