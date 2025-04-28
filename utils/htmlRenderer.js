// HTML oluşturma yardımcı fonksiyonları

// Temel fiyat dönüşüm HTML'ini oluşturma
function createBasicPriceHTML(originalPrice, convertedPrice, currencySymbol, workingPrice, baseCurrency, config, kdvStatus) {
  try {
    let html = '';

    // İndirim gösterimi
    if (config && config.extraCost && config.discountAmount) {
      const isEuroBased = typeof DomainHandler !== 'undefined' && typeof DomainHandler.isEuroBased === 'function' ? 
        DomainHandler.isEuroBased() : false;
      
      const displayPrice = isEuroBased ? 
        workingPrice : 
        (config.kdvAction === 'remove' ? workingPrice * 1.20 : workingPrice);
      
      html += `
        <div style="color: #0066cc; margin-bottom: 3px;">
          İndirimli: ${displayPrice.toFixed(2)} ${baseCurrency} (-${config.discountAmount})
        </div>
      `;
    }

    // Döviz çevrimi gösterimi
    html += `
      <div style="color: #dc3545; margin-bottom: 3px; font-size: 10px;">
        ${currencySymbol}${convertedPrice.toFixed(2)}${kdvStatus}
      </div>
    `;

    return html;
  } catch (error) {
    console.error('Error creating basic price HTML:', error);
    return `<div>Fiyat gösterimi oluşturulurken hata oluştu</div>`;
  }
}

// Dönüşüm sonrası HTML'i oluşturma
function createFinanceAndRmaHTML(convertedPrice, config, currencySymbol, kdvStatus, isEuroBasedSite, percentageOperation) {
  try {
    if (!config || typeof convertedPrice !== 'number' || isNaN(convertedPrice)) {
      return '';
    }
    
    // Konsola config değerlerini yazdıralım, debug için
    console.log('createFinanceAndRmaHTML config:', {
      salesCostEnabled: config.salesCostEnabled,
      salesCost: config.salesCost,
      financeCost: config.financeCost,
      costMethod: config.costMethod
    });
    
    let html = '';
    
    // Maliyet hesaplama yöntemini kontrol et
    const costMethod = config && typeof config.costMethod === 'string' ? config.costMethod : 'detailed';
    
    if (costMethod === 'total') {
      // Toplam Masraf modu - sadece toplam maliyet göster
      console.log('createFinanceAndRmaHTML: Toplam Masraf modu seçildi, sadece toplam maliyet gösteriliyor.');
      
      if (config.totalCost) {
        const isAdd = percentageOperation === true;
        const operationSymbol = isAdd ? '+' : '-';
        
        // Toplam maliyet hesaplama
        const totalPercentage = config.totalCost / 100;
        const totalAmount = convertedPrice * totalPercentage;
        const totalDiscounted = isAdd ? 
          convertedPrice + totalAmount : 
          convertedPrice - totalAmount;
        
        html += `
          <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
            T.M.(${operationSymbol}${config.totalCost}%): <strong>${currencySymbol}${totalDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;
      }
    } else {
      // Detaylı masraf modu - İMF ve SM göster
      if (config.financeCost) {
        const isAdd = percentageOperation === true;
        const operationSymbol = isAdd ? '+' : '-';
        
        // Finans maliyeti hesaplama
        const financePercentage = config.financeCost / 100;
        const financeAmount = convertedPrice * financePercentage;
        let financeDiscounted = isAdd ? 
          convertedPrice + financeAmount : 
          convertedPrice - financeAmount;
        
        html += `
          <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
            İ.M.F(${operationSymbol}${config.financeCost}%): <strong>${currencySymbol}${financeDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;

        // Satış maliyeti hesaplama (İ.M.F. değerinden sonra)
        // Sadece salesCostEnabled true ise S.M. değerini göster
        // Boolean olarak kesin kontrol yapalım
        if (config.salesCostEnabled === true) {
          console.log('S.M. değeri gösteriliyor, config:', config);
          const salesCost = config.salesCost !== undefined ? config.salesCost : 10;
          const salesPercentage = salesCost / 100;
          const salesAmount = financeDiscounted * salesPercentage;
          const salesDiscounted = isAdd ? 
            financeDiscounted + salesAmount : 
            financeDiscounted - salesAmount;
          
          html += `
            <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
              S.M.(${operationSymbol}${config.salesCost}%): <strong>${currencySymbol}${salesDiscounted.toFixed(2)}${kdvStatus}</strong>
            </div>
          `;
        } else {
          console.log('S.M. değeri gösterilmiyor, config.salesCostEnabled:', config.salesCostEnabled);
        }
        
        // RMA/Yol maliyeti (eğer varsa)
        if (config.shippingCost) {
          // RMA/Yol maliyeti hesaplama
          const shippingPercentage = config.shippingCost / 100;
          const shippingAmount = financeDiscounted * shippingPercentage;
          let shippingDiscounted = isAdd ? 
            financeDiscounted + shippingAmount :
            financeDiscounted - shippingAmount;
          
          html += `
            <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
              Yol/R.M.A(${operationSymbol}${config.shippingCost}%): <strong>${currencySymbol}${shippingDiscounted.toFixed(2)}${kdvStatus}</strong>
            </div>
          `;
        }
      }
    }
    
    return html;
  } catch (error) {
    console.error('Error in createFinanceAndRmaHTML:', error);
    return '';
  }
}

// Kompakt finans hesaplama HTML'i (Euro bazlı siteler için)
function createCompactFinanceHTML(convertedPrice, config, currencySymbol, kdvStatus, percentageOperation) {
  try {
    if (!config || typeof convertedPrice !== 'number' || isNaN(convertedPrice)) {
      return '';
    }
    
    // Konsola config değerlerini yazdıralım, debug için
    console.log('createCompactFinanceHTML config:', {
      salesCostEnabled: config.salesCostEnabled,
      salesCost: config.salesCost,
      financeCost: config.financeCost,
      costMethod: config.costMethod
    });
    
    let html = '';
    
    // Maliyet hesaplama yöntemini kontrol et
    const costMethod = config && typeof config.costMethod === 'string' ? config.costMethod : 'detailed';
    
    if (costMethod === 'total') {
      // Toplam Masraf modu - sadece toplam maliyet göster
      console.log('createCompactFinanceHTML: Toplam Masraf modu seçildi, sadece toplam maliyet gösteriliyor.');
      
      if (config.totalCost) {
        const isAdd = percentageOperation === true;
        const operationSymbol = isAdd ? '+' : '-';
        
        // Toplam maliyet hesaplama
        const totalPercentage = config.totalCost / 100;
        const totalDiscounted = isAdd ? 
          convertedPrice * (1 + totalPercentage) : 
          convertedPrice * (1 - totalPercentage);
        
        html += `
          <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
            T.M.(${operationSymbol}${config.totalCost}%): <strong>${currencySymbol}${totalDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;
      }
    } else {
      // Detaylı masraf modu - İMF ve SM göster
      if (config.financeCost) {
        const isAdd = percentageOperation === true;
        const operationSymbol = isAdd ? '+' : '-';
        
        // Finans maliyeti hesaplama
        const financePercentage = config.financeCost / 100;
        const financeDiscounted = isAdd ? 
          convertedPrice * (1 + financePercentage) : 
          convertedPrice * (1 - financePercentage);
        
        html += `
          <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
            İ.M.F(${operationSymbol}${config.financeCost}%): <strong>${currencySymbol}${financeDiscounted.toFixed(2)}${kdvStatus}</strong>
          </div>
        `;

        if (config.shippingCost) {
          // RMA maliyeti hesaplama
          const shippingPercentage = config.shippingCost / 100;
          const shippingDiscounted = isAdd ? 
            financeDiscounted * (1 + shippingPercentage) : 
            financeDiscounted * (1 - shippingPercentage);
          
          html += `
            <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
              RMA(${operationSymbol}${config.shippingCost}%): <strong>${currencySymbol}${shippingDiscounted.toFixed(2)}${kdvStatus}</strong>
            </div>
          `;
          
          // Satış maliyeti (eğer etkinleştirilmişse)
          if (config.salesCost && config.salesCostEnabled) {
            const salesPercentage = config.salesCost / 100;
            const salesDiscounted = isAdd ? 
              shippingDiscounted * (1 + salesPercentage) : 
              shippingDiscounted * (1 - salesPercentage);
            
            html += `
              <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
                S.M.(${operationSymbol}${config.salesCost}%): <strong>${currencySymbol}${salesDiscounted.toFixed(2)}${kdvStatus}</strong>
              </div>
            `;
          }
        } else if (config.salesCost && config.salesCostEnabled) {
          // RMA/Yol maliyeti yoksa ama satış maliyeti varsa
          const salesPercentage = config.salesCost / 100;
          const salesDiscounted = isAdd ? 
            financeDiscounted * (1 + salesPercentage) : 
            financeDiscounted * (1 - salesPercentage);
          
          html += `
            <div style="color: #006622; font-size: 10px; white-space: nowrap; overflow: visible; margin-bottom: 2px; background-color: #e6f7ee; padding: 2px 4px; border-radius: 3px; border: 1px solid #c9e9d9;">
              S.M.(${operationSymbol}${config.salesCost}%): <strong>${currencySymbol}${salesDiscounted.toFixed(2)}${kdvStatus}</strong>
            </div>
          `;
        }
      }
    }
    
    return html;
  } catch (error) {
    console.error('Error in createCompactFinanceHTML:', error);
    return '';
  }
}

// Domain-spesifik HTML oluşturma fonksiyonları
function createHepsiburadaHTML(priceData) {
  try {
    const { html } = priceData;

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
      transition: all 0.3s ease-in-out;
      pointer-events: auto !important;
    `;
    
    // Küçültme butonu
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      position: absolute;
      top: calc(100% - 15px);
      right: 5px;
      background: none;
      border: none;
      font-size: 14px;
      line-height: 14px;
      cursor: pointer;
      color: #777;
      padding: 0;
      z-index: 1000;
    `;
    
    // İçerik div'i
    const contentDiv = document.createElement('div');
    contentDiv.className = 'price-conversion-content';
    contentDiv.innerHTML = html;
    
    // Minimize/maximize durumu
    let isMinimized = false;
    
    // Küçültme/büyütme fonksiyonu
    minimizeBtn.onclick = (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      if (isMinimized) {
        // Büyült
        contentDiv.style.display = 'block';
        priceInfoElement.style.height = 'auto';
        priceInfoElement.style.padding = '8px';
      } else {
        // Küçült
        contentDiv.style.display = 'none';
        priceInfoElement.style.height = '2px';
        priceInfoElement.style.padding = '0px 8px';
        priceInfoElement.style.cursor = 'pointer';
      }
      isMinimized = !isMinimized;
    };
    
    // Küçültüldüğünde tüm konteyner tıklanabilir olsun
    priceInfoElement.addEventListener('click', (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
      if (isMinimized && e.target === priceInfoElement) {
        contentDiv.style.display = 'block';
        priceInfoElement.style.height = 'auto';
        priceInfoElement.style.padding = '8px';
        priceInfoElement.style.cursor = 'default';
        isMinimized = false;
      }
    });
    
    priceInfoElement.appendChild(minimizeBtn);
    priceInfoElement.appendChild(contentDiv);
    
    return {
      element: priceInfoElement,
      applyToWrapper: function(priceElement) {
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
      }
    };
  } catch (error) {
    console.error('Error creating Hepsiburada HTML:', error);
    return { element: document.createElement('div'), applyToWrapper: function() {} };
  }
}

function createTrendyolHTML(priceData) {
  try {
    const { html } = priceData;

    // Trendyol için özel yerleştirme
    const trendyolDiv = document.createElement('div');
    trendyolDiv.className = 'price-conversion-container';
    trendyolDiv.style.cssText = `
      display: inline-flex !important;
      flex-direction: column;
      margin-left: 10px;
      padding: 6px 10px;
      border-radius: 4px;
      background: #f8f9fa;
      font-size: 12px;
      color: #333;
      border: 1px solid #e5e5e5;
      position: relative !important;
      z-index: 999999 !important;
      visibility: visible !important;
      opacity: 1 !important;
      transition: all 0.3s ease-in-out;
      pointer-events: auto !important;
    `;
    
    // Küçültme butonu
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      position: absolute;
      top: calc(100% - 15px);
      right: 5px;
      background: none;
      border: none;
      font-size: 14px;
      line-height: 14px;
      cursor: pointer;
      color: #777;
      padding: 0;
      z-index: 1000;
    `;
    
    // İçerik div'i
    const contentDiv = document.createElement('div');
    contentDiv.className = 'price-conversion-content';
    contentDiv.innerHTML = html;
    
    // Minimize/maximize durumu
    let isMinimized = false;
    
    // Küçültme/büyütme fonksiyonu
    minimizeBtn.onclick = (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      if (isMinimized) {
        // Büyült
        contentDiv.style.display = 'block';
        trendyolDiv.style.height = 'auto';
        trendyolDiv.style.padding = '6px 10px';
      } else {
        // Küçült
        contentDiv.style.display = 'none';
        trendyolDiv.style.height = '2px';
        trendyolDiv.style.padding = '0px 10px';
        trendyolDiv.style.cursor = 'pointer';
      }
      isMinimized = !isMinimized;
    };
    
    // Küçültüldüğünde tüm konteyner tıklanabilir olsun
    trendyolDiv.addEventListener('click', (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
      if (isMinimized && e.target === trendyolDiv) {
        contentDiv.style.display = 'block';
        trendyolDiv.style.height = 'auto';
        trendyolDiv.style.padding = '6px 10px';
        trendyolDiv.style.cursor = 'default';
        isMinimized = false;
      }
    });
    
    trendyolDiv.appendChild(minimizeBtn);
    trendyolDiv.appendChild(contentDiv);

    return {
      element: trendyolDiv,
      applyToWrapper: function(priceElement) {
        const priceWrapper = priceElement.closest('.pr-bx-nm.with-org-prc') || 
                           priceElement.closest('.pr-bx-w') || 
                           priceElement.closest('.product-price-container');

        if (priceWrapper) {
          priceWrapper.style.cssText = `
            position: relative !important;
            z-index: 99999 !important;
            visibility: visible !important;
            opacity: 1 !important;
          `;
          priceWrapper.appendChild(trendyolDiv);
        } else {
          priceElement.insertAdjacentElement('afterend', trendyolDiv);
        }
      }
    };
  } catch (error) {
    console.error('Error creating Trendyol HTML:', error);
    return { element: document.createElement('div'), applyToWrapper: function() {} };
  }
}

function createEuroBasedHTML(priceData) {
  try {
    const { 
      originalPrice, 
      convertedPrice, 
      currencySymbol, 
      baseCurrency, 
      config, 
      kdvStatus,
      percentageOperation 
    } = priceData;

    // Euro bazlı siteler için özel yerleştirme
    const euroBasedDiv = document.createElement('div');
    euroBasedDiv.className = 'price-conversion-container';
    
    // Margin ayarı
    euroBasedDiv.style.cssText = `
      display: inline-flex !important;
      flex-direction: column;
      margin-left: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      background: #f8f9fa;
      font-size: 13px;
      color: #333;
      border: 1px solid #e5e5e5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 999 !important;
      transition: all 0.3s ease-in-out;
      pointer-events: auto !important;
    `;

    // Küçültme butonu
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      position: absolute;
      top: calc(100% - 15px);
      right: 5px;
      background: none;
      border: none;
      font-size: 14px;
      line-height: 14px;
      cursor: pointer;
      color: #777;
      padding: 0;
      z-index: 1000;
    `;
    
    // İçerik div'i
    const contentDiv = document.createElement('div');
    contentDiv.className = 'price-conversion-content';
    
    // Minimize/maximize durumu
    let isMinimized = false;
    
    // Küçültme/büyütme fonksiyonu
    minimizeBtn.onclick = (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      if (isMinimized) {
        // Büyült
        contentDiv.style.display = 'block';
        euroBasedDiv.style.height = 'auto';
        euroBasedDiv.style.padding = '8px 12px';
      } else {
        // Küçült
        contentDiv.style.display = 'none';
        euroBasedDiv.style.height = '2px';
        euroBasedDiv.style.padding = '0px 12px';
        euroBasedDiv.style.cursor = 'pointer';
      }
      isMinimized = !isMinimized;
    };
    
    // Küçültüldüğünde tüm konteyner tıklanabilir olsun
    euroBasedDiv.addEventListener('click', (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
      if (isMinimized && e.target === euroBasedDiv) {
        contentDiv.style.display = 'block';
        euroBasedDiv.style.height = 'auto';
        euroBasedDiv.style.padding = '8px 12px';
        euroBasedDiv.style.cursor = 'default';
        isMinimized = false;
      }
    });

    euroBasedDiv.appendChild(minimizeBtn);

    const isAdd = percentageOperation === true;
    const operationSymbol = isAdd ? '+' : '-';
    
    let compactHtml = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; font-size: 12px; color: #444;">
            ${currencySymbol}${convertedPrice.toFixed(2)}${kdvStatus}
          </span>
        </div>
    `;

    // Finans & RMA hesaplamaları
    compactHtml += createCompactFinanceHTML(
      convertedPrice, 
      config, 
      currencySymbol, 
      kdvStatus, 
      percentageOperation
    );

    compactHtml += `</div>`;
    contentDiv.innerHTML = compactHtml;
    euroBasedDiv.appendChild(contentDiv);

    return {
      element: euroBasedDiv,
      applyToWrapper: function(priceElement) {
        // Container bulma
        const priceContainer = priceElement.closest('.price-container') || 
                             priceElement.closest('.product-price-container') ||
                             priceElement.closest('.product-detail-price-container');
        
        if (priceContainer) {
          priceContainer.style.cssText = `
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          `;
          const existingConversion = priceContainer.querySelector('.price-conversion-container');
          if (existingConversion) {
            existingConversion.remove();
          }
          priceContainer.appendChild(euroBasedDiv);
        } else {
          const wrapper = document.createElement('div');
          wrapper.style.cssText = `
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin: 10px 0 !important;
            visibility: visible !important;
            opacity: 1 !important;
          `;
          wrapper.appendChild(euroBasedDiv);
          priceElement.insertAdjacentElement('afterend', wrapper);
        }
      }
    };
  } catch (error) {
    console.error('Error creating Euro based HTML:', error);
    return { element: document.createElement('div'), applyToWrapper: function() {} };
  }
}

function createAkakceHTML(priceData) {
  try {
    const { html } = priceData;

    // Akakce.com için özel düzenleme
    const akakceWrapper = document.createElement('div');
    akakceWrapper.className = 'conversion-wrapper-akakce';
    akakceWrapper.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      top: 100% !important;
      margin-top: 5px !important;
      width: auto !important;
      display: block !important;
      z-index: 999999 !important;
      background: rgba(255, 255, 255, 0.95) !important;
      border-radius: 4px !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
      padding: 8px !important;
      opacity: 1 !important;
      visibility: visible !important;
      transform: none !important;
      transition: all 0.3s ease-in-out !important;
      pointer-events: auto !important;
    `;
    
    const conversionDiv = document.createElement('div');
    conversionDiv.className = 'price-conversion-container';
    conversionDiv.style.cssText = `
      display: block !important;
      min-width: 150px !important;
      width: auto !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      opacity: 1 !important;
      visibility: visible !important;
      transform: none !important;
      pointer-events: auto !important;
      position: relative !important;
    `;
    
    // Küçültme butonu
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      position: absolute;
      top: calc(100% - 15px);
      right: 5px;
      background: none;
      border: none;
      font-size: 14px;
      line-height: 14px;
      cursor: pointer;
      color: #777;
      padding: 0;
      z-index: 1000;
    `;
    
    // İçerik div'i
    const contentDiv = document.createElement('div');
    contentDiv.className = 'price-conversion-content';
    contentDiv.innerHTML = html;
    
    // Minimize/maximize durumu
    let isMinimized = false;
    
    // Küçültme/büyütme fonksiyonu
    minimizeBtn.onclick = (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      if (isMinimized) {
        // Büyült
        contentDiv.style.display = 'block';
        akakceWrapper.style.height = 'auto';
        akakceWrapper.style.padding = '8px !important';
      } else {
        // Küçült
        contentDiv.style.display = 'none';
        akakceWrapper.style.height = '2px';
        akakceWrapper.style.padding = '0px 8px !important';
        akakceWrapper.style.cursor = 'pointer';
      }
      isMinimized = !isMinimized;
    };
    
    // Küçültüldüğünde tüm konteyner tıklanabilir olsun
    akakceWrapper.addEventListener('click', (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
      if (isMinimized && e.target === akakceWrapper) {
        contentDiv.style.display = 'block';
        akakceWrapper.style.height = 'auto';
        akakceWrapper.style.padding = '8px !important';
        akakceWrapper.style.cursor = 'default';
        isMinimized = false;
      }
    });
    
    conversionDiv.appendChild(minimizeBtn);
    conversionDiv.appendChild(contentDiv);
    
    akakceWrapper.appendChild(conversionDiv);

    return {
      element: akakceWrapper,
      applyToWrapper: function(priceElement) {
        // Fiyatın parent elementini pozisyon belirlemek için relative yap
        const priceParent = priceElement.parentElement;
        if (priceParent) {
          if (!priceParent.style.position || priceParent.style.position === 'static') {
            priceParent.style.position = 'relative';
          }
          
          // Önce varsa eski dönüşüm kutucuklarını temizle
          const oldWrappers = priceParent.querySelectorAll('.conversion-wrapper-akakce');
          oldWrappers.forEach(w => w.remove());
          
          priceParent.appendChild(akakceWrapper);
        } else {
          // Eğer parent bulunamazsa, direk fiyat elementinin yanına ekle
          const priceElementPos = priceElement.getBoundingClientRect();
          akakceWrapper.style.position = 'fixed';
          akakceWrapper.style.left = `${priceElementPos.left}px`;
          akakceWrapper.style.top = `${priceElementPos.bottom + 5}px`;
          document.body.appendChild(akakceWrapper);
        }
      }
    };
  } catch (error) {
    console.error('Error creating Akakce HTML:', error);
    return { element: document.createElement('div'), applyToWrapper: function() {} };
  }
}

function createGenericHTML(priceData) {
  try {
    const { html, config } = priceData;

    // Debug için config bilgilerini konsola yazdıralım
    console.log('createGenericHTML config:', {
      salesCostEnabled: config ? config.salesCostEnabled : undefined,
      salesCost: config ? config.salesCost : undefined
    });

    // TL bazlı diğer siteler için
    const wrapper = document.createElement('div');
    wrapper.className = 'price-conversion-wrapper';
    wrapper.style.cssText = `
      display: inline-block !important;
      position: relative !important;
      z-index: 999999 !important;
      visibility: visible !important;
      opacity: 1 !important;
      margin-left: 10px !important;
      pointer-events: auto !important;
    `;
    
    const conversionDiv = document.createElement('div');
    conversionDiv.className = 'price-conversion-container';
    conversionDiv.style.cssText = `
      display: inline-block !important;
      padding: 8px;
      border-radius: 8px;
      background: rgba(2, 21, 61, 0.05);
      font-size: 0.9em;
      vertical-align: middle;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 999999 !important;
      transition: all 0.3s ease-in-out;
      pointer-events: auto !important;
    `;
    
    // Küçültme butonu
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      position: absolute;
      top: calc(100% - 15px);
      right: 5px;
      background: none;
      border: none;
      font-size: 14px;
      line-height: 14px;
      cursor: pointer;
      color: #777;
      padding: 0;
      z-index: 1000;
    `;
    
    // İçerik div'i
    const contentDiv = document.createElement('div');
    contentDiv.className = 'price-conversion-content';
    contentDiv.innerHTML = html;
    
    // Minimize/maximize durumu
    let isMinimized = false;
    
    // Küçültme/büyütme fonksiyonu
    minimizeBtn.onclick = (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      if (isMinimized) {
        // Büyült
        contentDiv.style.display = 'block';
        conversionDiv.style.height = 'auto';
        conversionDiv.style.padding = '8px';
      } else {
        // Küçült
        contentDiv.style.display = 'none';
        conversionDiv.style.height = '2px';
        conversionDiv.style.padding = '0px 8px';
        conversionDiv.style.cursor = 'pointer';
      }
      isMinimized = !isMinimized;
    };
    
    // Küçültüldüğünde tüm konteyner tıklanabilir olsun
    conversionDiv.addEventListener('click', (e) => {
      e.stopPropagation(); // Event balonlanmasını engelle
      // Eğer zaten küçültülmüşse ve tıklanan element konteyner ise (butonlar değil)
      if (isMinimized && e.target === conversionDiv) {
        contentDiv.style.display = 'block';
        conversionDiv.style.height = 'auto';
        conversionDiv.style.padding = '8px';
        conversionDiv.style.cursor = 'default';
        isMinimized = false;
      }
    });
    
    conversionDiv.appendChild(minimizeBtn);
    conversionDiv.appendChild(contentDiv);
    
    wrapper.appendChild(conversionDiv);

    return {
      element: wrapper,
      applyToWrapper: function(priceElement) {
        const container = priceElement.closest('.product-price') || 
                        priceElement.closest('.price-container') || 
                        priceElement.parentNode;
                        
        if (container) {
          container.style.cssText = `
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 99999 !important;
          `;
          container.appendChild(wrapper);
        } else {
          priceElement.insertAdjacentElement('afterend', wrapper);
        }
      }
    };
  } catch (error) {
    console.error('Error creating generic HTML:', error);
    return { element: document.createElement('div'), applyToWrapper: function() {} };
  }
}

// Domain bazlı HTML oluşturucu seçici
function getDomainHtmlRenderer(domainName) {
  if (!domainName) return createGenericHTML;
  
  // Domain adını logla
  console.log('getDomainHtmlRenderer çağrıldı, domain:', domainName);
  
  const renderers = {
    'Hepsiburada': createHepsiburadaHTML,
    'Trendyol': createTrendyolHTML,
    'Akakce': createAkakceHTML,
    'Kosatec': createEuroBasedHTML,
    'Imcopex': createEuroBasedHTML,
    'Siewert-Kau': createEuroBasedHTML,
    'UserDefined': createGenericHTML // Varsayılan olarak generic HTML oluşturucu kullan
  };
  
  // Kullanıcı tanımlı domain için, kullanıcının seçtiği para birimi tipine göre render et
  if (domainName === 'UserDefined' && typeof DomainHandler !== 'undefined' && typeof DomainHandler.isEuroBased === 'function') {
    if (DomainHandler.isEuroBased()) {
      console.log('Rendering Euro-based HTML for user-defined domain');
      return createEuroBasedHTML;
    } else {
      console.log('Rendering Generic HTML for user-defined domain (TL-based)');
      return createGenericHTML;
    }
  }
  
  // Tanımlı domainler için renderer'ı döndür, yoksa generic kullan
  const renderer = renderers[domainName];
  if (renderer) {
    console.log(`Using ${domainName} renderer`);
    return renderer;
  }
  
  console.log(`No specific renderer for ${domainName}, using generic`);
  return createGenericHTML;
}

// Export
window.createBasicPriceHTML = createBasicPriceHTML;
window.createFinanceAndRmaHTML = createFinanceAndRmaHTML;
window.createCompactFinanceHTML = createCompactFinanceHTML;
window.createHepsiburadaHTML = createHepsiburadaHTML;
window.createTrendyolHTML = createTrendyolHTML;
window.createEuroBasedHTML = createEuroBasedHTML;
window.createAkakceHTML = createAkakceHTML;
window.createGenericHTML = createGenericHTML;
window.getDomainHtmlRenderer = getDomainHtmlRenderer;
window.getDomainHtmlRenderer = getDomainHtmlRenderer;