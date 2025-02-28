const kosatecConfig = {
  name: 'Kosatec',
  priceSelectors: [
    "div > div > div.product-info > div.mt-2 > div > form > div > div.col-6.pe-0 > div > div > span",
    "body > main > div:nth-child(2) > div > div.product-detail > div.product-detail-content > div.row.product-detail-main > div.col-lg-5.product-detail-buy > div > div:nth-child(3) > div.product-detail-price-container > p",
    "body > main > div:nth-child(2) > div > div.product-detail > div.product-detail-content > div.row.product-detail-main > div.col-lg-5.product-detail-buy > div > div:nth-child(4) > div.product-detail-price-container > p"
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
  module.exports = kosatecConfig;
} else {
  window.kosatecConfig = kosatecConfig;
} 