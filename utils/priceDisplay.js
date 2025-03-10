// Fiyat görüntüleme ve HTML oluşturma yardımcı fonksiyonları

// Temel fiyat dönüşüm HTML'ini oluşturma
function createBasicPriceHTML(originalPrice, convertedPrice, currencySymbol, workingPrice, baseCurrency, config, kdvStatus) {
  try {
    let html = `
      <div style="margin-bottom: 5px; color: #333;">
        <strong>${originalPrice.toFixed(2)} ${baseCurrency}</strong>
      </div>
    `;

    // İndirim gösterimi
    if (config && config.extraCost && config.discountAmount) {
      const isEuroBased = typeof DomainHandler !== 'undefined' && typeof DomainHandler.isEuroBased === 'function' ? 
        DomainHandler.isEuroBased() : false;
      
      const displayPrice = isEuroBased ? 
        workingPrice : 
        (config.kdvAction === 'remove' ? workingPrice * 1.20 : workingPrice);
      
      html += `
        <div style="color: #0066cc; margin-bottom: 3px;">
          İndirimli: ${displayPrice.toFixed(2)} ${baseCurrency} (-${config.discountAmount})
        </div>
      `;
    }

    // Döviz çevrimi gösterimi
    html += `
      <div style="color: #dc3545; margin-bottom: 3px;">
        ${currencySymbol}${convertedPrice.toFixed(2)}${kdvStatus}
      </div>
    `;

    return html;
  } catch (error) {
    console.error('Error creating basic price HTML:', error);
    return `<div>Fiyat gösterimi oluşturulurken hata oluştu</div>`;
  }
}

// Dönüştürme kutusu temizleme
function clearExistingConversions() {
  try {
    // Performans için önbelleğe alma (daha kapsamlı temizleme)
    const existingConversions = document.querySelectorAll('.price-conversion-container, .price-conversion-wrapper, hb-price-info');
    existingConversions.forEach(div => {
      try {
        div.remove();
      } catch (e) {
        console.warn('Error removing conversion element:', e);
      }
    });
    
    document.querySelectorAll('[data-converted]').forEach(element => {
      try {
        element.removeAttribute('data-converted');
      } catch (e) {
        console.warn('Error removing data-converted attribute:', e);
      }
    });

    // Akakce.com için tüm wrapper'ları temizle
    if (window.location.hostname.includes('akakce.com')) {
      document.querySelectorAll('.conversion-wrapper-akakce').forEach(el => {
        try {
          el.remove();
        } catch (e) {
          console.warn('Error removing akakce wrapper:', e);
        }
      });
    }
  } catch (error) {
    console.error('Error clearing existing conversions:', error);
  }
}

// KDV durumu metnini oluşturma
function getKdvStatusText(kdvAction) {
  let kdvStatus = '';
  if (kdvAction === 'remove') {
    kdvStatus = ' (KDV Hariç)';
  } else if (kdvAction === 'add') {
    kdvStatus = ' (KDV Dahil)';
  }
  return kdvStatus;
}

// Dönüştürme yapıldığına dair işaretleme
function markAsConverted(element) {
  try {
    if (element && !element.hasAttribute('data-converted')) {
      element.setAttribute('data-converted', 'true');
    }
  } catch (error) {
    console.error('Error marking element as converted:', error);
  }
}

// Sayfadaki fiyatları kontrol et ve dönüştür
function checkAndConvertPrices() {
  try {
    // Önce mevcut dönüşümleri temizle
    clearExistingConversions();

    // DomainHandler'ın tanımlı olup olmadığını kontrol et
    if (typeof DomainHandler === 'undefined') {
      console.error('DomainHandler is not defined');
      return;
    }

    const domainConfig = DomainHandler.getCurrentConfig();
    if (!domainConfig) {
      console.warn('Domain configuration not found');
      return;
    }

    // Gerekli verileri tek seferde al
    chrome.storage.local.get([
      'usd', 
      'eur', 
      'cny', 
      'eurusd',
      'selectedCurrency', 
      'financeCost', 
      'shippingCost', 
      'extraCost', 
      'kdvAction',
      'discountAmount',
      'euroPercentageOperation',  
      'tlPercentageOperation',
      'salesCost',
      'salesCostEnabled'
    ], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error getting storage data:', chrome.runtime.lastError);
        return;
      }
      
      if (!result || !result.selectedCurrency) {
        console.warn('Required currency data not found');
        return;
      }

      // Gerekli döviz kurları mevcut mu kontrol et
      const requiredRates = ['usd', 'eur', 'cny'];
      const missingRates = requiredRates.filter(rate => !result[rate]);
      if (missingRates.length > 0) {
        console.warn(`Missing exchange rates: ${missingRates.join(', ')}`);
      }
      
      // Percentage operation değerini belirle - her iki site tipi için aynı değeri kullan
      // Eğer euroPercentageOperation veya tlPercentageOperation varsa, ikisinden birini kullan
      // İkisi de yoksa, varsayılan olarak false kullan
      const percentageOperation = result.euroPercentageOperation !== undefined ? 
        result.euroPercentageOperation : 
        (result.tlPercentageOperation !== undefined ? result.tlPercentageOperation : false);
      
      // Sonuç nesnesine percentageOperation değerini ekle
      result.percentageOperation = percentageOperation;

      // Domain bazlı işlemciye yönlendir
      const domainProcessor = getDomainProcessor(domainConfig.name);
      if (domainProcessor && typeof domainProcessor.processPrices === 'function') {
        try {
          domainProcessor.processPrices(domainConfig, result);
        } catch (error) {
          console.error(`Error in domain processor for ${domainConfig.name}:`, error);
          // Hata durumunda genel işleyici kullan
          processGenericSite(domainConfig, result);
        }
      } else {
        // Genel işleme stratejisi
        processGenericSite(domainConfig, result);
      }
    });
  } catch (error) {
    console.error('Error in checkAndConvertPrices:', error);
  }
}

// Genel site işleme stratejisi
function processGenericSite(domainConfig, settings) {
  try {
    if (!domainConfig || !settings) {
      console.error('Invalid domain config or settings');
      return;
    }
    
    const priceSelectors = domainConfig.priceSelectors;
    if (!Array.isArray(priceSelectors) || priceSelectors.length === 0) {
      console.warn('Invalid price selectors configuration');
      return;
    }

    // UserDefined (özel seçici) kontrolü - özel seçici varsa sadece onu işle, yoksa tüm seçicileri işle
    const isUserDefined = domainConfig.name === "UserDefined";
    
    if (isUserDefined) {
      console.log("Kullanıcı tanımlı seçici kullanılıyor:", priceSelectors[0]);
    }

    priceSelectors.forEach(selector => {
      try {
        if (!selector) {
          console.warn('Empty selector found');
          return;
        }
        
        // XPath veya CSS Selector kullanımını kontrol et
        let priceElements;
        // useXPath değerine veya selectorType değerine göre kontrol et
        const isXPath = domainConfig.useXPath === true || 
                      domainConfig.selectorType === 'xpath' || 
                      (typeof domainConfig.useXPath === 'undefined' && selector.startsWith('/'));
        
        if (isXPath) {
          console.log(`Using XPath selector: ${selector}`);
          try {
            const xpathResult = document.evaluate(
              selector,
              document,
              null,
              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
              null
            );
            priceElements = [];
            for (let i = 0; i < xpathResult.snapshotLength; i++) {
              priceElements.push(xpathResult.snapshotItem(i));
            }
            console.log(`XPath elements found: ${priceElements.length}`);
          } catch (xpathError) {
            console.error(`Error evaluating XPath "${selector}":`, xpathError);
            return;
          }
        } else {
          console.log(`Using CSS selector: ${selector}`);
          try {
            priceElements = document.querySelectorAll(selector);
            console.log(`CSS elements found: ${priceElements.length}`);
          } catch (selectorError) {
            console.error(`Error with selector "${selector}":`, selectorError);
            return;
          }
        }
        
        if (!priceElements || priceElements.length === 0) {
          console.log(`No elements found with selector: ${selector}`);
          // Özel seçici için daha kapsamlı bir bilgi mesajı göster
          if (isUserDefined) {
            console.warn(`Kullanıcı tanımlı seçici (${selector}) için hiç eleman bulunamadı. Lütfen seçicinin doğruluğunu kontrol edin.`);
          }
          return; // Bu seçici için hiç eleman bulunamadı, bir sonraki seçiciye geç
        }
        
        priceElements.forEach(priceElement => {
          try {
            if (!priceElement || !priceElement.isConnected) return;
            
            // Exclude seçicileri
            if (domainConfig.excludeSelectors) {
              for (let excludeSelector of domainConfig.excludeSelectors) {
                try {
                  if (priceElement.closest(excludeSelector)) return;
                } catch (excludeError) {
                  console.warn(`Error with exclude selector "${excludeSelector}":`, excludeError);
                }
              }
            }

            // Metinden fiyat çek
            let originalPrice;
            try {
              originalPrice = domainConfig.priceExtractor 
                ? domainConfig.priceExtractor(priceElement)
                : parseFloat(
                    priceElement.textContent
                      .replace('TL', '')
                      .replace('₺', '')
                      .replace('€', '')
                      .replace('$', '')
                      .replace('.', '')
                      .replace(',', '.')
                      .trim()
                  );
            } catch (priceError) {
              console.warn('Error extracting price:', priceError);
              return;
            }

            if (!originalPrice || isNaN(originalPrice) || originalPrice <= 0) {
              if (isUserDefined) {
                console.warn(`Kullanıcı tanımlı seçici (${selector}) ile bulunan elemandan fiyat çıkarılamadı:`, priceElement.textContent);
              }
              return;
            }

            // Görsel öğelere gömülü fiyatı atla
            if (
              priceElement.closest('.imageThumbnail') ||
              priceElement.closest('.image-block-alt-image') ||
              priceElement.closest('.a-button-thumbnail')
            ) {
              return;
            }

            // Zaten dönüştürülmüşse atla
            if (priceElement.hasAttribute('data-converted')) {
              return;
            }

            // DomainConfig'de tanımlı stil
            if (domainConfig.styles && domainConfig.styles[selector]) {
              try {
                Object.assign(priceElement.style, domainConfig.styles[selector]);
              } catch (styleError) {
                console.warn('Error applying styles:', styleError);
              }
            }

            // Config oluştur
            const config = {
              selectedCurrency: settings.selectedCurrency,
              financeCost: settings.financeCost || 0,
              shippingCost: settings.shippingCost || 0,
              extraCost: settings.extraCost || false,
              kdvAction: settings.kdvAction || 'none',
              discountAmount: settings.discountAmount || 0,
              salesCost: settings.salesCost || 10,
              salesCostEnabled: settings.salesCostEnabled === true
            };

            // Doğru dönüştürücüyü al
            const converter = DomainHandler.getPriceConverter();
            if (!converter) {
              console.error('Price converter not found');
              return;
            }
            
            // Fiyat dönüşümü
            let conversionResult;
            try {
              conversionResult = converter.convert(originalPrice, config, settings);
            } catch (conversionError) {
              console.error('Error converting price:', conversionError);
              return;
            }
            
            const { convertedPrice, currencySymbol, workingPrice, baseCurrency } = conversionResult;

            // KDV durumu
            const kdvStatus = getKdvStatusText(config.kdvAction);

            // HTML oluşturma işlemi - htmlRenderer.js ile
            // Temel HTML oluşturma
            let basicHtml = window.createBasicPriceHTML(
              originalPrice, 
              convertedPrice, 
              currencySymbol, 
              workingPrice, 
              baseCurrency, 
              config, 
              kdvStatus
            );

            // Finans ve RMA hesaplamaları
            const isEuroBasedSite = DomainHandler.isEuroBased();
            const percentageOperation = isEuroBasedSite ? 
              settings.euroPercentageOperation : 
              settings.tlPercentageOperation;
              
            const financeHtml = window.createFinanceAndRmaHTML(
              convertedPrice, 
              config, 
              currencySymbol, 
              kdvStatus, 
              isEuroBasedSite, 
              percentageOperation
            );
            
            // Tüm HTML içeriği
            const html = basicHtml + financeHtml;

            // Domain bazlı HTML oluşturucu seçimi
            const htmlRenderer = window.getDomainHtmlRenderer(domainConfig.name);
            
            const priceData = {
              html,
              originalPrice,
              convertedPrice,
              currencySymbol,
              workingPrice,
              baseCurrency,
              config,
              kdvStatus,
              percentageOperation,
              isEuroBasedSite
            };
            
            // Kullanıcı tanımlı veya normal domain işleyici seçimi
            const renderedHtml = isUserDefined ? window.createGenericHTML(priceData) : htmlRenderer(priceData);
            if (renderedHtml && typeof renderedHtml.applyToWrapper === 'function') {
              renderedHtml.applyToWrapper(priceElement);
            }

            // Dönüştürüldü işareti
            markAsConverted(priceElement);
          } catch (elementError) {
            console.error('Error processing price element:', elementError);
          }
        });
      } catch (selectorError) {
        console.error('Price conversion error for selector:', selectorError);
      }
    });
  } catch (error) {
    console.error('Error in processGenericSite:', error);
  }
}

// Domain işlemcisini getir
function getDomainProcessor(domainName) {
  if (!domainName) return null;
  
  const processors = {
    'Hepsiburada': window.hepsiburadaProcessor,
    'Trendyol': window.trendyolProcessor,
    'Akakce': window.akakceProcessor,
    'Kosatec': window.kosatecProcessor,
    'Imcopex': window.imcopexProcessor,
    'Siewert-Kau': window.siewertKauProcessor,
    'Amazon': window.amazonProcessor
  };
  
  return processors[domainName] || null;
}

// Export
window.createBasicPriceHTML = createBasicPriceHTML;
window.clearExistingConversions = clearExistingConversions;
window.getKdvStatusText = getKdvStatusText;
window.markAsConverted = markAsConverted;
window.checkAndConvertPrices = checkAndConvertPrices;
window.processGenericSite = processGenericSite;
window.getDomainProcessor = getDomainProcessor;