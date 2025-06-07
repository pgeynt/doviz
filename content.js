/**
 * Content Script - Döviz Kuru ve Fiyat Dönüştürme Eklentisi
 * 
 * Bu dosya, döviz kuru sitelerinden veri çekme ve e-ticaret sitelerinde
 * fiyat dönüştürme işlemlerini yönetir. Utilities klasöründeki dosyaları
 * kullanarak daha modüler bir yapı sağlar.
 */

// Fiyat analiz container'ı oluştur (Sadece kullanıcı tarafından eklenen siteler için)
/**
 * Fiyat analiz container'ı oluşturur
 * @param {Object} result - Fiyat dönüşüm sonucu
 * @param {string} currencyType - Para birimi tipi ('euro' veya 'try')
 * @returns {HTMLElement} - Oluşturulan container elementi
 */
function createPriceAnalyzeContainer(result, currencyType) {
  try {
    // Önce varsa eski container'ı kaldır
    const existingContainer = document.querySelector('.user-price-analyze-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Eklenti durumunu kontrol et
    chrome.storage.local.get(['extensionEnabled'], function(data) {
      const isExtensionEnabled = data.extensionEnabled !== undefined ? data.extensionEnabled : true;
      
      // Eğer eklenti devre dışıysa, container oluşturma
      if (!isExtensionEnabled) {
        console.log('Eklenti devre dışı, analiz kutusu oluşturulmayacak');
        return;
      }
      
      // Container oluştur
      const container = createContainerElement();
      
      // Doküman'a ekle
      document.body.appendChild(container);
      console.log(`Price analyze container created for ${currencyType} based site with costMethod: ${result.config ? result.config.costMethod : 'undefined'}`);
    });
    
    // Container element oluşturma fonksiyonu
    function createContainerElement() {
      // Dönüşüm sonuçlarından gerekli verileri çıkar
      const { 
        convertedPrice, 
        currencySymbol, 
        workingPrice, 
        baseCurrency, 
        config,
        kdvStatus,
        percentageOperation
      } = result;

      // Container oluştur
      const container = document.createElement('div');
      container.className = 'user-price-analyze-container';
      container.style.cssText = `
        position: fixed;
        right: 20px;
        top: 20px;
        width: 300px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        padding: 15px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
        font-size: 14px;
        color: #333;
        border: 1px solid ${currencyType === 'euro' ? '#0066cc' : '#dc3545'};
        pointer-events: auto;
        position: relative;
      `;

      // Kapatma butonu
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #777;
        padding: 0;
        margin: 0;
        z-index: 1000;
      `;
      closeBtn.onclick = (e) => {
        e.stopPropagation(); // Tıklamanın balonlanmasını engelle
        container.remove();
      };
      
      // Küçültme butonu ekle
      const minimizeBtn = document.createElement('button');
      minimizeBtn.textContent = '−';
      minimizeBtn.style.cssText = `
        position: absolute;
        top: calc(100% - 15px);
        right: 5px;
        background: none;
        border: none;
        font-size: 14px;
        line-height: 14px;
        cursor: pointer;
        color: #777;
        padding: 0;
        z-index: 1000;
      `;
      
      // Konteyner içeriğini tutan div
      const contentDiv = document.createElement('div');
      contentDiv.className = 'analyze-box-content';
      contentDiv.style.cssText = `
        padding-top: 15px;
      `;
      
      // Minimize/maximize durumu
      let isMinimized = false;
      
      // Küçültme/büyütme fonksiyonu
      minimizeBtn.onclick = (e) => {
        e.stopPropagation(); // Tıklamanın balonlanmasını engelle
        if (isMinimized) {
          // Büyült
          contentDiv.style.display = 'block';
          container.style.height = 'auto';
          container.style.padding = '15px';
        } else {
          // Küçült
          contentDiv.style.display = 'none';
          container.style.height = '2px';
          container.style.padding = '0px 15px';
          container.style.cursor = 'pointer';
        }
        isMinimized = !isMinimized;
      };
      
      // Küçültüldüğünde tüm konteyner tıklanabilir olsun
      container.addEventListener('click', (e) => {
        e.stopPropagation(); // Tıklamanın balonlanmasını engelle
        // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
        if (isMinimized && e.target === container) {
          contentDiv.style.display = 'block';
          container.style.height = 'auto';
          container.style.padding = '15px';
          container.style.cursor = 'default';
          isMinimized = false;
        }
      });
      
      container.appendChild(closeBtn);
      container.appendChild(minimizeBtn);

      // Dönüştürülmüş fiyat - daha küçük font boyutu
      const convertedPriceEl = document.createElement('div');
      convertedPriceEl.style.cssText = `
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
        color: ${currencyType === 'euro' ? '#0066cc' : '#dc3545'};
      `;
      convertedPriceEl.textContent = `${currencySymbol}${convertedPrice.toFixed(2)}${kdvStatus || ''}`;
      contentDiv.appendChild(convertedPriceEl);

      // "Yüzdeleri Ekle" değerini al
      const isAdd = percentageOperation === true;
      const operationSymbol = isAdd ? '+' : '-';
      
      // Maliyet hesaplama yöntemini kontrol et - güvenli bir şekilde
      const costMethod = config && typeof config.costMethod === 'string' ? config.costMethod : 'detailed';
      
      console.log(`Maliyet hesaplama yöntemi (createPriceAnalyzeContainer): ${costMethod}`);
      
      // Maliyet hesaplama yöntemine göre içerik göster
      if (costMethod === 'total') {
        // SADECE toplam maliyet görüntüle
        console.log('Toplam Masraf modu seçildi, sadece toplam maliyet gösteriliyor.');
        
        if (config && typeof config.totalCost !== 'undefined') {
          // Toplam maliyet hesaplama
          const totalPercentage = config.totalCost / 100;
          const totalAmount = convertedPrice * totalPercentage;
          const totalDiscounted = isAdd ? 
            convertedPrice + totalAmount : 
            convertedPrice - totalAmount;
          
          const totalEl = document.createElement('div');
          totalEl.style.cssText = `
            margin-bottom: 6px;
            color: #006622;
            font-weight: 600;
            font-size: 13px;
            background-color: #e6f7ee;
            padding: 3px 6px;
            border-radius: 3px;
            border: 1px solid #c9e9d9;
          `;
          totalEl.textContent = `T.M.(${operationSymbol}${config.totalCost}%): ${currencySymbol}${totalDiscounted.toFixed(2)}${kdvStatus || ''}`;
          contentDiv.appendChild(totalEl);
        }
      } 
      else {
        // Detaylı masraf modu - İMF ve SM göster
        console.log('Detaylı Masraf modu seçildi, İMF ve SM gösteriliyor.');
        
        if (config && typeof config.financeCost !== 'undefined') {
          // Finans maliyeti hesaplama
          const financePercentage = config.financeCost / 100;
          const financeAmount = convertedPrice * financePercentage;
          const financeDiscounted = isAdd ? 
            convertedPrice + financeAmount : 
            convertedPrice - financeAmount;
          
          const financeEl = document.createElement('div');
          financeEl.style.cssText = `
            margin-bottom: 6px;
            color: #006622;
            font-size: 13px;
            background-color: #e6f7ee;
            padding: 3px 6px;
            border-radius: 3px;
            border: 1px solid #c9e9d9;
          `;
          financeEl.textContent = `İ.M.F(${operationSymbol}${config.financeCost}%): ${currencySymbol}${financeDiscounted.toFixed(2)}${kdvStatus || ''}`;
          contentDiv.appendChild(financeEl);

          // Satış maliyeti hesaplama (İ.M.F. değerinden sonra)
          if (config.salesCostEnabled === true) {
            const salesCost = config.salesCost !== undefined ? config.salesCost : 10;
            const salesPercentage = salesCost / 100;
            const salesAmount = financeDiscounted * salesPercentage;
            const salesDiscounted = isAdd ? 
              financeDiscounted + salesAmount : 
              financeDiscounted - salesAmount;
            
            const salesEl = document.createElement('div');
            salesEl.style.cssText = `
              margin-bottom: 6px;
              color: #006622;
              font-size: 13px;
              background-color: #e6f7ee;
              padding: 3px 6px;
              border-radius: 3px;
              border: 1px solid #c9e9d9;
            `;
            salesEl.textContent = `S.M.(${operationSymbol}${salesCost}%): ${currencySymbol}${salesDiscounted.toFixed(2)}${kdvStatus || ''}`;
            contentDiv.appendChild(salesEl);
          }

          // RMA/Yol maliyeti (eğer varsa)
          if (config.shippingCost) {
            const shippingEl = document.createElement('div');
            shippingEl.style.cssText = `
              margin-bottom: 6px;
              color: #006622;
              font-size: 13px;
              background-color: #e6f7ee;
              padding: 3px 6px;
              border-radius: 3px;
              border: 1px solid #c9e9d9;
            `;
            
            const shippingCost = parseFloat(config.shippingCost);
            const finalPriceWithShipping = isAdd ? 
              (financeDiscounted + shippingCost) : 
              (financeDiscounted - shippingCost);
            
            shippingEl.textContent = `Yol/R.M.A(${operationSymbol}${shippingCost}): ${currencySymbol}${finalPriceWithShipping.toFixed(2)}${kdvStatus || ''}`;
            contentDiv.appendChild(shippingEl);
          }
        }
      }
      
      // İçerik div'ini container'a ekle
      container.appendChild(contentDiv);
      
      // Animasyon için CSS geçiş efekti ekle
      container.style.transition = 'all 0.3s ease-in-out';
      
      return container;
    }
  } catch (error) {
    console.error('Error creating price analyze container:', error);
  }
}

(() => {
  try {
    // Önce eklentinin etkin olup olmadığını kontrol et
    chrome.storage.local.get(['extensionEnabled'], function(result) {
      // Varsayılan olarak eklenti etkin olmalı (undefined ise etkindir)
      const isEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
      
      console.log(`Eklenti durumu: ${isEnabled ? 'Etkin' : 'Devre dışı'}`);
      
      // Sayfada zaten var olan analiz kutularını duruma göre güncelle
      updateExistingContainers(isEnabled);
      
      // Eğer eklenti devre dışıysa, işlemleri yapma
      if (!isEnabled) {
        console.log('Eklenti devre dışı, işlemler yapılmayacak');
        return;
      }
      
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
    });
  } catch (error) {
    console.error('Error in main function:', error);
  }
})();

/**
 * Sayfada bulunan mevcut analiz kutularını eklenti durumuna göre günceller
 * @param {boolean} isEnabled - Eklenti durumu
 */
function updateExistingContainers(isEnabled) {
  const containers = document.querySelectorAll('.user-price-analyze-container');
  if (containers.length > 0) {
    console.log(`${containers.length} mevcut analiz kutusu bulundu, duruma göre güncelleniyor`);
    containers.forEach(container => {
      container.style.display = isEnabled ? 'block' : 'none';
    });
  }
}

/**
 * Mevcut domain için kaydedilmiş XPath/Selector'ları kontrol eder ve uygular
 */
function checkAndApplySavedSelectors() {
  try {
    // Önce eklenti durumunu kontrol et
    chrome.storage.local.get(['extensionEnabled'], function(result) {
      const isEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;
      
      // Eklenti devre dışıysa işlem yapma
      if (!isEnabled) {
        console.log('Eklenti devre dışı, seçiciler uygulanmayacak');
        return;
      }
      
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
    });
  } catch (error) {
    console.error('Error in checkAndApplySavedSelectors:', error);
  }
}

/**
 * Kullanıcı tarafından tanımlanan seçici için özel fiyat dönüşümü işleme
 * @param {Object} domainData - Domain bilgileri
 */
function applyUserSelector(domainData) {
  try {
    if (!domainData || !domainData.xpath) {
      console.error('Invalid domain data or missing selector');
      return;
    }
    
    const { xpath, selectorType, type } = domainData;
    const currencyType = type || 'tl'; // Varsayılan olarak TL
    
    console.log(`Applying user selector: ${xpath} (Type: ${selectorType || 'auto-detected'}, Currency: ${currencyType})`);
    
    // Seçici türünü belirle (XPath veya CSS)
    const isXPath = xpath.startsWith('/') || selectorType === 'xpath';
    
    let foundElements = [];
    
    if (isXPath) {
      try {
        const xpathResult = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          foundElements.push(xpathResult.snapshotItem(i));
        }
        
        console.log(`Found ${foundElements.length} elements with XPath selector`);
      } catch (xpathError) {
        console.error(`XPath evaluation error: ${xpathError.message}`);
        return;
      }
    } else {
      try {
        foundElements = Array.from(document.querySelectorAll(xpath));
        console.log(`Found ${foundElements.length} elements with CSS selector`);
      } catch (cssError) {
        console.error(`CSS selector error: ${cssError.message}`);
        return;
      }
    }
    
    if (foundElements.length === 0) {
      console.warn(`No elements found with the selector: ${xpath}`);
      return;
    }
    
    // Her bulunan element için fiyat işleme
    foundElements.forEach(element => {
      if (!element || !element.textContent) return;
      
      const priceText = element.textContent.trim();
      console.log(`Processing price text: "${priceText}"`);
      
      // Fiyatı çıkarma ve dönüştürme işlemi
      let parsedPrice;
      
      // Euro bazlı veya TL bazlı olmasına göre farklı fiyat çıkarma
      if (currencyType === 'euro') {
        // Euro bazlı fiyat çıkarma
        const euroPrice = priceText
          .replace('€', '')
          .replace('EUR', '')
          .replace('*', '')
          .trim();
        
        if (euroPrice.includes('.') && euroPrice.includes(',')) {
          // Avrupa formatı: 1.234,56
          parsedPrice = parseFloat(euroPrice.replace('.', '').replace(',', '.'));
        } else if (euroPrice.includes(',')) {
          // Avrupa ondalık: 1234,56
          parsedPrice = parseFloat(euroPrice.replace(',', '.'));
        } else {
          // Standart format
          parsedPrice = parseFloat(euroPrice);
        }
      } else {
        // TL bazlı fiyat çıkarma
        const tlPrice = priceText
          .replace('TL', '')
          .replace('₺', '')
          .trim();
        
        // 9.900 TL gibi binlik ayırıcıyı nokta olan büyük sayıları doğru tanıma
        if (tlPrice.includes('.') && !tlPrice.includes(',')) {
          // Noktanın konumunu kontrol et - binlik ayırıcı mı ondalık ayırıcı mı?
          const parts = tlPrice.split('.');
          if (parts[parts.length - 1].length !== 2) {
            // Bin ayırıcı nokta, ondalık yok (9.900)
            parsedPrice = parseFloat(tlPrice.replace(/\./g, ''));
          } else {
            // Ondalık nokta (9.90)
            parsedPrice = parseFloat(tlPrice);
          }
        } else if (tlPrice.includes('.') && tlPrice.includes(',')) {
          // Hem nokta hem virgül var: 1.234,56
          parsedPrice = parseFloat(tlPrice.replace(/\./g, '').replace(',', '.'));
        } else if (tlPrice.includes(',')) {
          // Sadece virgül var: 1234,56
          parsedPrice = parseFloat(tlPrice.replace(',', '.'));
        } else {
          // Ne nokta ne virgül var: 1234
          parsedPrice = parseFloat(tlPrice);
        }
      }
      
      console.log(`Extracted price: ${parsedPrice}`);
      
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        console.warn(`Invalid price extracted from: "${priceText}"`);
        return;
      }
      
      // Fiyat dönüşümünü yap
      processPriceConversion(element, parsedPrice, currencyType, window.location.hostname);
    });
  } catch (error) {
    console.error('Error in applyUserSelector:', error);
  }
}

/**
 * Fiyat dönüşümü işlemi
 * @param {HTMLElement} element - Fiyat elementi
 * @param {number} parsedPrice - Çıkarılan fiyat
 * @param {string} type - Para birimi tipi ('euro' veya 'try')
 * @param {string} hostname - Site hostname
 */
function processPriceConversion(element, parsedPrice, type, hostname) {
  try {
    // İhtiyaç duyulan verileri storage'dan al
  chrome.storage.local.get([
      'usd', 'eur', 'cny', 'eurusd',
      'selectedCurrency', 'financeCost', 'shippingCost',
      'extraCost', 'kdvAction', 'discountAmount',
      'euroPercentageOperation', 'tlPercentageOperation',
      'salesCost', 'salesCostEnabled', 'totalCost', 'costMethod',
      'domainSettings'
    ], (settings) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting storage data:', chrome.runtime.lastError);
        return;
      }
      
      // Gerekli döviz kurları mevcut mu kontrol et
      if (!settings.usd || !settings.eur) {
        console.error('Required exchange rates are missing');
        return;
      }
      
      // Domain bazlı ayarları al
      const domainData = (settings.domainSettings && settings.domainSettings[hostname]) || {};
      const merged = { ...settings, ...domainData };

      // Dönüşüm yapılandırması - costMethod değerini de doğru şekilde kontrol et
      const config = {
        selectedCurrency: merged.selectedCurrency || 'usd',
        financeCost: merged.financeCost || 0,
        shippingCost: merged.shippingCost || 0,
        extraCost: merged.extraCost || false,
        kdvAction: merged.kdvAction || 'none',
        discountAmount: merged.discountAmount || 0,
        salesCost: merged.salesCost || 10,
        salesCostEnabled: merged.salesCostEnabled || false,
        totalCost: merged.totalCost || 15,
        costMethod: typeof merged.costMethod === 'string' ? merged.costMethod : 'detailed' // Varsayılan olarak 'detailed' kullan
      };
      
      console.log("Güncel maliyet hesaplama yöntemi (processPriceConversion):", config.costMethod);
      
      // Para birimi tipine göre doğru dönüştürücüyü seç
      const currencyConverter = type === 'euro' ? window.EuroBasedConverter : window.TryBasedConverter;
      
      if (!currencyConverter) {
        console.error(`No converter found for currency type: ${type}`);
        return;
      }
      
      // Fiyat dönüşümünü gerçekleştir
      const conversionResult = currencyConverter.convert(parsedPrice, config, settings);
      
      // Dönüşüm sonucunu güncelle - costMethod değerini ve totalCost değerini de config'de taşı
      conversionResult.config = conversionResult.config || {};
      conversionResult.config.costMethod = config.costMethod;
      conversionResult.config.totalCost = config.totalCost;
      
      console.log('Conversion result:', conversionResult);
      
      // Fiyat analiz container'ını oluştur
      createPriceAnalyzeContainer(conversionResult, type);
    });
  } catch (error) {
    console.error('Error in processPriceConversion:', error);
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

// Mesaj dinleyicisi kurma
function setupMessageListeners() {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📩 Content script mesaj aldı:', message);
      
      try {
        // Eklenti durumunu değiştirme mesajı
        if (message.action === 'toggleExtension') {
          console.log(`🔌 Eklenti durumu değişiyor: ${message.enabled ? 'Etkin' : 'Devre dışı'}`);
          
          // Eklenti durumunu storage'a kaydet
          chrome.storage.local.set({ extensionEnabled: message.enabled }, () => {
            console.log('✅ Eklenti durumu kaydedildi:', message.enabled);
            
            // Analiz konteynerlerini göster/gizle
            const analyzeContainers = document.querySelectorAll('.user-price-analyze-container');
            analyzeContainers.forEach(container => {
              if (message.enabled) {
                container.style.display = 'block';
              } else {
                // Kademeli olarak kaldır
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                  container.style.display = 'none';
                }, 300);
              }
            });
            
            // Mevcut dönüşümleri temizle
            if (!message.enabled && typeof window.clearExistingConversions === 'function') {
              window.clearExistingConversions();
              console.log('🧹 Mevcut dönüşüm kutuları temizlendi');
            } else if (message.enabled) {
              // Eklenti etkinleştirildiğinde seçicileri yeniden uygula
              // Önce mevcut dönüşümleri temizleyelim, temiz başlayalım
              if (typeof window.clearExistingConversions === 'function') {
                window.clearExistingConversions();
              }
              
              // Biraz gecikme ekleyerek DOM'un güncellenmesine izin verelim
              setTimeout(() => {
                checkAndApplySavedSelectors();
                console.log('🔄 Seçiciler yeniden uygulandı');
              }, 500);
            }
            
            sendResponse({ success: true, message: `Eklenti ${message.enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}` });
          });
          
          return true; // Asenkron yanıt için
        }
        // Seçicileri yenileme mesajı
        else if (message.action === 'refreshSelectors') {
          console.log('🔄 Seçiciler yenileniyor...');
          
          // Mevcut dönüşümleri temizle
          if (typeof window.clearExistingConversions === 'function') {
            window.clearExistingConversions();
            console.log('🧹 Mevcut dönüşüm kutuları temizlendi');
          }
          
          // Seçicileri yeniden uygula
          checkAndApplySavedSelectors();
          
          // Yanıt gönder
          sendResponse({ success: true, message: 'Seçiciler yenilendi' });
        }
        // Dönüşümleri güncelleme mesajı
        else if (message.action === 'updateConversions') {
          console.log('🔄 Dönüşümler güncelleniyor...', message.settings);
          
          // Eğer ayarlar mesajla geldiyse, bunları local storage'a kaydedelim
          if (message.settings) {
            console.log('📦 Gelen ayarlar:', message.settings);
            
            // costMethod değerini doğru olarak ayarla
            if (message.settings.costMethod) {
              console.log(`📊 Maliyet hesaplama yöntemi: ${message.settings.costMethod}`);
            }
            
            // salesCostEnabled değerini doğru formatta boolean olarak kaydedelim
            const settings = { ...message.settings };
            settings.salesCostEnabled = settings.salesCostEnabled === true;
            
            console.log('💾 Kaydedilecek ayarlar:', settings);
            
            // Ayarları storage'a kaydedelim
            chrome.storage.local.set(settings, () => {
              console.log('✅ Ayarlar güncellendi');
            });
          }
          
          // Mevcut dönüşümleri temizle
          if (typeof window.clearExistingConversions === 'function') {
            window.clearExistingConversions();
          }
          
          // Seçicileri yeniden uygula - kısa bir gecikme ile
          setTimeout(() => {
            checkAndApplySavedSelectors();
            console.log('⌛ Seçiciler yeniden uygulandı (gecikme ile)');
          }, 300);
          
          // Yanıt gönder
          sendResponse({ success: true, message: 'Dönüşümler güncellendi' });
        }
        // Dinamik ayarlar güncelleme mesajı
        else if (message.action === 'applyDynamicSettings') {
          console.log('🔄 Dinamik ayarlar uygulanıyor...', message.settings);
          
          // Eğer ayarlar mesajla geldiyse, bunları kullan
          if (message.settings) {
            console.log('📦 Gelen dinamik ayarlar:', message.settings);
            
            // costMethod değerini kontrol et
            if (message.settings.costMethod) {
              console.log(`📊 Dinamik maliyet hesaplama yöntemi: ${message.settings.costMethod}`);
            }
          }
          
          // Mevcut dönüşümleri temizle ve yeniden uygula
          if (typeof window.clearExistingConversions === 'function') {
            window.clearExistingConversions();
          }
          
          // Kullanıcı tanımlı domain ise seçicileri kontrol et
          if (typeof DomainHandler !== 'undefined' && 
              typeof DomainHandler.getCurrentConfig === 'function') {
            const config = DomainHandler.getCurrentConfig();
            if (config && config.isUserDefined) {
              console.log('👤 Kullanıcı tanımlı domain için seçiciler yeniden uygulanıyor');
              // Kısa bir gecikme ekle
              setTimeout(() => {
                checkAndApplySavedSelectors();
              }, 300);
            } else {
              // Standart domain için normal fiyat dönüşümü
              setTimeout(() => {
                if (typeof window.checkAndConvertPrices === 'function') {
                  window.checkAndConvertPrices();
                }
              }, 300);
            }
          } else {
            // Fallback: direkt dönüşüm yap
            setTimeout(() => {
              if (typeof window.checkAndConvertPrices === 'function') {
                window.checkAndConvertPrices();
              }
            }, 300);
          }
          
          // Yanıt gönder
          sendResponse({ success: true, message: 'Dinamik ayarlar uygulandı' });
        }
      } catch (error) {
        console.error('Mesaj işleme hatası:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      return true; // Asenkron cevap için true dön
    });
  } catch (error) {
    console.error('Message listener setup error:', error);
  }
}

// NOT: convertPrice fonksiyonu ve checkAndConvertPrices fonksiyonu artık utils/currency.js ve utils/priceDisplay.js dosyalarında tanımlandığı için burada kaldırıldı

