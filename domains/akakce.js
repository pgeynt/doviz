const akakceConfig = {
  name: 'Akakce',
  priceSelectors: [
    '#pd_v8 > div.bb_w > span.pb_v8 > span',
    'a > span.pb_v8 > span.pt_v8',
  ],
  styles: {
    'a > span.pt_v8': {
      height: '100px',
      display: 'block',
      overflow: 'visible'
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = akakceConfig;
} else {
  window.akakceConfig = akakceConfig;
} 