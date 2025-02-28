const trendyolConfig = {
  name: 'Trendyol',
  priceSelectors: [
    ".product-price-container .pr-bx-w .pr-bx-nm.with-org-prc span.prc-dsc",
    "#product-detail-app > div > div.flex-container > div > div:nth-child(2) > div:nth-child(2) > div > div.product-detail-wrapper > div.pr-in-w > div > div > div.product-price-container > div > div > div > div.featured-prices > span",
    "div.pr-bx-w.v2 > div > span"
  ],
  styles: {
    'span': {
      position: 'relative',
      minHeight: '60px'
    }
  },
  priceExtractor: (element) => {
    try {
      if (element.classList.contains('prc-org')) {
        return null;
      }

      let price = element.textContent.trim();
      price = price
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
  module.exports = trendyolConfig;
} else {
  window.trendyolConfig = trendyolConfig;
} 