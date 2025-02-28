const amazonConfig = {
  name: 'Amazon TR',
  priceSelectors: [
    '#corePrice_feature_div > div > div > span.a-price.aok-align-center > span:nth-child(2)',
    'div > div > div:nth-child(1) > a > span > span:nth-child(2)'
  ],
  styles: {
    '.a-price': {
      position: 'relative',
      minHeight: '60px'
    },
    '.a-price.aok-align-center': {
      position: 'relative',
      minHeight: '60px'
    },
    '.dcl-price-single': {
      position: 'relative',
      minHeight: '60px'
    }
  },
  priceExtractor: (element) => {
    const content = element.textContent.trim();
    if (!content.includes('TL') && !content.includes('₺')) {
      return null;
    }
    try {
      let price = content
        .replace('TL', '')
        .replace('₺', '')
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
  module.exports = amazonConfig;
} else {
  window.amazonConfig = amazonConfig;
} 