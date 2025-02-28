// MutationObserver ayarları ve fiyat izleme fonksiyonları

// E-ticaret sitelerinde fiyat değişikliklerini izlemek için MutationObserver kurulumu
function setupPriceObserver() {
  // DomainHandler'ın tanımlı olup olmadığını kontrol et
  if (typeof DomainHandler === 'undefined') {
    console.error('DomainHandler is not defined');
    return null;
  }

  const domainConfig = DomainHandler.getCurrentConfig();
  if (!domainConfig) {
    console.warn('Domain configuration not found');
    return null;
  }

  // priceSelectors'un varlığını kontrol et
  if (!domainConfig.priceSelectors || !Array.isArray(domainConfig.priceSelectors)) {
    console.warn('Price selectors not found or invalid');
    return null;
  }

  const observerConfig = {
    childList: true,
    subtree: true
  };

  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {  // ELEMENT_NODE
            domainConfig.priceSelectors.forEach(selector => {
              try {
                if (
                  (node.matches && node.matches(selector)) || 
                  (node.querySelector && node.querySelector(selector))
                ) {
                  shouldUpdate = true;
                }
              } catch (error) {
                console.error(`Error matching selector "${selector}":`, error);
              }
            });
          }
        });
      }
    });

    if (shouldUpdate && typeof window.checkAndConvertPrices === 'function') {
      window.checkAndConvertPrices();
    }
  });

  try {
    observer.observe(document.body, observerConfig);
    return observer;
  } catch (error) {
    console.error('Error setting up MutationObserver:', error);
    return null;
  }
}

// Sayfa yükleme olayları için dinleyicileri kurma
function setupPageLoadListeners() {
  try {
    // İlk yükleme için daha güvenli yaklaşım
    if (document.readyState === 'complete') {
      initializeConversions();
    } else {
      window.addEventListener('load', initializeConversions);
    }
    
    // DOMContentLoaded için de kontrol edelim
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeConversions);
    }
  } catch (error) {
    console.error('Error setting up page load listeners:', error);
  }
}

// Sayfa tam olarak yüklendiğinde fiyat dönüşümlerini başlatan fonksiyon
function initializeConversions() {
  try {
    // Sayfanın yüklenmesi için biraz bekle (akakce.com gibi dinamik siteler için)
    setTimeout(() => {
      // checkAndConvertPrices fonksiyonunun tanımlı olup olmadığını kontrol et
      if (typeof window.checkAndConvertPrices !== 'function') {
        console.error('checkAndConvertPrices function is not defined');
        return;
      }

      // DomainHandler'ın tanımlı olup olmadığını kontrol et
      if (typeof DomainHandler === 'undefined') {
        console.error('DomainHandler is not defined');
        return;
      }

      // İlk olarak gerekli ayarları yükle ve sonra dönüşümleri başlat
      chrome.storage.local.get([
        'usd', 
        'eur', 
        'cny', 
        'eurusd',
        'selectedCurrency'
      ], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading storage data:', chrome.runtime.lastError);
          return;
        }
        
        if (result.selectedCurrency) {
          window.checkAndConvertPrices();
        } else {
          // Eğer döviz birimi seçilmemişse varsayılan olarak 'usd' ile başlat
          chrome.storage.local.set({ selectedCurrency: 'usd' }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error saving default currency:', chrome.runtime.lastError);
              return;
            }
            window.checkAndConvertPrices();
          });
        }
      });
    }, 1000);
  } catch (error) {
    console.error('Error in initializeConversions:', error);
  }
}

// Klavye kısayolları için dinleyici kurma
function setupKeyboardListener() {
  try {
    document.addEventListener('keydown', function(event) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
        if (typeof window.checkAndConvertPrices === 'function') {
          window.checkAndConvertPrices();
        } else {
          console.warn('checkAndConvertPrices function is not available');
        }
      }
    });
  } catch (error) {
    console.error('Error setting up keyboard listener:', error);
  }
}

// Mesaj dinleyicisi kurma
function setupMessageListener() {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Dönüşüm güncelleme ve seçici yenileme işlemleri
      if (request.action === "updateConversions" || request.action === "refreshSelectors") {
        try {
          console.log(`Received ${request.action} request`);
          
          // Özel olarak kaydedilen seçici varsa kontrol et
          if (request.action === "refreshSelectors") {
            // Mevcut domain için kaydedilmiş XPath/Selector'ları kontrol et
            const currentDomain = window.location.hostname;
            
            chrome.storage.local.get(['savedDomains'], (result) => {
              if (chrome.runtime.lastError) {
                console.error('Error getting storage data:', chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Storage error' });
                return;
              }
              
              const savedDomains = result.savedDomains || [];
              const domainData = savedDomains.find(domain => domain.hostname === currentDomain);
              
              if (domainData && domainData.xpath) {
                console.log(`Applying saved selector for domain ${currentDomain}: ${domainData.xpath}`);
                
                // Kaydedilmiş XPath veya selector'ı kullan
                try {
                  // Domain için konfigürasyon oluştur
                  if (typeof DomainHandler !== 'undefined') {
                    const config = {
                      name: "UserDefined", // Özel işleme için isim
                      priceSelectors: [domainData.xpath],
                      useXPath: domainData.xpath.startsWith('/') || domainData.selectorType === 'xpath',
                      type: domainData.type || 'tl', // varsayılan olarak tl
                      isUserDefined: true // Özel seçici olduğunu belirt
                    };
                    
                    // Eğer DomainHandler varsa, konfigurasyon ekleyelim
                    try {
                      if (typeof DomainHandler.addCustomConfig === 'function') {
                        DomainHandler.addCustomConfig(config);
                        console.log('Custom config added for domain', config);
                        
                        // Mevcut dönüşümleri temizleyelim ki yeni seçicileri temiz bir şekilde uygulayabilelim
                        if (typeof window.clearExistingConversions === 'function') {
                          window.clearExistingConversions();
                        }
                      }
                    } catch (configError) {
                      console.warn('Error adding custom config:', configError);
                    }
                  } else {
                    console.warn('DomainHandler is undefined, cannot apply saved selector');
                  }
                } catch (error) {
                  console.error('Error applying saved selector:', error);
                }
              } else {
                console.log(`No saved selector found for domain ${currentDomain}`);
              }
              
              // Fiyat dönüştürücüyü çalıştır
              if (typeof window.checkAndConvertPrices === 'function') {
                setTimeout(() => {
                  window.checkAndConvertPrices();
                  console.log('Price conversions refreshed successfully');
                  sendResponse({ success: true, message: 'Seçiciler ve dönüşümler başarıyla yenilendi' });
                }, 300); // Biraz bekle, DomainHandler'ın güncellemesine izin ver
              } else {
                console.warn('checkAndConvertPrices function is not available');
                sendResponse({ success: false, error: 'Conversion function not available' });
              }
            });
            
            // Asenkron yanıt için true döndür
            return true;
          } else {
            // Normal dönüşüm güncelleme
            if (typeof window.checkAndConvertPrices === 'function') {
              window.checkAndConvertPrices();
            } else {
              console.warn('checkAndConvertPrices function is not available for message actions');
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
          sendResponse({ success: false, error: error.message });
        }
      }
      
      // XPath Finder ile ilgili mesajları yanıtla - content.js'in XPath Finder durumunu bilmesi gerektiğinde
      else if (request.action === "checkXPathFinderStatus") {
        // Bu content script XPath Finder olaylarını takip etmez, sadece durumu bildirir
        sendResponse({ 
          isContentScript: true, 
          hasXPathFinder: false,
          message: "Bu content script XPath Finder değil" 
        });
      }
      
      // Asenkron yanıt için true döndür
      return true;
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
  }
}

// Export
window.setupPriceObserver = setupPriceObserver;
window.setupPageLoadListeners = setupPageLoadListeners;
window.initializeConversions = initializeConversions;
window.setupKeyboardListener = setupKeyboardListener;
window.setupMessageListener = setupMessageListener; 