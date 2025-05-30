class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch(`/locales/${this.currentLanguage}.json`);
            this.translations = await response.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            this.translations = {};
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        if (typeof value === 'string') {
            return this.interpolate(value, params);
        }
        
        return key;
    }

    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    async setLanguage(language) {
        this.currentLanguage = language;
        await this.loadTranslations();
        this.updatePageText();
    }

    updatePageText() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = element.getAttribute('data-i18n-params');
            const parsedParams = params ? JSON.parse(params) : {};
            
            if (element.tagName.toLowerCase() === 'option') {
                element.textContent = this.t(key, parsedParams);
            } else {
                element.textContent = this.t(key, parsedParams);
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }
}

window.i18n = new I18n();