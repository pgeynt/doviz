// Domain konfigürasyonlarını import et
const domainConfigs = {
  'www.akakce.com': window.akakceConfig,
  'www.amazon.com.tr': window.amazonConfig,
  'www.hepsiburada.com': window.hepsiburadaConfig,
  'www.trendyol.com': window.trendyolConfig,
  'shop.kosatec.de': window.kosatecConfig,
  'www.imcopex.shop': window.imcopexConfig,
  'www.siewert-kau.com': window.siewertKauConfig,
  'www.wave-distribution.de': window.waveDistributionConfig
};

// Kullanıcı tarafından eklenmiş özel konfigürasyonları sakla
const customConfigs = {};

// Domain handler
const DomainHandler = {
  // Kullanıcı tarafından tanımlanmış domain konfigürasyonu ekle
  addCustomConfig(config) {
    try {
      if (!config || !config.name || !config.priceSelectors || !Array.isArray(config.priceSelectors)) {
        console.error('Invalid configuration:', config);
        return false;
      }
      
      const currentDomain = window.location.hostname;
      customConfigs[currentDomain] = config;
      
      console.log(`Custom config added for domain ${currentDomain}:`, config);
      console.log('Current customConfigs:', customConfigs);
      
      return true;
    } catch (error) {
      console.error('Error adding custom config:', error);
      return false;
    }
  },
  
  // Tüm özel konfigürasyonları temizle
  clearCustomConfigs() {
    try {
      Object.keys(customConfigs).forEach(key => delete customConfigs[key]);
      console.log('All custom configs cleared');
      return true;
    } catch (error) {
      console.error('Error clearing custom configs:', error);
      return false;
    }
  },
  
  // Kullanıcı tarafından tanımlanmış domain konfigürasyonunu bul
  findUserDomainConfig() {
    try {
      const currentDomain = window.location.hostname;
      const config = customConfigs[currentDomain];
      
      if (config) {
        console.log(`Found user defined config for domain ${currentDomain}:`, config);
      } else {
        console.log(`No user defined config found for domain ${currentDomain}`);
      }
      
      return config || null;
    } catch (error) {
      console.error('Error finding user domain config:', error);
      return null;
    }
  },

  getCurrentConfig() {
    try {
      const currentDomain = window.location.hostname;
      
      // Öncelikle kullanıcı tanımlı konfigürasyonu kontrol et
      const userConfig = this.findUserDomainConfig();
      if (userConfig) {
        console.log(`Using user defined config for ${currentDomain}`);
        return userConfig;
      }
      
      // Kullanıcı tanımlı konfig yoksa varsayılan konfigürasyonu al
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
      
      // Özel konfigürasyonlarda ve varsayılan konfigürasyonlarda ara
      return !!customConfigs[domain] || !!domainConfigs[domain];
    } catch (error) {
      console.error('Error checking if domain is supported:', error);
      return false;
    }
  },

  getSupportedDomains() {
    try {
      // Varsayılan domainleri ve özel domainleri birleştir
      const defaultDomains = Object.keys(domainConfigs);
      const customDomains = Object.keys(customConfigs);
      
      // Tekrar eden domainleri filtrele
      return [...new Set([...defaultDomains, ...customDomains])];
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
      
      // Önce özel konfigürasyonu kontrol et
      if (currentConfig.isUserDefined) {
        return currentConfig.type === 'euro';
      }
      
      // Sonra varsayılan Euro bazlı siteleri kontrol et
      const euroBasedSites = ['Kosatec', 'Imcopex', 'Siewert-Kau', 'Wave Distribution'];
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
  },
  
  // Özel fiyat selektörleri al
  getPriceSelectors() {
    try {
      const currentConfig = this.getCurrentConfig();
      if (!currentConfig || !currentConfig.priceSelectors) {
        return [];
      }
      
      return currentConfig.priceSelectors;
    } catch (error) {
      console.error('Error getting price selectors:', error);
      return [];
    }
  },
  
  // XPath kullanılacak mı kontrol et
  shouldUseXPath() {
    try {
      const currentConfig = this.getCurrentConfig();
      return currentConfig ? !!currentConfig.useXPath : false;
    } catch (error) {
      console.error('Error checking if should use XPath:', error);
      return false;
    }
  },
  
  // Para birimi tipini al
  getCurrencyType() {
    try {
      if (this.isEuroBased()) {
        return 'euro';
      }
      return 'try';
    } catch (error) {
      console.error('Error getting currency type:', error);
      return 'try'; // Varsayılan olarak TL
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
