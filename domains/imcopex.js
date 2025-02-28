const imcopexConfig = {
  name: 'Imcopex',
  priceSelectors: [
    "/html/body/main/div[2]/div/div/div/div[1]/div/div[2]/div/div[1]/span",
    "span.price-regular"
  ],
  excludeSelectors: [
    '.old-price',
    '.special-price',
    '.price-from',
    '.tax-info'
  ],
  styles: {
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
        .trim();
      
      if (price.includes('.') && price.includes(',')) {
        price = price.replace('.', '').replace(',', '.');
      } else if (price.includes(',')) {
        price = price.replace(',', '.');
      }
      
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return null;
      }
      return parsedPrice;
    } catch (error) {
      console.error('Price extraction error:', error);
      return null;
    }
  },
  useXPath: true
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = imcopexConfig;
} else {
  window.imcopexConfig = imcopexConfig;
} 