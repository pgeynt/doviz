/**
 * Content Script - Döviz Kuru ve Fiyat Dönüştürme Eklentisi
 * 
 * Bu dosya, döviz kuru sitelerinden veri çekme ve e-ticaret sitelerinde
 * fiyat dönüştürme işlemlerini yönetir. Utilities klasöründeki dosyaları
 * kullanarak daha modüler bir yapı sağlar.
 */

(() => {
  try {
    // Kur sitelerinde işlem
    const currentUrl = window.location.href;
    
    if (isExchangeRateSite(currentUrl)) {
      handleExchangeRateSite(currentUrl);
    } else {
      // E-ticaret sitelerinde gerekli dinleyicileri kurma
      setupSiteListeners();
      
      // Mevcut domain için kaydedilmiş XPath/Selector'ları kontrol et ve uygula
      checkAndApplySavedSelectors();
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
})();

/**
 * Mevcut domain için kaydedilmiş XPath/Selector'ları kontrol eder ve uygular
 */
function checkAndApplySavedSelectors() {
  try {
    const currentDomain = window.location.hostname;
    console.log(`Checking saved selectors for domain: ${currentDomain}`);
    
    chrome.storage.local.get(['savedDomains'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting storage data:', chrome.runtime.lastError);
        return;
      }
      
      const savedDomains = result.savedDomains || [];
      const domainData = savedDomains.find(domain => domain.hostname === currentDomain);
      
      if (domainData && domainData.xpath) {
        console.log(`Found saved selector for domain ${currentDomain}: ${domainData.xpath} (Type: ${domainData.selectorType || 'auto-detect'})`);
        
        // Kaydedilmiş XPath veya selector'ı kullan
        setTimeout(() => {
          try {
            // Domain için konfigürasyon oluştur
            if (typeof DomainHandler !== 'undefined') {
              const config = {
                name: "UserDefined",
                priceSelectors: [domainData.xpath],
                // Selector tipini belirle (XPath veya CSS)
                useXPath: domainData.xpath.startsWith('/') || domainData.selectorType === 'xpath',
                type: domainData.type || 'tl', // varsayılan olarak tl
                isUserDefined: true // Özel yapılandırma olduğunu belirt
              };
              
              console.log(`Applying selector: ${domainData.xpath}, 
                          Type: ${domainData.selectorType || 'auto-detected'}, 
                          useXPath: ${config.useXPath},
                          currencyType: ${config.type}`);
              
              // Eğer DomainHandler varsa, konfigurasyon ekleyelim
              try {
                if (typeof DomainHandler.addCustomConfig === 'function') {
                  const success = DomainHandler.addCustomConfig(config);
                  console.log(`Custom config added for domain: ${success ? 'Success' : 'Failed'}`);
                  
                  // Mevcut dönüşümleri temizleyelim ki yeni seçicileri temiz bir şekilde uygulayabilelim
                  if (typeof window.clearExistingConversions === 'function') {
                    window.clearExistingConversions();
                    console.log('Cleared existing conversion boxes');
                  }
                }
              } catch (configError) {
                console.warn('Error adding custom config:', configError);
              }
              
              // Fiyat dönüştürücüyü çalıştır
              if (typeof window.checkAndConvertPrices === 'function') {
                console.log('Running price conversion with custom selector...');
                window.checkAndConvertPrices();
              } else {
                console.warn('checkAndConvertPrices function is not available');
              }
            } else {
              console.warn('DomainHandler is undefined, cannot apply saved selector');
            }
          } catch (error) {
            console.error('Error applying saved selector:', error);
          }
        }, 1500); // Sayfanın tamamen yüklenmesi için biraz bekle
      } else {
        console.log(`No saved selector found for domain ${currentDomain}, using default settings if available`);
      }
    });
  } catch (error) {
    console.error('Error in checkAndApplySavedSelectors:', error);
  }
}

/**
 * Döviz kuru sitesi olup olmadığını kontrol eder
 * @param {string} url - Kontrol edilecek URL
 * @returns {boolean} - Döviz kur sitesi ise true
 */
function isExchangeRateSite(url) {
  const exchangeRatePatterns = [
    'amerikan-dolari',
    'serbest-piyasa/euro',
    'pariteler/eur-usd',
    'cin-yuani'
  ];
  
  return exchangeRatePatterns.some(pattern => url.includes(pattern));
}

/**
 * Döviz kuru sitelerinden veri çekme işlemleri
 * @param {string} url - İşlenecek URL
 */
function handleExchangeRateSite(url) {
  try {
    // URL kontrolü için daha güvenli bir yöntem
    const urlPatterns = {
      'amerikan-dolari': 'usd',
      'serbest-piyasa/euro': 'eur',
      'pariteler/eur-usd': 'eurusd',
      'cin-yuani': 'cny'
    };

    const currency = Object.entries(urlPatterns).find(([pattern]) => 
      url.includes(pattern)
    )?.[1];

    if (!currency) {
      console.warn('Unsupported currency site:', url);
      return;
    }

      let rateElement;
      if (currency === 'eurusd') {
        rateElement = document.querySelector('.currency-card .flex.justify-between.mt-8 .text-xl.font-semibold.text-white');
      } else if (currency === 'cny') {
        rateElement = document.querySelector('body > div.wrapper > div.kur-page > div.article-content > div.currency-card.relative.bg-blue-gray-9.rounded-md.p-16.mt-16 > div > div:nth-child(1) > div.text-xl.font-semibold.text-white');
      } else {
        rateElement = document.querySelector('.currency-card .text-xl.font-semibold.text-white');
      }
      
      if (rateElement) {
        const rateText = rateElement.textContent.trim();
        const exchangeRate = parseFloat(rateText.replace(',', '.'));
      
      if (!isNaN(exchangeRate) && exchangeRate > 0) {
        chrome.runtime.sendMessage({ 
          type: currency,
          rate: exchangeRate 
        });
        console.info(`Exchange rate sent: ${currency} = ${exchangeRate}`);
      } else {
        console.warn(`Invalid exchange rate value: ${rateText}`);
      }
    } else {
      console.warn(`Element for ${currency} exchange rate not found`);
    }
  } catch (error) {
    console.error('Error handling exchange rate site:', error);
  }
}

/**
 * E-ticaret siteleri için gerekli dinleyicileri kurma
 */
function setupSiteListeners() {
  try {
    // Gerekli fonksiyonların varlığını kontrol et
    const setupFunctions = [
      'setupPriceObserver',
      'setupPageLoadListeners',
      'setupKeyboardListener',
      'setupMessageListener'
    ];
    
    const missingFunctions = setupFunctions.filter(func => typeof window[func] !== 'function');
    
    if (missingFunctions.length > 0) {
      console.error(`Missing setup functions: ${missingFunctions.join(', ')}`);
      return;
    }
    
    // DomainHandler'ın tanımlı olup olmadığını kontrol et
    if (typeof DomainHandler === 'undefined') {
      console.error('DomainHandler is not defined');
      return;
    }
    
    // Geçerli bir domain konfigürasyonu olup olmadığını kontrol et
    const domainConfig = DomainHandler.getCurrentConfig();
    if (!domainConfig) {
      console.warn('No configuration found for current domain');
      return;
    }

    console.info(`Setting up listeners for domain: ${domainConfig.name}`);
    
    // E-ticaret sitelerinde MutationObserver kurulumu
    const observer = window.setupPriceObserver();
    if (!observer) {
      console.warn('Failed to setup price observer');
    }
    
    // Sayfa yükleme olay dinleyicileri kurulumu
    window.setupPageLoadListeners();
    
    // Klavye kısayolları için dinleyici kurulumu
    window.setupKeyboardListener();
    
    // Mesaj dinleyicisi kurulumu
    window.setupMessageListener();
    
    console.info('All listeners setup completed');
  } catch (error) {
    console.error('Error setting up site listeners:', error);
  }
}

// NOT: convertPrice fonksiyonu ve checkAndConvertPrices fonksiyonu artık utils/currency.js ve utils/priceDisplay.js dosyalarında tanımlandığı için burada kaldırıldı

