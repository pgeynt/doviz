const waveDistributionConfig = {
  name: 'Wave Distribution',
  priceSelectors: [
    // Kullanıcı tarafından doğru selector'lar eklenecek
    // Aşağıdaki selector'lar placeholder olarak eklendi
    ".product-price",
    ".price",
    ".current-price"
  ],
  excludeSelectors: [
    '.old-price',
    '.special-price',
    '.price-from'
  ],
  styles: {
    'p': {
      position: 'relative',
      minHeight: '60px'
    },
    'span': {
      position: 'relative',
      minHeight: '60px'
    }
  },
  priceExtractor: (element) => {
    try {
      let price = element.textContent.trim()
        .replace('€', '')
        .replace('EUR', '')
        .replace('*', '')
        .replace('.', '')
        .replace(',', '.')
        .trim();
      
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return null;
      }
      return parsedPrice;
    } catch (error) {
      console.error('Price extraction error:', error);
      return null;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = waveDistributionConfig;
} else {
  window.waveDistributionConfig = waveDistributionConfig;
} 