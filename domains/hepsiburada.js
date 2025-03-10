const hepsiburadaConfig = {
  name: 'Hepsiburada',
  priceSelectors: [
    '#container > div > main > div > div > div:nth-child(2) > section.X7UOpIDPCas7K8jG8_5Y > div.EVw3R49mJ4tM_lgmN7E_ > div.foQSHpIYwZWy8nHeqapl.QfKHfu57dLi9hPNDl1UL > div > div.IMDzXKdZKh810YOI6k5Q > div.z7kokklsVwh0K5zFWjIO > span',
    'div > div:nth-child(1) > div.smcxph4R3Ehm9tRyNPen > div > div',
    "#container > div > main > div > div > div:nth-child(2) > section.X7UOpIDPCas7K8jG8_5Y > div.EVw3R49mJ4tM_lgmN7E_ > div.foQSHpIYwZWy8nHeqapl.QfKHfu57dLi9hPNDl1UL > div > div > div.IMDzXKdZKh810YOI6k5Q > div.z7kokklsVwh0K5zFWjIO > span",
    '#container > div > main > div > div > div:nth-child(2) > section.X7UOpIDPCas7K8jG8_5Y > div.EVw3R49mJ4tM_lgmN7E_ > div.foQSHpIYwZWy8nHeqapl.QfKHfu57dLi9hPNDl1UL > div.Wzmo_7GC39Nf0y3BWB1C > div.bWwoI8vknB6COlRVbpRj'
  ],
  styles: {
    '.z7kokklsVwh0K5zFWjIO': {
      position: 'relative',
      minHeight: '60px'
    }
  },
  priceExtractor: (element) => {
    let price = element.textContent.trim();
    price = price
      .replace('TL', '')
      .replace('₺', '')
      .replace('.', '')
      .replace(',', '.')
      .trim();
    return parseFloat(price);
  }
};

// Hepsiburada için özel işlemci
const hepsiburadaProcessor = {
  // Fiyatları işleme fonksiyonu
  processPrices: function(domainConfig, settings) {
    const priceSelectors = domainConfig.priceSelectors;
    
    if (!Array.isArray(priceSelectors) || priceSelectors.length === 0) {
      console.warn('Invalid price selectors configuration for Hepsiburada');
      return;
    }

    priceSelectors.forEach(selector => {
      try {
        const priceElements = document.querySelectorAll(selector);
        
        priceElements.forEach(priceElement => {
          if (!priceElement || !priceElement.isConnected) return;
          
          // Zaten dönüştürülmüşse atla
          if (priceElement.hasAttribute('data-converted')) {
            return;
          }

          // Stil uygula
          if (domainConfig.styles && domainConfig.styles[selector]) {
            Object.assign(priceElement.style, domainConfig.styles[selector]);
          }

          // Fiyatı çıkar
          const originalPrice = domainConfig.priceExtractor(priceElement);
          if (!originalPrice || isNaN(originalPrice) || originalPrice <= 0) return;

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

          // Dönüştürücü al ve fiyat dönüşümü
          const converter = DomainHandler.getPriceConverter();
          const conversionResult = converter.convert(originalPrice, config, settings);
          const { convertedPrice, currencySymbol, workingPrice, baseCurrency } = conversionResult;

          // KDV durumu
          const kdvStatus = window.getKdvStatusText(config.kdvAction);

          // Temel HTML
          let html = window.createBasicPriceHTML(
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
            
          html += window.createFinanceAndRmaHTML(
            convertedPrice, 
            config, 
            currencySymbol, 
            kdvStatus, 
            isEuroBasedSite, 
            percentageOperation
          );

          // Hepsiburada için özel etiket oluştur
          const priceInfoElement = document.createElement('hb-price-info');
          priceInfoElement.className = 'price-conversion-container';
          priceInfoElement.style.cssText = `
            display: inline-block !important;
            margin-left: 10px;
            padding: 8px;
            border-radius: 8px;
            background: rgba(2, 21, 61, 0.05);
            font-size: 0.9em;
            color: #484848;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.4;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: relative !important;
            z-index: 999999 !important;
            visibility: visible !important;
            opacity: 1 !important;
          `;
          priceInfoElement.innerHTML = html;
          
          // Hepsiburada için özel yerleştirme
          const priceWrapper = priceElement.parentElement;
          if (priceWrapper) {
            priceWrapper.style.cssText = `
              display: flex !important;
              align-items: center !important;
              flex-wrap: wrap !important;
              gap: 10px !important;
              position: relative !important;
              z-index: 99999 !important;
            `;
            priceWrapper.insertBefore(priceInfoElement, priceElement.nextSibling);
          }

          // Dönüştürüldü işaretle
          window.markAsConverted(priceElement);
        });
      } catch (error) {
        console.error('Hepsiburada price conversion error:', error.message);
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    hepsiburadaConfig,
    hepsiburadaProcessor
  };
} else {
  window.hepsiburadaConfig = hepsiburadaConfig;
  window.hepsiburadaProcessor = hepsiburadaProcessor;
} 