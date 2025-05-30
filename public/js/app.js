class YADNSBApp {
    constructor() {
        this.providers = [];
        this.selectedProviders = [];
        this.isTestRunning = false;
        this.init();
    }

    async init() {
        await this.loadProviders();
        this.setupEventListeners();
        this.renderProviders();
        this.renderPresetDomains();
        this.updateUI();
        this.loadSavedLanguage();
        
        resultsManager.displayResults();
    }

    async loadProviders() {
        try {
            const response = await fetch('/data/dns-providers.json');
            const data = await response.json();
            this.providers = data.providers;
            this.testDomains = data.testDomains;
        } catch (error) {
            console.error('Failed to load DNS providers:', error);
            this.providers = [];
            this.testDomains = [];
        }
    }

    setupEventListeners() {
        document.getElementById('startTest').addEventListener('click', () => this.startTest());
        document.getElementById('stopTest').addEventListener('click', () => this.stopTest());
        
        document.getElementById('selectAllProviders').addEventListener('click', () => this.selectAllProviders());
        document.getElementById('deselectAllProviders').addEventListener('click', () => this.deselectAllProviders());
        
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportJSON());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            resultsManager.setSortBy(e.target.value);
        });

        document.querySelectorAll('.protocol-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.filterProviders());
        });

        document.querySelectorAll('[data-lang]').forEach(langLink => {
            langLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeLanguage(e.target.closest('[data-lang]').dataset.lang);
            });
        });

        document.getElementById('usePresetDomains').addEventListener('change', (e) => {
            const presetSelect = document.getElementById('presetDomains');
            presetSelect.disabled = !e.target.checked;
            if (e.target.checked) {
                presetSelect.querySelectorAll('option').forEach(option => option.selected = true);
            }
        });

        window.addEventListener('testProgress', (e) => {
            resultsManager.setResults(e.detail.results);
        });

        window.addEventListener('testError', (e) => {
            this.handleTestError(e.detail.error);
        });
    }

    renderProviders() {
        const container = document.getElementById('providersList');
        if (!container) return;

        const selectedProtocols = this.getSelectedProtocols();

        const filteredProviders = this.providers.filter(provider => {
            const hasMatchingProtocol = provider.servers.some(server =>
                selectedProtocols.includes(server.type)
            );
            return hasMatchingProtocol;
        });

        const i18n = window.i18n;
        const tableHtml = `
            <div class="table-responsive">
                <table class="table table-dark table-hover mb-0">
                    <thead>
                        <tr>
                            <th style="width: 50px;">
                                <input type="checkbox" class="form-check-input" id="selectAllCheckbox">
                            </th>
                            <th>${i18n ? i18n.t('providers.provider') : 'Provider'}</th>
                            <th>${i18n ? i18n.t('providers.protocol') : 'Protocol'}</th>
                            <th>${i18n ? i18n.t('providers.address') : 'Address'}</th>
                            <th>${i18n ? i18n.t('providers.port') : 'Port'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateTableRows(filteredProviders, selectedProtocols)}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;

        document.querySelectorAll('.provider-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleProvider(e.target));
        });

        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAllProviders();
                } else {
                    this.deselectAllProviders();
                }
            });
        }

        this.updateProviderCount();
        this.updateSelectAllCheckbox();
    }

    generateTableRows(filteredProviders, selectedProtocols) {
        let rows = '';
        
        filteredProviders.forEach(provider => {
            const filteredServers = provider.servers.filter(server =>
                selectedProtocols.includes(server.type)
            );
            
            const isSelected = this.selectedProviders.some(p => p.name === provider.name);
            
            filteredServers.forEach((server, index) => {
                const isFirstRow = index === 0;
                const rowspan = isFirstRow ? filteredServers.length : 0;
                
                rows += `
                    <tr class="${isSelected ? 'table-success' : ''}">
                        ${isFirstRow ? `
                            <td rowspan="${rowspan}" class="align-middle">
                                <input class="form-check-input provider-checkbox"
                                       type="checkbox"
                                       id="provider-${provider.name.replace(/\s+/g, '-')}"
                                       data-provider="${provider.name}"
                                       ${isSelected ? 'checked' : ''}>
                            </td>
                            <td rowspan="${rowspan}" class="align-middle fw-semibold">
                                ${provider.name}
                            </td>
                        ` : ''}
                        <td>
                            <span class="badge ${this.getProtocolColor(server.type)}">${server.type}</span>
                        </td>
                        <td class="font-monospace">${server.address}</td>
                        <td>${server.port}</td>
                    </tr>
                `;
            });
        });
        
        return rows;
    }

    getProtocolColor(protocol) {
        const colors = {
            'IPv4': 'bg-primary',
            'IPv6': 'bg-info',
            'DoH': 'bg-success',
            'DoT': 'bg-warning text-dark',
            'DoQ': 'bg-danger'
        };
        return colors[protocol] || 'bg-secondary';
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (!selectAllCheckbox) return;

        const allCheckboxes = document.querySelectorAll('.provider-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.provider-checkbox:checked');
        
        if (checkedCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === allCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    renderPresetDomains() {
        const select = document.getElementById('presetDomains');
        if (!select || !this.testDomains) return;

        select.innerHTML = this.testDomains.map(domain => 
            `<option value="${domain}" selected>${domain}</option>`
        ).join('');
    }

    getSelectedProtocols() {
        return Array.from(document.querySelectorAll('.protocol-filter:checked'))
            .map(cb => cb.value);
    }



    filterProviders() {
        this.renderProviders();
    }

    toggleProvider(checkbox) {
        const providerName = checkbox.dataset.provider;
        const provider = this.providers.find(p => p.name === providerName);
        
        if (!provider) return;

        if (checkbox.checked) {
            if (!this.selectedProviders.some(p => p.name === providerName)) {
                this.selectedProviders.push(provider);
            }
        } else {
            this.selectedProviders = this.selectedProviders.filter(p => p.name !== providerName);
        }

        this.updateProviderCount();
        this.updateSelectAllCheckbox();
        this.updateUI();
        this.renderProviders();
    }

    selectAllProviders() {
        const checkboxes = document.querySelectorAll('.provider-checkbox');
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.checked = true;
                const providerName = cb.dataset.provider;
                const provider = this.providers.find(p => p.name === providerName);
                if (provider && !this.selectedProviders.some(p => p.name === providerName)) {
                    this.selectedProviders.push(provider);
                }
            }
        });
        this.updateProviderCount();
        this.updateSelectAllCheckbox();
        this.updateUI();
        this.renderProviders();
    }

    deselectAllProviders() {
        const checkboxes = document.querySelectorAll('.provider-checkbox');
        checkboxes.forEach(cb => {
            if (cb.checked) {
                cb.checked = false;
            }
        });
        this.selectedProviders = [];
        this.updateProviderCount();
        this.updateSelectAllCheckbox();
        this.updateUI();
        this.renderProviders();
    }

    updateProviderCount() {
        const count = this.selectedProviders.length;
        const buttons = document.querySelectorAll('#selectAllProviders, #deselectAllProviders');
        buttons.forEach(btn => {
            const text = btn.querySelector('.provider-count');
            if (text) text.remove();
            
            if (count > 0) {
                const span = document.createElement('span');
                span.className = 'provider-count ms-1 badge bg-light text-dark';
                span.textContent = count;
                btn.appendChild(span);
            }
        });
    }

    async startTest() {
        if (this.isTestRunning) return;

        const config = this.getTestConfiguration();
        const validation = this.validateConfiguration(config);

        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        this.isTestRunning = true;
        this.updateUI();

        try {
            await dnsTester.startTest(config);
        } catch (error) {
            console.error('Test failed:', error);
            this.handleTestError(error.message);
        } finally {
            this.isTestRunning = false;
            this.updateUI();
        }
    }

    stopTest() {
        dnsTester.stopTest();
        this.isTestRunning = false;
        this.updateUI();
    }

    getTestConfiguration() {
        const usePresetDomains = document.getElementById('usePresetDomains').checked;
        const selectedPresetDomains = usePresetDomains ? 
            Array.from(document.getElementById('presetDomains').selectedOptions).map(opt => opt.value) : [];
        const customDomains = document.getElementById('customDomains').value;
        const testInterval = parseFloat(document.getElementById('testInterval').value);
        const testCount = parseInt(document.getElementById('testCount').value);
        const selectedProtocols = this.getSelectedProtocols();

        return {
            selectedProviders: this.selectedProviders,
            selectedProtocols,
            usePresetDomains,
            selectedPresetDomains,
            customDomains,
            testInterval,
            testCount
        };
    }

    validateConfiguration(config) {
        const i18n = window.i18n;
        
        if (config.selectedProviders.length === 0) {
            return { valid: false, message: i18n ? i18n.t('errors.noProvidersSelected') : 'Please select at least one DNS provider.' };
        }

        if (config.selectedProtocols.length === 0) {
            return { valid: false, message: 'Please select at least one DNS protocol type.' };
        }

        const hasTestDomains = (config.usePresetDomains && config.selectedPresetDomains.length > 0) ||
                              (config.customDomains && config.customDomains.trim());

        if (!hasTestDomains) {
            return { valid: false, message: i18n ? i18n.t('errors.noDomainsSelected') : 'Please select preset domains or enter custom domains to test.' };
        }

        if (config.testInterval < 0) {
            return { valid: false, message: 'Test interval must be 0 or greater.' };
        }

        if (config.testCount < 1 || config.testCount > 20) {
            return { valid: false, message: 'Number of tests must be between 1 and 20.' };
        }

        return { valid: true };
    }

    updateUI() {
        const startBtn = document.getElementById('startTest');
        const stopBtn = document.getElementById('stopTest');

        if (this.isTestRunning) {
            startBtn.classList.add('d-none');
            stopBtn.classList.remove('d-none');
        } else {
            startBtn.classList.remove('d-none');
            stopBtn.classList.add('d-none');
        }

        const configInputs = document.querySelectorAll('#testInterval, #testCount, #customDomains, #presetDomains, .protocol-filter, .provider-checkbox');
        configInputs.forEach(input => {
            input.disabled = this.isTestRunning;
        });
    }

    exportCSV() {
        resultsManager.exportResults('csv');
    }

    exportJSON() {
        resultsManager.exportResults('json');
    }

    clearResults() {
        const i18n = window.i18n;
        const message = i18n ? i18n.t('results.confirmClear') : 'Are you sure you want to clear all test results?';
        if (confirm(message)) {
            resultsManager.clearResults();
            dnsTester.clearResults();
        }
    }

    handleTestError(error) {
        console.error('Test error:', error);
        alert(`Test error: ${error}`);
        this.isTestRunning = false;
        this.updateUI();
    }

    async changeLanguage(langCode) {
        try {
            await window.i18n.setLanguage(langCode);
            this.updateLanguageDisplay(langCode);
            
            if (window.resultsManager) {
                window.resultsManager.updateTranslations();
            }
            
            localStorage.setItem('selectedLanguage', langCode);
            
            document.documentElement.lang = langCode;
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    }

    updateLanguageDisplay(langCode) {
        const languageNames = {
            'en': 'English',
            'pt-BR': 'Português (BR)',
            'fr': 'Français'
        };
        
        const currentLanguageSpan = document.getElementById('currentLanguage');
        if (currentLanguageSpan) {
            currentLanguageSpan.textContent = languageNames[langCode] || 'English';
        }
    }

    loadSavedLanguage() {
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage && ['en', 'pt-BR', 'fr'].includes(savedLanguage)) {
            this.changeLanguage(savedLanguage);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new YADNSBApp();
});