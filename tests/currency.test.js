const assert = require('assert');

// Setup minimal window object for the utils script
global.window = {};

// Load the currency utilities which attach convertPrice to window
require('../utils/currency.js');
const convertPrice = window.convertPrice;

// Test TL based USD conversion
let result = convertPrice(100, { selectedCurrency: 'usd' }, { usd: 20 });
assert.strictEqual(result.convertedPrice, 5);
assert.strictEqual(result.currencySymbol, '$');
assert.strictEqual(result.baseCurrency, '₺');

// Test TL based EUR conversion
result = convertPrice(100, { selectedCurrency: 'eur' }, { eur: 40 });
assert.strictEqual(result.convertedPrice, 2.5);
assert.strictEqual(result.currencySymbol, '€');
assert.strictEqual(result.baseCurrency, '₺');

// Test Euro based site USD from EUR conversion
global.DomainHandler = { isEuroBased: () => true };
result = convertPrice(100, { selectedCurrency: 'usd_from_eur' }, { eurusd: 1.2, eur: 1 });
assert.strictEqual(result.convertedPrice, 120);
assert.strictEqual(result.currencySymbol, '$');
assert.strictEqual(result.baseCurrency, '€');

console.log('All tests passed');
