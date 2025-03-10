// Döviz kuru dönüştürme yardımcı fonksiyonları

// Temel döviz dönüştürme fonksiyonu
function convertPrice(originalPrice, config, rates) {
  try {
    if (!originalPrice || isNaN(originalPrice) || originalPrice <= 0) {
      throw new Error('Invalid price value');
    }

    if (!config) {
      throw new Error('Config is required');
    }

    if (!rates || (!rates.usd && !rates.eur)) {
      throw new Error('Exchange rates are required');
    }

    let workingPrice = originalPrice;
    
    // İndirim hesaplama
    if (config.extraCost && config.discountAmount) {
      workingPrice = Math.max(0, workingPrice - config.discountAmount);
    }

    // KDV hesaplama
    if (config.kdvAction === 'remove') {
      workingPrice /= 1.20;
    } else if (config.kdvAction === 'add') {
      workingPrice *= 1.20;
    }

    // Döviz çevirimi
    let convertedPrice = 0;
    let currencySymbol = '';
    let baseCurrency = '';

    // Domain bazlı para birimi kontrolü - DomainHandler tanımlı mı diye kontrol et
    const isEuroBasedSite = isDomainEuroBased();
    baseCurrency = isEuroBasedSite ? '€' : '₺';

    if (isEuroBasedSite) {
      // Euro bazlı siteler için özel döviz çevirimi
      switch(config.selectedCurrency) {
        case 'usd_from_eur':
          if (rates.eurusd) {
            convertedPrice = workingPrice * rates.eurusd;
          } else {
            if (!rates.eur || !rates.usd) {
              throw new Error('EUR and USD rates are required for conversion');
            }
            const priceInTL = workingPrice * rates.eur;
            convertedPrice = priceInTL / rates.usd;
          }
          currencySymbol = '$';
          break;
        case 'try_from_eur':
          if (!rates.eur) {
            throw new Error('EUR rate is required for conversion');
          }
          convertedPrice = workingPrice * rates.eur;
          currencySymbol = '₺';
          break;
        case 'cny_from_eur':
          if (!rates.eur || !rates.cny) {
            throw new Error('EUR and CNY rates are required for conversion');
          }
          const priceInTL = workingPrice * rates.eur;
          convertedPrice = priceInTL / rates.cny;
          currencySymbol = '¥';
          break;
        default:
          if (rates.eurusd) {
            convertedPrice = workingPrice * rates.eurusd;
          } else {
            if (!rates.eur || !rates.usd) {
              throw new Error('EUR and USD rates are required for default conversion');
            }
            const priceInTL = workingPrice * rates.eur;
            convertedPrice = priceInTL / rates.usd;
          }
          currencySymbol = '$';
      }
    } else {
      // TL bazlı siteler için döviz çevirimi
      switch(config.selectedCurrency) {
        case 'usd':
          if (!rates.usd) {
            throw new Error('USD rate is required for conversion');
          }
          convertedPrice = workingPrice / rates.usd;
          currencySymbol = '$';
          break;
        case 'eur':
          if (!rates.eur) {
            throw new Error('EUR rate is required for conversion');
          }
          convertedPrice = workingPrice / rates.eur;
          currencySymbol = '€';
          break;
        case 'cny':
          if (!rates.cny) {
            throw new Error('CNY rate is required for conversion');
          }
          convertedPrice = workingPrice / rates.cny;
          currencySymbol = '¥';
          break;
        default:
          throw new Error('Invalid currency selection: ' + config.selectedCurrency);
      }
    }

    return {
      convertedPrice,
      currencySymbol,
      workingPrice,
      baseCurrency
    };
  } catch (error) {
    console.error('Error in convertPrice:', error);
    // Hata durumunda varsayılan değerler döndür
    return {
      convertedPrice: 0,
      currencySymbol: isNaN(originalPrice) ? '?' : originalPrice > 0 ? '₺' : '?',
      workingPrice: originalPrice || 0,
      baseCurrency: '₺'
    };
  }
}

// DomainHandler Euro bazlı kontrolü için yardımcı fonksiyon
function isDomainEuroBased() {
  try {
    return typeof DomainHandler !== 'undefined' && 
           typeof DomainHandler.isEuroBased === 'function' ? 
           DomainHandler.isEuroBased() : false;
  } catch (error) {
    console.warn('Error checking if domain is Euro based:', error);
    return false;
  }
}

// Finans hesaplama fonksiyonu
function calculateFinanceAndRMA(convertedPrice, config, currencySymbol, kdvStatus, isEuroBasedSite, percentageOperation) {
  try {
    if (!config || typeof convertedPrice !== 'number' || isNaN(convertedPrice)) {
      return '';
    }
    
    let html = '';
    
    if (config.financeCost) {
      // Yüzde işlemi için storage'dan değeri al
      // percentageOperation parametresi artık her iki site tipi için de aynı değeri kullanır
      const isAdd = percentageOperation === true;
      const operationSymbol = isAdd ? '+' : '-';
      
      // Finans maliyeti hesaplama
      const financePercentage = config.financeCost / 100;
      const financeAmount = convertedPrice * financePercentage;
      let financeDiscounted = isAdd ? 
        convertedPrice + financeAmount : 
        convertedPrice - financeAmount;
      
      html += `
        <div style="color: #28a745; margin-bottom: 3px;">
          Fin(${operationSymbol}${config.financeCost}%): ${currencySymbol}${financeDiscounted.toFixed(2)}${kdvStatus}
        </div>
      `;

      if (config.shippingCost) {
        // RMA/Yol maliyeti hesaplama
        const shippingPercentage = config.shippingCost / 100;
        const shippingAmount = financeDiscounted * shippingPercentage;
        let shippingDiscounted = isAdd ? 
          financeDiscounted + shippingAmount :
          financeDiscounted - shippingAmount;
        
        html += `
          <div style="color: #28a745;">
            RMA(${operationSymbol}${config.shippingCost}%): ${currencySymbol}${shippingDiscounted.toFixed(2)}${kdvStatus}
          </div>
        `;
      }
    }
    
    return html;
  } catch (error) {
    console.error('Error in calculateFinanceAndRMA:', error);
    return '';
  }
}

// Euro bazlı siteler için kompakt hesaplama
function getCompactFinanceHTML(convertedPrice, config, currencySymbol, kdvStatus, percentageOperation) {
  try {
    if (!config || typeof convertedPrice !== 'number' || isNaN(convertedPrice)) {
      return '';
    }
    
    // Konsola config değerlerini yazdıralım, debug için
    console.log('getCompactFinanceHTML config:', {
      salesCostEnabled: config.salesCostEnabled,
      salesCost: config.salesCost,
      financeCost: config.financeCost
    });
    
    let html = '';
    
    if (config.financeCost) {
      const isAdd = percentageOperation === true;
      const operationSymbol = isAdd ? '+' : '-';
      
      // Finans maliyeti hesaplama
      const financePercentage = config.financeCost / 100;
      const financeDiscounted = isAdd ? 
        convertedPrice * (1 + financePercentage) : 
        convertedPrice * (1 - financePercentage);
      
      html += `
        <div style="color: #28a745; font-size: 12px; display: flex; align-items: center; gap: 4px;">
          <span>İ.M.F(${operationSymbol}${config.financeCost}%):</span>
          <strong>${currencySymbol}${financeDiscounted.toFixed(2)}${kdvStatus}</strong>
        </div>
      `;

      // Satış maliyeti hesaplama (İ.M.F. değerinden sonra)
      // Sadece salesCostEnabled true ise S.M. değerini göster
      // Boolean olarak kesin kontrol yapalım
      if (config.salesCostEnabled === true) {
        console.log('S.M. değeri gösteriliyor (compact), config.salesCostEnabled:', config.salesCostEnabled);
        const salesCost = config.salesCost !== undefined ? config.salesCost : 10;
        const salesPercentage = salesCost / 100;
        const salesDiscounted = isAdd ? 
          financeDiscounted * (1 + salesPercentage) : 
          financeDiscounted * (1 - salesPercentage);
        
        html += `
          <div style="color: #28a745; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            <span>S.M.(${operationSymbol}${salesCost}%):</span>
            <strong>${currencySymbol}${salesDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;
      } else {
        console.log('S.M. değeri gösterilmiyor (compact), config.salesCostEnabled:', config.salesCostEnabled);
      }

      if (config.shippingCost) {
        // RMA maliyeti hesaplama
        const shippingPercentage = config.shippingCost / 100;
        const shippingDiscounted = isAdd ? 
          financeDiscounted * (1 + shippingPercentage) : 
          financeDiscounted * (1 - shippingPercentage);
        
        html += `
          <div style="color: #28a745; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            <span>RMA(${operationSymbol}${config.shippingCost}%):</span>
            <strong>${currencySymbol}${shippingDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;
      }
    }
    
    return html;
  } catch (error) {
    console.error('Error in getCompactFinanceHTML:', error);
    return '';
  }
}

// Dönüştürücülerin güvenli şekilde alınması
function getConverter(type) {
  try {
    switch(type) {
      case 'euro':
        return EuroBasedConverter;
      case 'try':
        return TryBasedConverter;
      default:
        // Varsayılan olarak TL bazlı dönüştürücü
        return TryBasedConverter;
    }
  } catch (error) {
    console.error('Error getting converter:', error);
    return null;
  }
}

// Euro bazlı dönüştürücü
const EuroBasedConverter = {
  convert: convertPrice,
  calculateFinance: calculateFinanceAndRMA,
  getCompactHTML: getCompactFinanceHTML
};

// TL bazlı dönüştürücü
const TryBasedConverter = {
  convert: convertPrice,
  calculateFinance: calculateFinanceAndRMA
};

// Export
window.convertPrice = convertPrice;
window.calculateFinanceAndRMA = calculateFinanceAndRMA;
window.getCompactFinanceHTML = getCompactFinanceHTML;
window.EuroBasedConverter = EuroBasedConverter;
window.TryBasedConverter = TryBasedConverter;
window.getConverter = getConverter;
window.isDomainEuroBased = isDomainEuroBased;