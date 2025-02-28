/**
 * Domain yapılandırması ve fiyat seçicileri için yardımcı sınıf
 * Bu sınıf farklı siteler için fiyat seçicilerini ve özelliklerini yönetir
 */

// Self-executing function to create a scope
(function(window) {
  // Desteklenen domainler ve yapılandırmaları
  const domainConfigs = {
    'www.hepsiburada.com': {
      name: 'Hepsiburada',
      priceSelectors: [
        '.product-price span[data-bind]',
        '.price-value',
        '.price-container'
      ],
      excludeSelectors: [
        '.strike-price',
        '.price-old'
      ],
      type: 'tl'
    },
    'www.trendyol.com': {
      name: 'Trendyol',
      priceSelectors: [
        '.prc-dsc',
        '.prc-org',
        '.product-price-container'
      ],
      excludeSelectors: [
        '.product-price-container .discounted-price'
      ],
      type: 'tl'
    },
    'www.akakce.com': {
      name: 'Akakce',
      priceSelectors: [
        '.pt_v8',
        '.iD',
        '.fiyat'
      ],
      type: 'tl'
    },
    'www.amazon.com.tr': {
      name: 'Amazon',
      priceSelectors: [
        '.a-price-whole',
        '.a-price',
        '#priceblock_ourprice'
      ],
      excludeSelectors: [
        '.a-text-price'
      ],
      type: 'tl'
    },
    'shop.kosatec.de': {
      name: 'Kosatec',
      priceSelectors: [
        '.price',
        '.product-price'
      ],
      type: 'euro'
    },
    'www.imcopex.shop': {
      name: 'Imcopex',
      priceSelectors: [
        '.price-container',
        '.price',
        '.product-price'
      ],
      type: 'euro'
    },
    'www.siewert-kau.com': {
      name: 'Siewert-Kau',
      priceSelectors: [
        '.product-price-container',
        '.price'
      ],
      type: 'euro'
    }
  };

  // Kullanıcıların eklediği özel konfigürasyonlar
  let customConfigs = {};

  // DomainHandler nesnesi
  const DomainHandler = {
    // Mevcut sayfanın domainini al
    getCurrentDomain: function() {
      return window.location.hostname;
    },
    
    // Mevcut domain için konfigürasyon al
    getCurrentConfig: function() {
      const currentDomain = this.getCurrentDomain();
      
      // Önce özel yapılandırmaları kontrol et
      if (customConfigs[currentDomain]) {
        return customConfigs[currentDomain];
      }
      
      // Sonra varsayılan yapılandırmaları kontrol et
      return domainConfigs[currentDomain] || null;
    },
    
    // Domain Euro bazlı mı kontrol et
    isEuroBased: function() {
      const config = this.getCurrentConfig();
      return config && config.type === 'euro';
    },
    
    // Tüm yapılandırmaları getir
    getAllConfigs: function() {
      // Varsayılan ve özel yapılandırmaları birleştir
      return { ...domainConfigs, ...customConfigs };
    },
    
    // Fiyat dönüştürücüyü al
    getPriceConverter: function() {
      const isEuroBased = this.isEuroBased();
      return isEuroBased ? window.EuroBasedConverter : window.TryBasedConverter;
    },
    
    // Özel bir yapılandırma ekle
    addCustomConfig: function(config) {
      if (!config || !config.name || !config.priceSelectors) {
        console.error('Invalid configuration');
        return false;
      }
      
      const currentDomain = this.getCurrentDomain();
      
      // Yapılandırmayı kaydet
      customConfigs[currentDomain] = {
        ...config,
        // Tipi belirtilmemişse, varsayılan olarak 'tl' kullan
        type: config.type || 'tl'
      };
      
      console.log(`Custom configuration added for domain ${currentDomain}:`, config);
      return true;
    },
    
    // Özel bir yapılandırmayı kaldır
    removeCustomConfig: function(domain) {
      if (customConfigs[domain]) {
        delete customConfigs[domain];
        return true;
      }
      return false;
    }
  };
  
  // DomainHandler'ı global scope'a ekle
  window.DomainHandler = DomainHandler;
  
})(window); 