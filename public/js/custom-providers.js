class CustomProvidersManager {
    constructor() {
        this.customProviders = [];
        this.loadCustomProviders();
    }

    loadCustomProviders() {
        try {
            const stored = localStorage.getItem('customDnsProviders');
            this.customProviders = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load custom providers:', error);
            this.customProviders = [];
        }
    }

    saveCustomProviders() {
        try {
            localStorage.setItem('customDnsProviders', JSON.stringify(this.customProviders));
        } catch (error) {
            console.error('Failed to save custom providers:', error);
        }
    }

    addProvider(providerData) {
        const provider = this.createProviderObject(providerData);
        if (this.validateProvider(provider)) {
            this.customProviders.push(provider);
            this.saveCustomProviders();
            return { success: true, provider };
        }
        return { success: false, error: 'Invalid provider data' };
    }

    updateProvider(index, providerData) {
        if (index >= 0 && index < this.customProviders.length) {
            const provider = this.createProviderObject(providerData);
            if (this.validateProvider(provider)) {
                this.customProviders[index] = provider;
                this.saveCustomProviders();
                return { success: true, provider };
            }
        }
        return { success: false, error: 'Invalid provider data or index' };
    }

    deleteProvider(index) {
        if (index >= 0 && index < this.customProviders.length) {
            const deleted = this.customProviders.splice(index, 1);
            this.saveCustomProviders();
            return { success: true, deleted: deleted[0] };
        }
        return { success: false, error: 'Invalid index' };
    }

    createProviderObject(data) {
        const servers = [];
        
        if (data.ipv4Primary && this.isValidIPv4(data.ipv4Primary)) {
            servers.push({
                type: 'IPv4',
                address: data.ipv4Primary,
                port: 53
            });
        }
        
        if (data.ipv4Secondary && this.isValidIPv4(data.ipv4Secondary)) {
            servers.push({
                type: 'IPv4',
                address: data.ipv4Secondary,
                port: 53
            });
        }

        if (data.ipv6Primary && this.isValidIPv6(data.ipv6Primary)) {
            servers.push({
                type: 'IPv6',
                address: data.ipv6Primary,
                port: 53
            });
        }
        
        if (data.ipv6Secondary && this.isValidIPv6(data.ipv6Secondary)) {
            servers.push({
                type: 'IPv6',
                address: data.ipv6Secondary,
                port: 53
            });
        }

        if (data.dohUrl && this.isValidUrl(data.dohUrl)) {
            servers.push({
                type: 'DoH',
                address: data.dohUrl,
                port: 443,
                method: 'POST',
                format: 'wireformat'
            });
        }

        if (data.dotHost && this.isValidHostname(data.dotHost)) {
            servers.push({
                type: 'DoT',
                address: data.dotHost,
                port: data.dotPort || 853
            });
        }

        if (data.doqHost && this.isValidHostname(data.doqHost)) {
            servers.push({
                type: 'DoQ',
                address: data.doqHost,
                port: data.doqPort || 853
            });
        }

        return {
            name: data.name,
            servers: servers,
            isCustom: true
        };
    }

    validateProvider(provider) {
        return provider.name && 
               provider.name.trim().length > 0 && 
               provider.servers && 
               provider.servers.length > 0;
    }

    isValidIPv4(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }

    isValidIPv6(ip) {
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        
        try {
            ip = ip.trim();
            
            if (ip === '::' || ip === '::1') {
                return true;
            }
            
            if (!/^[0-9a-fA-F:]+$/.test(ip)) {
                return false;
            }
            
            const doubleColonCount = (ip.match(/::/g) || []).length;
            if (doubleColonCount > 1) {
                return false;
            }
            
            if (ip.includes('::')) {
                const parts = ip.split('::');
                if (parts.length !== 2) {
                    return false;
                }
                
                const leftParts = parts[0] ? parts[0].split(':') : [];
                const rightParts = parts[1] ? parts[1].split(':') : [];
                
                const allParts = [...leftParts, ...rightParts];
                for (const part of allParts) {
                    if (part && (part.length > 4 || !/^[0-9a-fA-F]+$/.test(part))) {
                        return false;
                    }
                }
                
                const totalGroups = leftParts.length + rightParts.length;
                return totalGroups < 8;
            } else {
                const parts = ip.split(':');
                if (parts.length !== 8) {
                    return false;
                }
                
                for (const part of parts) {
                    if (!part || part.length > 4 || !/^[0-9a-fA-F]+$/.test(part)) {
                        return false;
                    }
                }
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    isValidHostname(hostname) {
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return hostnameRegex.test(hostname);
    }

    getCustomProviders() {
        return [...this.customProviders];
    }

    showAddProviderModal() {
        this.showProviderModal();
    }

    showEditProviderModal(index) {
        if (index >= 0 && index < this.customProviders.length) {
            const provider = this.customProviders[index];
            this.showProviderModal(provider, index);
        }
    }

    showProviderModal(provider = null, editIndex = null) {
        const i18n = window.i18n;
        const isEdit = provider !== null;
        
        let formData = {
            name: '',
            ipv4Primary: '',
            ipv4Secondary: '',
            ipv6Primary: '',
            ipv6Secondary: '',
            dohUrl: '',
            dotHost: '',
            dotPort: 853,
            doqHost: '',
            doqPort: 853
        };

        if (isEdit) {
            formData.name = provider.name;
            const ipv4Servers = provider.servers.filter(s => s.type === 'IPv4');
            const ipv6Servers = provider.servers.filter(s => s.type === 'IPv6');
            const dohServer = provider.servers.find(s => s.type === 'DoH');
            const dotServer = provider.servers.find(s => s.type === 'DoT');
            const doqServer = provider.servers.find(s => s.type === 'DoQ');

            if (ipv4Servers.length > 0) formData.ipv4Primary = ipv4Servers[0].address;
            if (ipv4Servers.length > 1) formData.ipv4Secondary = ipv4Servers[1].address;
            if (ipv6Servers.length > 0) formData.ipv6Primary = ipv6Servers[0].address;
            if (ipv6Servers.length > 1) formData.ipv6Secondary = ipv6Servers[1].address;
            if (dohServer) formData.dohUrl = dohServer.address;
            if (dotServer) {
                formData.dotHost = dotServer.address;
                formData.dotPort = dotServer.port;
            }
            if (doqServer) {
                formData.doqHost = doqServer.address;
                formData.doqPort = doqServer.port;
            }
        }

        const modalHtml = `
            <div class="modal fade" id="customProviderModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-plus-circle me-2"></i>
                                ${i18n ? i18n.t('customProvider.title') : 'Add Custom Provider'}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="customProviderForm">
                                <div class="mb-3">
                                    <label for="providerName" class="form-label">
                                        ${i18n ? i18n.t('customProvider.name') : 'Provider Name'} *
                                    </label>
                                    <input type="text" class="form-control" id="providerName" 
                                           placeholder="${i18n ? i18n.t('customProvider.namePlaceholder') : 'e.g. My Custom DNS'}"
                                           value="${formData.name}" required>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <h6 class="text-primary mb-3">
                                            <i class="bi bi-globe me-2"></i>IPv4 Servers
                                        </h6>
                                        <div class="mb-3">
                                            <label for="ipv4Primary" class="form-label">
                                                ${i18n ? i18n.t('customProvider.ipv4Primary') : 'Primary IPv4'}
                                            </label>
                                            <input type="text" class="form-control" id="ipv4Primary" 
                                                   placeholder="8.8.8.8" value="${formData.ipv4Primary}">
                                        </div>
                                        <div class="mb-3">
                                            <label for="ipv4Secondary" class="form-label">
                                                ${i18n ? i18n.t('customProvider.ipv4Secondary') : 'Secondary IPv4 (optional)'}
                                            </label>
                                            <input type="text" class="form-control" id="ipv4Secondary" 
                                                   placeholder="8.8.4.4" value="${formData.ipv4Secondary}">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6 class="text-info mb-3">
                                            <i class="bi bi-globe2 me-2"></i>IPv6 Servers
                                        </h6>
                                        <div class="mb-3">
                                            <label for="ipv6Primary" class="form-label">
                                                ${i18n ? i18n.t('customProvider.ipv6Primary') : 'Primary IPv6'}
                                            </label>
                                            <input type="text" class="form-control" id="ipv6Primary" 
                                                   placeholder="2001:4860:4860::8888" value="${formData.ipv6Primary}">
                                        </div>
                                        <div class="mb-3">
                                            <label for="ipv6Secondary" class="form-label">
                                                ${i18n ? i18n.t('customProvider.ipv6Secondary') : 'Secondary IPv6 (optional)'}
                                            </label>
                                            <input type="text" class="form-control" id="ipv6Secondary" 
                                                   placeholder="2001:4860:4860::8844" value="${formData.ipv6Secondary}">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-12">
                                        <h6 class="text-success mb-3">
                                            <i class="bi bi-shield-lock me-2"></i>Secure DNS Protocols
                                        </h6>
                                        <div class="mb-3">
                                            <label for="dohUrl" class="form-label">
                                                ${i18n ? i18n.t('customProvider.dohUrl') : 'DoH URL (optional)'}
                                            </label>
                                            <input type="url" class="form-control" id="dohUrl" 
                                                   placeholder="${i18n ? i18n.t('customProvider.dohUrlPlaceholder') : 'https://example.com/dns-query'}"
                                                   value="${formData.dohUrl}">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="dotHost" class="form-label">
                                                ${i18n ? i18n.t('customProvider.dotHost') : 'DoT Host (optional)'}
                                            </label>
                                            <input type="text" class="form-control" id="dotHost" 
                                                   placeholder="${i18n ? i18n.t('customProvider.dotHostPlaceholder') : 'dns.example.com'}"
                                                   value="${formData.dotHost}">
                                        </div>
                                        <div class="mb-3">
                                            <label for="dotPort" class="form-label">
                                                DoT ${i18n ? i18n.t('customProvider.port') : 'Port'}
                                            </label>
                                            <input type="number" class="form-control" id="dotPort" 
                                                   value="${formData.dotPort}" min="1" max="65535">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="doqHost" class="form-label">
                                                ${i18n ? i18n.t('customProvider.doqHost') : 'DoQ Host (optional)'}
                                            </label>
                                            <input type="text" class="form-control" id="doqHost" 
                                                   placeholder="${i18n ? i18n.t('customProvider.doqHostPlaceholder') : 'dns.example.com'}"
                                                   value="${formData.doqHost}">
                                        </div>
                                        <div class="mb-3">
                                            <label for="doqPort" class="form-label">
                                                DoQ ${i18n ? i18n.t('customProvider.port') : 'Port'}
                                            </label>
                                            <input type="number" class="form-control" id="doqPort" 
                                                   value="${formData.doqPort}" min="1" max="65535">
                                        </div>
                                    </div>
                                </div>

                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle me-2"></i>
                                    <small>${i18n ? i18n.t('customProvider.validation.atLeastOneServer') : 'At least one server must be configured'}</small>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                ${i18n ? i18n.t('customProvider.cancel') : 'Cancel'}
                            </button>
                            <button type="button" class="btn btn-primary" id="saveCustomProvider">
                                <i class="bi bi-check-lg me-2"></i>
                                ${i18n ? i18n.t('customProvider.add') : 'Add Provider'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('customProviderModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = new bootstrap.Modal(document.getElementById('customProviderModal'));
        modal.show();

        document.getElementById('saveCustomProvider').addEventListener('click', () => {
            this.handleSaveProvider(modal, isEdit, editIndex);
        });

        document.getElementById('customProviderModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('customProviderModal').remove();
        });
    }

    handleSaveProvider(modal, isEdit, editIndex) {
        const form = document.getElementById('customProviderForm');
        const formData = new FormData(form);
        
        const providerData = {
            name: document.getElementById('providerName').value.trim(),
            ipv4Primary: document.getElementById('ipv4Primary').value.trim(),
            ipv4Secondary: document.getElementById('ipv4Secondary').value.trim(),
            ipv6Primary: document.getElementById('ipv6Primary').value.trim(),
            ipv6Secondary: document.getElementById('ipv6Secondary').value.trim(),
            dohUrl: document.getElementById('dohUrl').value.trim(),
            dotHost: document.getElementById('dotHost').value.trim(),
            dotPort: parseInt(document.getElementById('dotPort').value) || 853,
            doqHost: document.getElementById('doqHost').value.trim(),
            doqPort: parseInt(document.getElementById('doqPort').value) || 853
        };

        const validation = this.validateForm(providerData);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        let result;
        if (isEdit) {
            result = this.updateProvider(editIndex, providerData);
        } else {
            result = this.addProvider(providerData);
        }

        if (result.success) {
            modal.hide();
            if (window.app) {
                window.app.refreshProviders();
            }
        } else {
            alert(result.error);
        }
    }

    validateForm(data) {
        const i18n = window.i18n;
        
        if (!data.name) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.nameRequired') : 'Provider name is required' 
            };
        }

        const hasServer = data.ipv4Primary || data.ipv4Secondary || 
                         data.ipv6Primary || data.ipv6Secondary || 
                         data.dohUrl || data.dotHost || data.doqHost;

        if (!hasServer) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.atLeastOneServer') : 'At least one server must be configured' 
            };
        }

        if (data.ipv4Primary && !this.isValidIPv4(data.ipv4Primary)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidIPv4') : 'Invalid IPv4 address' 
            };
        }
        if (data.ipv4Secondary && !this.isValidIPv4(data.ipv4Secondary)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidIPv4') : 'Invalid IPv4 address' 
            };
        }

        if (data.ipv6Primary && !this.isValidIPv6(data.ipv6Primary)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidIPv6') : 'Invalid IPv6 address' 
            };
        }
        if (data.ipv6Secondary && !this.isValidIPv6(data.ipv6Secondary)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidIPv6') : 'Invalid IPv6 address' 
            };
        }

        if (data.dohUrl && !this.isValidUrl(data.dohUrl)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidUrl') : 'Invalid URL' 
            };
        }

        if (data.dotHost && !this.isValidHostname(data.dotHost)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidUrl') : 'Invalid hostname' 
            };
        }
        if (data.doqHost && !this.isValidHostname(data.doqHost)) {
            return { 
                valid: false, 
                message: i18n ? i18n.t('customProvider.validation.invalidUrl') : 'Invalid hostname' 
            };
        }

        return { valid: true };
    }
}

window.customProvidersManager = new CustomProvidersManager();