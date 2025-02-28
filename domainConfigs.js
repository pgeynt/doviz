// Domain konfigürasyonlarını import et
const domainConfigs = {
  'www.akakce.com': window.akakceConfig,
  'www.amazon.com.tr': window.amazonConfig,
  'www.hepsiburada.com': window.hepsiburadaConfig,
  'www.trendyol.com': window.trendyolConfig,
  'shop.kosatec.de': window.kosatecConfig,
  'www.imcopex.shop': window.imcopexConfig,
  'www.siewert-kau.com': window.siewertKauConfig
};

// Domain handler
const DomainHandler = {
  getCurrentConfig() {
    try {
      const currentDomain = window.location.hostname;
      const config = domainConfigs[currentDomain] || null;
      
      if (!config) {
        console.warn(`No configuration found for domain: ${currentDomain}`);
        return null;
      }
      
      // Gerekli özelliklerin varlığını doğrula
      if (!config.name) {
        console.warn(`Missing name in configuration for domain: ${currentDomain}`);
      }
      
      if (!config.priceSelectors || !Array.isArray(config.priceSelectors) || config.priceSelectors.length === 0) {
        console.warn(`Invalid or missing price selectors in configuration for domain: ${currentDomain}`);
      }
      
      return config;
    } catch (error) {
      console.error('Error getting current config:', error);
      return null;
    }
  },

  isSupported(domain) {
    try {
      if (!domain) {
        return false;
      }
      return !!domainConfigs[domain];
    } catch (error) {
      console.error('Error checking if domain is supported:', error);
      return false;
    }
  },

  getSupportedDomains() {
    try {
      return Object.keys(domainConfigs);
    } catch (error) {
      console.error('Error getting supported domains:', error);
      return [];
    }
  },

  // Euro bazlı siteleri tespit et
  isEuroBased() {
    try {
      const currentConfig = this.getCurrentConfig();
      if (!currentConfig) return false;
      
      const euroBasedSites = ['Kosatec', 'Imcopex', 'Siewert-Kau'];
      return euroBasedSites.includes(currentConfig.name);
    } catch (error) {
      console.error('Error checking if site is Euro based:', error);
      return false;
    }
  },

  // Fiyat çevirici al
  getPriceConverter() {
    try {
      const isEuro = this.isEuroBased();
      
      // window.getConverter fonksiyonu tanımlıysa kullan
      if (typeof window.getConverter === 'function') {
        return window.getConverter(isEuro ? 'euro' : 'try');
      }
      
      // Aksi halde doğrudan erişmeyi dene
      return isEuro ? window.EuroBasedConverter : window.TryBasedConverter;
    } catch (error) {
      console.error('Error getting price converter:', error);
      
      // Fallback - hata olmaması için varsayılan dönüştürücü
      return {
        convert: function(p) { return { convertedPrice: p, currencySymbol: '?', workingPrice: p, baseCurrency: '?' }; },
        calculateFinance: function() { return ''; }
      };
    }
  }
};

// Domain Config'leri yüklenmiş mi kontrol et ve sorunları raporla
(() => {
  try {
    const supportedDomains = Object.keys(domainConfigs);
    const missingConfigs = supportedDomains.filter(domain => !domainConfigs[domain]);
    
    if (missingConfigs.length > 0) {
      console.warn('Missing domain configurations:', missingConfigs.join(', '));
    }
    
    // Geçerli domain için konfigürasyon kontrolü yap
    const currentDomain = window.location.hostname;
    if (domainConfigs[currentDomain]) {
      console.info(`Domain configuration loaded for: ${currentDomain}`);
    }
  } catch (error) {
    console.error('Error validating domain configs:', error);
  }
})();

// Export
window.DomainHandler = DomainHandler;
