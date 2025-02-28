const siewertKauConfig = {
  name: 'Siewert-Kau',
  priceSelectors: [
    "div > div:nth-child(1) > div.grid > div:nth-child(1) > div > span.price__amount.price__amount--catalog.price__amount--catalog-list.js-price__price.price__amount--asterisks.price__amount--green",
    "div > div.grid.grid--stretch > div.col.col--sm-3.col--md-4.col--xl-3.product-list-item__col.product-list-item__total > div > div:nth-child(1) > div.grid > div:nth-child(1) > div > span.price__amount.price__amount--catalog.price__amount--catalog-list.js-price__price.price__amount--asterisks",
    "body > div.page-layout > div > main > div > product-content > div > div > product-configurator > div.product-configurator__info.col.col--sm-12.col--print-12 > div > div:nth-child(1) > div > span.price__amount.price__amount--pdp.volume-price__amount > span",
    "body > div.page-layout > div > main > div > product-content > div > div > product-configurator > div.product-configurator__info.col.col--sm-12.col--print-12 > div > div:nth-child(1) > div > span.price__amount.price__amount--pdp.volume-price__amount > span"
  ],
  excludeSelectors: [
    '.old-price',
    '.special-price',
    '.price-from',
    '.tax-info',
    '.price__amount--original'
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = siewertKauConfig;
} else {
  window.siewertKauConfig = siewertKauConfig;
} 