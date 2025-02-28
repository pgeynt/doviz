document.addEventListener('DOMContentLoaded', () => {
  const usdElement = document.getElementById('usdRate');
  const euroElement = document.getElementById('euroRate');
  const eurUsdElement = document.getElementById('eurUsdRate');
  const cnyElement = document.getElementById('cnyRate');
  const financeCostInput = document.getElementById('finance-cost');
  const shippingCostInput = document.getElementById('shipping-cost');
  const percentageOperationCheckbox = document.getElementById('percentage-operation');
  const kosatecOnlyElements = document.querySelector('.kosatec-only');

  // Domain konfigürasyonlarını yükle
  const supportedDomains = [
    'www.akakce.com',
    'www.amazon.com.tr',
    'www.hepsiburada.com',
    'www.trendyol.com',
    'shop.kosatec.de',
    'www.imcopex.shop',
    'www.siewert-kau.com'
  ];

  const euroBasedDomains = ['shop.kosatec.de', 'www.imcopex.shop', 'www.siewert-kau.com'];
  
  // Geçerli site için Euro bazlı mı yoksa TL bazlı mı olduğunu takip etmek için değişkenler
  let currentDomain = '';
  let isCurrentSiteEuroBased = false;

  // Sayfa yüklendiğinde, mevcut domainin kayıtlı olup olmadığını kontrol et
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      
      // Varsayılan olarak desteklenen domainleri kontrol et
      const isDefaultDomain = supportedDomains.includes(domain);
      
      chrome.storage.local.get(['savedDomains'], (result) => {
        let savedDomains = result.savedDomains || [];
        const isUserSavedDomain = savedDomains.some(d => d.hostname === domain);
        
        // Varsayılan domainleri kullanıcı kaydetmediyse listeye ekle
        if (isDefaultDomain && !isUserSavedDomain) {
          // Domain tipini belirle (Euro veya TL)
          const domainType = euroBasedDomains.includes(domain) ? 'euro' : 'tl';
          
          // Yeni varsayılan domain ekle
          savedDomains.push({
            hostname: domain,
            type: domainType,
            isDefault: true, // Varsayılan domain olduğunu belirt
            timestamp: new Date().getTime()
          });
          
          // Güncellenmiş listeyi kaydet
          chrome.storage.local.set({ savedDomains: savedDomains });
        }
        
        // Domain kayıtlı mı veya varsayılan mı kontrol et
        const isDomainSaved = isUserSavedDomain || isDefaultDomain;
        
        // Ekleme butonunu güncelle
        const addItemBtn = document.getElementById('addItem');
        if (addItemBtn) {
          if (isDomainSaved) {
            // Bu domain zaten kayıtlı, ekle butonunu gizle
            addItemBtn.style.display = 'none';
          } else {
            // Kayıtlı değil, butonu göster
            addItemBtn.style.display = 'block';
          }
        }
        
        // Domain adını güncelle
        const domainElement = document.getElementById('currentDomain');
        if (domainElement) {
          domainElement.textContent = domain;
          
          if (isDomainSaved) {
            // Kayıtlı domain vurgusu
            domainElement.style.color = '#00EED0';
            domainElement.style.fontWeight = 'bold';
          } else {
            // Normal görünüm
            domainElement.style.color = '#fff';
            domainElement.style.fontWeight = 'normal';
          }
        }
      });
    }
  });

  // Operasyon göstergelerini güncelle
  const updateOperationIndicators = (isAdd) => {
    const financeIndicator = document.getElementById('finance-operation-indicator');
    const shippingIndicator = document.getElementById('shipping-operation-indicator');
    
    if (isAdd) {
      financeIndicator.textContent = '+';
      shippingIndicator.textContent = '+';
      financeIndicator.classList.add('add');
      shippingIndicator.classList.add('add');
    } else {
      financeIndicator.textContent = '-';
      shippingIndicator.textContent = '-';
      financeIndicator.classList.remove('add');
      financeIndicator.classList.remove('add');
    }
  };

  // Radio button değişikliğini dinle
  document.querySelectorAll('input[name="conversion"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      chrome.storage.local.set({ selectedCurrency: e.target.value });
      updatePageConversions();
    });
  });

  // Kurları chrome.storage'dan al
  chrome.storage.local.get(['usd', 'eur', 'eurusd', 'cny', 'selectedCurrency'], (result) => {
    if (result.usd !== undefined) {
      usdElement.textContent = result.usd;
    } else {
      usdElement.textContent = 'Veri alınamadı';
    }

    if (result.eur !== undefined) {
      euroElement.textContent = result.eur;
    } else {
      euroElement.textContent = 'Veri alınamadı';
    }

    if (result.eurusd !== undefined) {
      eurUsdElement.textContent = result.eurusd;
    } else {
      eurUsdElement.textContent = 'Veri alınamadı';
    }

    if (result.cny !== undefined) {
      cnyElement.textContent = result.cny;
    } else {
      cnyElement.textContent = 'Veri alınamadı';
    }

    if (result.selectedCurrency) {
      document.querySelector(`input[value="${result.selectedCurrency}"]`).checked = true;
    }
  });

  // Finans maliyeti değiştiğinde
  financeCostInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      chrome.storage.local.set({ financeCost: value });
      shippingCostInput.disabled = false;
      shippingCostInput.placeholder = "Örn: 2.5";
      updatePageConversions();
    } else {
      shippingCostInput.disabled = true;
      shippingCostInput.value = '';
      shippingCostInput.placeholder = "Önce finans maliyetini girin";
      chrome.storage.local.remove(['financeCost', 'shippingCost']);
      updatePageConversions();
    }
  });
  
  // RMA/Yol maliyeti değiştiğinde
  shippingCostInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      chrome.storage.local.set({ shippingCost: value });
      updatePageConversions();
    } else {
      chrome.storage.local.remove('shippingCost');
      updatePageConversions();
    }
  });
  
  const extraCostCheckbox = document.getElementById('extra-cost');
  const discountAmountInput = document.getElementById('discount-amount');

  // Ek maliyet checkbox değişikliğini dinle
  extraCostCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    chrome.storage.local.set({ 
      extraCost: isChecked,
      discountAmount: isChecked ? (discountAmountInput.value || 150) : 0
    });
    updatePageConversions();
  });

  // İndirim miktarı değişikliğini dinle
  discountAmountInput.addEventListener('input', (e) => {
    if (extraCostCheckbox.checked) {
      const value = parseFloat(e.target.value);
      chrome.storage.local.set({ 
        discountAmount: value || 150
      });
      updatePageConversions();
    }
  });

  const kdvDiscountCheckbox = document.getElementById('kdv-discount');

  // KDV checkbox değişikliğini dinle
  kdvDiscountCheckbox.addEventListener('change', (e) => {
    chrome.storage.local.set({ 
      kdvAction: e.target.checked ? 'remove' : 'none',
      kdvDiscount: e.target.checked // Geriye dönük uyumluluk için
    });
    updatePageConversions();
  });

  // Percentage operation checkbox event listener - SİTE TİPİNE GÖRE AYRI KAYDETME İŞLEMİ
  if (percentageOperationCheckbox) {
    percentageOperationCheckbox.addEventListener('change', (e) => {
      const isAdd = e.target.checked;
      updateOperationIndicators(isAdd);
      
      // Site tipine göre doğru key'i kullan
      if (isCurrentSiteEuroBased) {
        chrome.storage.local.set({ euroPercentageOperation: isAdd });
      } else {
        chrome.storage.local.set({ tlPercentageOperation: isAdd });
      }
      
      updatePageConversions();
    });
  }

  // Kaydedilmiş değerleri geri yükle
  chrome.storage.local.get(['financeCost', 'shippingCost', 'extraCost', 'kdvDiscount', 'discountAmount'], (result) => {
    if (result.financeCost) {
      financeCostInput.value = result.financeCost;
      shippingCostInput.disabled = false;
      shippingCostInput.placeholder = "Örn: 2.5";
    }
    if (result.shippingCost) {
      shippingCostInput.value = result.shippingCost;
    }
    if (result.extraCost) {
      extraCostCheckbox.checked = result.extraCost;
      if (result.discountAmount) {
        discountAmountInput.value = result.discountAmount;
      }
    }
    if (result.kdvDiscount) {
      kdvDiscountCheckbox.checked = result.kdvDiscount;
    }
  });

  // Aktif domain'i göster
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      currentDomain = domain;
      isCurrentSiteEuroBased = euroBasedDomains.includes(domain);
      
      const domainElement = document.getElementById('currentDomain');
      
      // Euro bazlı siteler için özel düzenleme
      if (isCurrentSiteEuroBased) {
        // Kosatec özel elementlerini göster
        if (kosatecOnlyElements) {
          kosatecOnlyElements.style.display = 'block';
        }

        // Radio butonların text'lerini güncelle
        document.querySelector('label[for="tl-to-usd"]').textContent = 'EUR → USD';
        document.querySelector('label[for="tl-to-eur"]').textContent = 'EUR → TRY';
        document.querySelector('label[for="tl-to-cny"]').textContent = 'EUR → CNY';
        
        // Radio butonların value'larını güncelle
        document.getElementById('tl-to-usd').value = 'usd_from_eur';
        document.getElementById('tl-to-eur').value = 'try_from_eur';
        document.getElementById('tl-to-cny').value = 'cny_from_eur';
        
        // Varsayılan seçimi güncelle
        chrome.storage.local.get('selectedCurrency', (result) => {
          if (!result.selectedCurrency || ['usd', 'eur', 'cny'].includes(result.selectedCurrency)) {
            document.getElementById('tl-to-usd').checked = true;
            chrome.storage.local.set({ selectedCurrency: 'usd_from_eur' });
          } else {
            document.querySelector(`input[value="${result.selectedCurrency}"]`).checked = true;
          }
        });

        // KDV checkbox'ı gizle
        document.querySelector('.checkbox-container.mt-2').style.display = 'none';

        // KDV radio butonları için yeni container oluştur
        const vatRadioContainer = document.createElement('div');
        vatRadioContainer.className = 'radio-group mt-3';
        vatRadioContainer.style.cssText = `
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 15px;
        `;
        vatRadioContainer.innerHTML = `
          <div class="radio-container" style="position: relative;">
            <input type="radio" id="vat-remove" name="vat-action" value="remove" style="display: none;">
            <label for="vat-remove" style="
              padding: 6px 12px;
              border-radius: 20px;
              background-color: #02153D;
              border: 1px solid #4B227A;
              cursor: pointer;
              transition: all 0.2s ease;
              margin: 0;
              font-size: 0.85rem;
              color: #fff;
              display: inline-block;
            ">KDV Düşür</label>
          </div>
          <div class="radio-container" style="position: relative;">
            <input type="radio" id="vat-add" name="vat-action" value="add" style="display: none;">
            <label for="vat-add" style="
              padding: 6px 12px;
              border-radius: 20px;
              background-color: #02153D;
              border: 1px solid #4B227A;
              cursor: pointer;
              transition: all 0.2s ease;
              margin: 0;
              font-size: 0.85rem;
              color: #fff;
              display: inline-block;
            ">KDV Ekle</label>
          </div>
          <div class="radio-container" style="position: relative;">
            <input type="radio" id="vat-none" name="vat-action" value="none" checked style="display: none;">
            <label for="vat-none" style="
              padding: 6px 12px;
              border-radius: 20px;
              background-color: #02153D;
              border: 1px solid #4B227A;
              cursor: pointer;
              transition: all 0.2s ease;
              margin: 0;
              font-size: 0.85rem;
              color: #fff;
              display: inline-block;
            ">KDV Yok</label>
          </div>
        `;

        // Radio container'ı cost-inputs'a ekle
        document.querySelector('.cost-inputs').appendChild(vatRadioContainer);

        // Seçili radio butonun stilini güncelle
        const updateVatRadioStyles = () => {
          document.querySelectorAll('input[name="vat-action"]').forEach(radio => {
            const label = radio.nextElementSibling;
            if (radio.checked) {
              label.style.backgroundColor = '#4B227A';
              label.style.color = '#00EED0';
              label.style.borderColor = '#0197AF';
              label.style.boxShadow = '0 2px 4px rgba(0,123,255,0.2)';
            } else {
              label.style.backgroundColor = '#02153D';
              label.style.color = '#fff';
              label.style.borderColor = '#4B227A';
              label.style.boxShadow = 'none';
            }
          });
        };

        // KDV radio butonları için event listener
        document.querySelectorAll('input[name="vat-action"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            const action = e.target.value;
            chrome.storage.local.set({ 
              kdvAction: action
            });
            updateVatRadioStyles();
            updatePageConversions();
          });
        });

        // Kaydedilmiş KDV ayarını yükle
        chrome.storage.local.get(['kdvAction'], (result) => {
          if (result.kdvAction) {
            document.querySelector(`input[value="${result.kdvAction}"]`).checked = true;
            updateVatRadioStyles();
          }
        });
        
        // EURO BAZLI SİTELER İÇİN PERCENTAGE OPERATION AYARINI YÜKLE
        chrome.storage.local.get(['euroPercentageOperation'], (result) => {
          if (percentageOperationCheckbox) {
            percentageOperationCheckbox.checked = result.euroPercentageOperation === true;
            updateOperationIndicators(result.euroPercentageOperation === true);
          }
        });
      } else {
        // TL BAZLI SİTELER İÇİN PERCENTAGE OPERATION AYARINI YÜKLE
        if (kosatecOnlyElements) {
          kosatecOnlyElements.style.display = 'none';
        }
        
        // TL bazlı siteler için yüzdeleri ekle checkbox'ını her zaman kapat
        // çünkü TL sitelerinde sadece yüzde çıkarma işlemi olabilir
        if (percentageOperationCheckbox) {
          // TL bazlı siteler için yüzdeleri ekle checkbox'ını gizle
          percentageOperationCheckbox.checked = false;
          updateOperationIndicators(false);
          chrome.storage.local.set({ tlPercentageOperation: false });
        }
      }
      
      // Domain destekleniyorsa yeşil, değilse siyah göster
      if (supportedDomains.includes(domain)) {
        domainElement.classList.add('domain-supported');
        domainElement.classList.remove('domain-unsupported');
      } else {
        domainElement.classList.add('domain-unsupported');
        domainElement.classList.remove('domain-supported');
      }
      
      domainElement.textContent = domain;
    }
  });

  // Yenileme butonu için event listener
  document.getElementById('refreshSelectors').addEventListener('click', () => {
    const button = document.getElementById('refreshSelectors');
    button.classList.add('spinning');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        // Sayfayı yeniden taramak için mesaj gönder
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "refreshSelectors"
        }, function(response) {
          // Animasyon bittikten sonra sınıfı kaldır
          setTimeout(() => {
            button.classList.remove('spinning');
            
            // Eğer başarı bildirisi varsa göster
            if (response && response.success) {
              alert('Seçiciler ve fiyat dönüştürmeleri başarıyla yenilendi!');
            }
          }, 500);
        });
      } else {
        // Animasyon bittikten sonra sınıfı kaldır
        setTimeout(() => {
          button.classList.remove('spinning');
        }, 500);
      }
    });
  });

  // XPath Finder Modal özellikleri
  let xpathModal = null;
  let selectedSiteType = "tl"; // Varsayılan olarak TL sitesi

  // Modal oluşturma fonksiyonu
  function createXPathModal() {
    if (xpathModal) return;
    
    // Modal arka planı
    xpathModal = document.createElement('div');
    xpathModal.id = 'xpath-modal';
    xpathModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    // Modal içeriği
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(to bottom, #02153D, #0a1f4d);
      border-radius: 8px;
      width: 90%;
      max-width: 350px;
      padding: 15px;
      box-shadow: 0 4px 16px rgba(0, 238, 208, 0.3);
      border: 1px solid #4B227A;
      color: white;
      overflow: hidden;
    `;
    
    // Domain bilgisi
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        
        const domainHeader = document.createElement('div');
        domainHeader.style.cssText = `
          font-size: 14px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #4B227A;
          display: flex;
          align-items: center;
        `;
        
        const domainIcon = document.createElement('span');
        domainIcon.innerHTML = '🌐';
        domainIcon.style.marginRight = '8px';
        
        const domainText = document.createElement('span');
        domainText.textContent = `Domain: ${domain}`;
        
        domainHeader.appendChild(domainIcon);
        domainHeader.appendChild(domainText);
        modalContent.appendChild(domainHeader);
        
        // XPath giriş alanı ve buton satırı
        const xpathRow = document.createElement('div');
        xpathRow.style.cssText = `
          display: flex;
          flex-direction: column;
          margin-bottom: 15px;
          gap: 10px;
        `;
        
        // Seçici tipi dropdown'u
        const selectorTypeRow = document.createElement('div');
        selectorTypeRow.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        `;
        
        const selectorTypeLabel = document.createElement('span');
        selectorTypeLabel.textContent = 'Seçici Tipi:';
        selectorTypeLabel.style.cssText = `
          font-size: 14px;
          color: #00EED0;
          white-space: nowrap;
        `;
        
        const selectorTypeDropdown = document.createElement('select');
        selectorTypeDropdown.id = 'selector-type-select';
        selectorTypeDropdown.style.cssText = `
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #4B227A;
          background: rgba(2, 21, 61, 0.7);
          color: white;
          font-size: 0.9rem;
        `;
        
        const xpathOption = document.createElement('option');
        xpathOption.value = 'xpath';
        xpathOption.textContent = 'XPath';
        selectorTypeDropdown.appendChild(xpathOption);
        
        const cssOption = document.createElement('option');
        cssOption.value = 'css';
        cssOption.textContent = 'CSS Selector';
        selectorTypeDropdown.appendChild(cssOption);
        
        // Değişken başlık (XPath veya CSS Selector)
        const selectorLabel = document.createElement('label');
        selectorLabel.id = 'selector-type-label';
        selectorLabel.style.cssText = `
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #00EED0;
        `;
        selectorLabel.textContent = 'XPath:'; // Varsayılan değer
        
        // Önce dropdown'u belgeye ekleyelim
        selectorTypeRow.appendChild(selectorTypeLabel);
        selectorTypeRow.appendChild(selectorTypeDropdown);
        xpathRow.appendChild(selectorTypeRow);
        
        // Sonra dropdown'un değerini ve etiketin içeriğini ayarlayalım
        chrome.storage.local.get(['selectedXPath', 'selectedSelectorType'], (result) => {
          if (result.selectedXPath) {
            // Eğer önceden kaydedilmiş tip varsa onu kullan
            if (result.selectedSelectorType) {
              selectorTypeDropdown.value = result.selectedSelectorType;
              selectorLabel.textContent = result.selectedSelectorType === 'xpath' ? 'XPath:' : 'CSS Selector:';
            } 
            // Yoksa içeriğe bakarak belirle
            else if (result.selectedXPath.startsWith('/')) {
              selectorTypeDropdown.value = 'xpath';
              selectorLabel.textContent = 'XPath:';
            } else {
              selectorTypeDropdown.value = 'css';
              selectorLabel.textContent = 'CSS Selector:';
            }
          }
        });
        
        // Dropdown değişikliğini izle
        selectorTypeDropdown.addEventListener('change', (e) => {
          selectorLabel.textContent = e.target.value === 'xpath' ? 'XPath:' : 'CSS Selector:';
        });
        
        // Etiketi ekleyelim
        xpathRow.appendChild(selectorLabel);
        
        const xpathInputContainer = document.createElement('div');
        xpathInputContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        `;
        
        const xpathInput = document.createElement('input');
        xpathInput.id = 'modal-xpath-input';
        xpathInput.type = 'text';
        xpathInput.placeholder = 'Seçici girin veya seçin';
        xpathInput.style.cssText = `
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #4B227A;
          background: rgba(2, 21, 61, 0.7);
          color: white;
          min-width: 0; /* Önemli: flex içinde taşmayı önler */
        `;
        
        // Daha önce kaydedilmiş XPath'i yükle
        chrome.storage.local.get(['selectedXPath', 'selectedSelectorType'], (result) => {
          if (result.selectedXPath) {
            xpathInput.value = result.selectedXPath;
            
            // Seçici tipini dropdown'da belirle
            if (result.selectedSelectorType && selectorTypeDropdown) {
              selectorTypeDropdown.value = result.selectedSelectorType;
              // Label'ı da güncelle
              if (selectorLabel) {
                selectorLabel.textContent = result.selectedSelectorType === 'xpath' ? 'XPath:' : 'CSS Selector:';
              }
            }
          }
        });
        
        const xpathFinderButton = document.createElement('button');
        xpathFinderButton.textContent = 'Seç';
        xpathFinderButton.style.cssText = `
          padding: 8px 12px;
          white-space: nowrap;
          border-radius: 6px;
          border: none;
          background: #4B227A;
          color: #00EED0;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s ease;
          min-width: 60px;
        `;
        
        xpathFinderButton.addEventListener('mouseenter', () => {
          xpathFinderButton.style.background = '#5c2d96';
        });
        
        xpathFinderButton.addEventListener('mouseleave', () => {
          xpathFinderButton.style.background = '#4B227A';
        });
        
        xpathFinderButton.addEventListener('click', () => {
          // Modal'ı kapat
          closeModal();
          
          // XPath Finder'ı başlat
          const button = document.getElementById('addItem');
          button.classList.add('active');
          
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs[0]) {
              showError("Aktif sekme bulunamadı.");
              button.classList.remove('active');
              return;
            }
            
            console.log("XPath Finder aktifleştirme işlemi başlatılıyor...");
            
            // Önce content script'in çalışıp çalışmadığını kontrolü
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "xpathFinderTest"
            }, function(testResponse) {
              if (chrome.runtime.lastError || !testResponse || !testResponse.success) {
                // Content script yanıt vermedi veya çalışmıyor, script'i enjekte etmeyi dene
                console.log("XPath Finder test başarısız, script enjekte ediliyor...");
                
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  files: ['xpathFinder.js']
                }).then(() => {
                  console.log("XPath Finder enjekte edildi, şimdi aktifleştiriliyor...");
                  // Script enjekte edildi, kısa bir bekleme sonrası aktifleştir
                  setTimeout(() => {
                    activateXPathFinder(tabs[0].id, button);
                  }, 200);
                }).catch(err => {
                  console.error("XPath Finder enjeksiyon hatası:", err);
                  showError("XPath Finder başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.");
                  button.classList.remove('active');
                });
              } else {
                // Script çalışıyor, doğrudan aktifleştir
                console.log("XPath Finder testi başarılı, aktifleştiriliyor...");
                activateXPathFinder(tabs[0].id, button);
              }
            });
          });
        });
        
        xpathInputContainer.appendChild(xpathInput);
        xpathInputContainer.appendChild(xpathFinderButton);
        xpathRow.appendChild(xpathInputContainer);
        modalContent.appendChild(xpathRow);
        
        // Site Tipi combobox
        const siteTypeRow = document.createElement('div');
        siteTypeRow.style.cssText = `
          margin-bottom: 15px;
        `;
        
        const siteTypeLabel = document.createElement('label');
        siteTypeLabel.textContent = 'Site Para Birimi:';
        siteTypeLabel.style.cssText = `
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #00EED0;
        `;
        
        const siteTypeSelect = document.createElement('select');
        siteTypeSelect.id = 'site-type-select';
        siteTypeSelect.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #4B227A;
          background: rgba(2, 21, 61, 0.7);
          color: white;
          appearance: auto;
          height: 36px;
        `;
        
        const options = [
          { value: 'tl', text: 'Türk Lirası (TL)' },
          { value: 'euro', text: 'Euro (€)' },
          { value: 'usd', text: 'Dolar ($)' }
        ];
        
        options.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.text;
          siteTypeSelect.appendChild(optionElement);
        });
        
        siteTypeSelect.addEventListener('change', (e) => {
          selectedSiteType = e.target.value;
          chrome.storage.local.set({ selectedSiteType: selectedSiteType });
        });
        
        // Kaydedilmiş site tipini yükle
        chrome.storage.local.get(['selectedSiteType'], (result) => {
          if (result.selectedSiteType) {
            siteTypeSelect.value = result.selectedSiteType;
            selectedSiteType = result.selectedSiteType;
          }
        });
        
        siteTypeRow.appendChild(siteTypeLabel);
        siteTypeRow.appendChild(siteTypeSelect);
        modalContent.appendChild(siteTypeRow);
        
        // Butonlar satırı
        const buttonsRow = document.createElement('div');
        buttonsRow.style.cssText = `
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 5px;
        `;
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'İptal';
        cancelButton.style.cssText = `
          flex: 1;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          background: #555;
          color: white;
          cursor: pointer;
          max-width: 100px;
        `;
        
        cancelButton.addEventListener('click', closeModal);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Kaydet';
        saveButton.style.cssText = `
          flex: 1;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          background: #27ae60;
          color: white;
          cursor: pointer;
          font-weight: bold;
          max-width: 100px;
        `;
        
        saveButton.addEventListener('click', () => {
          const xpathValue = document.getElementById('modal-xpath-input').value.trim();
          if (xpathValue) {
            // Seçici tipini dropdown'dan al
            const selectorTypeDropdown = document.getElementById('selector-type-select');
            const selectorType = selectorTypeDropdown ? selectorTypeDropdown.value : 'xpath';
            
            // Site para birimini dropdown'dan al
            const siteTypeSelect = document.getElementById('site-type-select');
            const currencyType = siteTypeSelect ? siteTypeSelect.value : 'tl';
            
            // Seçici tipinin formatla uyumlu olup olmadığını kontrol et ve uyar
            if (selectorType === 'xpath' && !xpathValue.startsWith('/')) {
              if (!confirm('Seçici XPath olarak belirtilmiş fakat XPath formatında değil (/ ile başlamıyor). Devam etmek istiyor musunuz?')) {
                return;
              }
            }
            
            if (selectorType === 'css' && xpathValue.startsWith('/')) {
              if (!confirm('Seçici CSS Selector olarak belirtilmiş fakat XPath formatında (/ ile başlıyor). Devam etmek istiyor musunuz?')) {
                return;
              }
            }
            
            chrome.storage.local.set({ 
              selectedXPath: xpathValue,
              selectedSelectorType: selectorType,
              selectedSiteType: currencyType
            }, () => {
              console.log("Seçici ve site tipi kaydedildi:", {
                selector: xpathValue, 
                type: selectorType,
                currencyType: currencyType
              });
              
              // Domaini kaydet
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                  const url = new URL(tabs[0].url);
                  const domainToSave = url.hostname;
                  
                  // Domain bilgilerini al ve kaydet
                  chrome.storage.local.get(['savedDomains'], (result) => {
                    let savedDomains = result.savedDomains || [];
                    
                    // Domain zaten var mı kontrol et
                    if (!savedDomains.some(domain => domain.hostname === domainToSave)) {
                      // Yeni domain ekle
                      savedDomains.push({
                        hostname: domainToSave,
                        type: currencyType, // Para birimi (tl, euro, usd)
                        xpath: xpathValue,
                        selectorType: selectorType, // xpath veya css
                        timestamp: new Date().getTime()
                      });
                      
                      // Güncellenmiş listeyi kaydet
                      chrome.storage.local.set({ savedDomains: savedDomains }, () => {
                        console.log(`Domain kaydedildi: ${domainToSave} (${currencyType} bazlı site, seçici: ${xpathValue}, tipi: ${selectorType})`);
                        
                        // Başarı bildirimi göster
                        alert(`Domain başarıyla kaydedildi!\n\nDomain: ${domainToSave}\nPara Birimi: ${currencyType.toUpperCase()}\nSeçici Tipi: ${selectorType.toUpperCase()}\nSeçici: ${xpathValue}\n\nSayfayı yenilediğinizde veya yenile butonuna bastığınızda, bu seçici kullanılarak fiyat dönüştürme işlemi yapılacaktır.`);
                        
                        // Domain adını parlak göster
                        const domainElement = document.getElementById('currentDomain');
                        if (domainElement) {
                          domainElement.style.color = '#00EED0';
                          domainElement.style.fontWeight = 'bold';
                        }
                        
                        // Ekleme butonunu gizle
                        const addItemBtn = document.getElementById('addItem');
                        if (addItemBtn) {
                          addItemBtn.style.display = 'none';
                        }
                      });
                    } else {
                      // Mevcut domain bilgisini güncelle
                      const index = savedDomains.findIndex(domain => domain.hostname === domainToSave);
                      if (index !== -1) {
                        savedDomains[index] = {
                          ...savedDomains[index],
                          type: currencyType,
                          xpath: xpathValue,
                          selectorType: selectorType,
                          timestamp: new Date().getTime()
                        };
                        
                        chrome.storage.local.set({ savedDomains: savedDomains }, () => {
                          console.log(`Domain güncellendi: ${domainToSave} (${currencyType} bazlı site, seçici: ${xpathValue}, tipi: ${selectorType})`);
                          
                          // Başarı bildirimi göster
                          alert(`Domain başarıyla güncellendi!\n\nDomain: ${domainToSave}\nPara Birimi: ${currencyType.toUpperCase()}\nSeçici Tipi: ${selectorType.toUpperCase()}\nSeçici: ${xpathValue}\n\nSayfayı yenilediğinizde veya yenile butonuna bastığınızda, bu seçici kullanılarak fiyat dönüştürme işlemi yapılacaktır.`);
                        });
                      }
                    }
                  });
                }
              });
            });
          }
          closeModal();
        });
        
        buttonsRow.appendChild(cancelButton);
        buttonsRow.appendChild(saveButton);
        modalContent.appendChild(buttonsRow);
      }
    });
    
    xpathModal.appendChild(modalContent);
    document.body.appendChild(xpathModal);
  }

  // Modal'ı kapama fonksiyonu
  function closeModal() {
    if (xpathModal && xpathModal.parentNode) {
      xpathModal.parentNode.removeChild(xpathModal);
      xpathModal = null;
    }
  }

  // Ekleme butonu için event listener - doğrudan XPath Finder çalıştırmak yerine modal açacak
  document.getElementById('addItem').addEventListener('click', () => {
    // Önce bu domainin zaten kayıtlı olup olmadığını kontrol et
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        const currentDomain = url.hostname;
        
        // Varsayılan domainleri kontrol et
        const isDefaultDomain = supportedDomains.includes(currentDomain);
        
        chrome.storage.local.get(['savedDomains'], (result) => {
          const savedDomains = result.savedDomains || [];
          
          // Domain zaten kaydedilmiş mi kontrol et
          const isUserSavedDomain = savedDomains.some(domain => domain.hostname === currentDomain);
          const isDomainSaved = isUserSavedDomain || isDefaultDomain;
          
          if (isDomainSaved) {
            // Domain zaten kayıtlı, kullanıcıyı bilgilendir
            if (isDefaultDomain && !isUserSavedDomain) {
              alert(`${currentDomain} varsayılan olarak tanımlı bir domain! Ayarlar menüsünden görüntüleyebilirsiniz.`);
            } else {
              alert(`${currentDomain} zaten kayıtlı bir domain! Ayarlar menüsünden yönetebilirsiniz.`);
            }
          } else {
            // XPath modalını aç
            createXPathModal();
          }
        });
      }
    });
  });
  
  // XPath Finder'ı aktifleştirme yardımcı fonksiyonu
  function activateXPathFinder(tabId, button) {
    chrome.tabs.sendMessage(tabId, {
      action: "activateXPathFinder"
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("XPath Finder aktifleştirme hatası:", chrome.runtime.lastError);
        showError("XPath Finder başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.");
      } else if (!response || !response.success) {
        console.warn("XPath Finder geçersiz yanıt:", response);
        showError("XPath Finder başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.");
      } else {
        console.log("XPath Finder başarıyla aktifleştirildi:", response);
        // Başarılı aktivasyon durumunda popup'ı kapat
        window.close();
      }
      
      // Her durumda butonun aktif görünümünü kaldır
      button.classList.remove('active');
    });
  }
  
  // Hata mesajı gösterme fonksiyonu
  function showError(message) {
    alert(message);
  }

  // XPath Finder'dan gelen mesajları dinle
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Popup mesaj aldı:", request);
    
    // XPath veya CSS Selector seçildi mesajı
    if (request.action === "selectorSelected" && request.selector) {
      console.log(`Seçilen ${request.selectorType}: ${request.selector}`);
      
      // Seçici tipini belirle
      const actualSelectorType = request.selectorType || (request.selector.startsWith('/') ? 'xpath' : 'css');
      
      // Seçilen değeri ve tipini kaydet
      chrome.storage.local.set({ 
        selectedXPath: request.selector,
        selectedSelectorType: actualSelectorType
      }, () => {
        console.log(`Seçici kaydedildi: ${request.selector} (Tip: ${actualSelectorType})`);
        
        // Modal açıksa ve input alanı varsa değeri güncelle
        const modalInput = document.getElementById('modal-xpath-input');
        if (modalInput) {
          modalInput.value = request.selector;
        }
        
        // Eğer selector tipi dropdown'u varsa güncelle
        const selectorTypeSelect = document.getElementById('selector-type-select');
        if (selectorTypeSelect) {
          selectorTypeSelect.value = actualSelectorType;
          
          // Dropdown değiştiğinde etiketi de güncelle
          const selectorLabelElements = document.querySelectorAll('label');
          let selectorLabel = null;
          
          // Doğru etiketi bul 
          for (const label of selectorLabelElements) {
            if (label.textContent === 'XPath:' || label.textContent === 'CSS Selector:') {
              selectorLabel = label;
              break;
            }
          }
          
          if (selectorLabel) {
            selectorLabel.textContent = actualSelectorType === 'xpath' ? 'XPath:' : 'CSS Selector:';
          }
          
          console.log("Seçici tipi dropdown'u güncellendi:", actualSelectorType);
        }
      });
      
      sendResponse({ success: true, message: `${actualSelectorType.toUpperCase()} seçici alındı ve kaydedildi` });
    }
    
    // XPath Finder kapatıldı mesajı
    else if (request.action === "xpathFinderClosed") {
      console.log("XPath Finder kapatıldı");
      sendResponse({ success: true });
    }
    
    // XPath Finder hazır mesajı
    else if (request.action === "xpathFinderReady") {
      console.log("XPath Finder hazır");
      sendResponse({ success: true });
    }
    
    return true; // Asenkron yanıt için
  });
});

function updatePageConversions() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateConversions"
      });
    }
  });
}

// Ayarlar butonu ve kayıtlı domainlerin yönetimi
document.addEventListener('DOMContentLoaded', () => {
  const settingsButton = document.getElementById('settingsButton');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsModal = document.getElementById('close-settings-modal');
  const savedDomainsContainer = document.getElementById('saved-domains-container');
  
  // Ayarlar butonuna tıklama
  settingsButton.addEventListener('click', () => {
    // Kaydedilmiş domainleri yükle ve göster
    loadSavedDomains();
    settingsModal.style.display = 'flex';
  });
  
  // Ayarlar modalını kapatma
  closeSettingsModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  
  // Modal dışına tıklayarak kapatma
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });
  
  // Kayıtlı domainleri yükle ve göster
  function loadSavedDomains() {
    chrome.storage.local.get(['savedDomains'], (result) => {
      const savedDomains = result.savedDomains || [];
      
      if (savedDomains.length === 0) {
        savedDomainsContainer.innerHTML = `
          <div class="no-domains" style="
            text-align: center;
            padding: 20px;
            color: #999;
            font-style: italic;
          ">Henüz kayıtlı domain yok</div>
        `;
        return;
      }
      
      // Domainleri listele
      let domainsHTML = '';
      savedDomains.forEach(domain => {
        // Varsayılan domain için farklı stil
        const isDefaultDomain = domain.isDefault === true;
        const domainStyle = isDefaultDomain 
          ? 'border: 1px solid #2a5298; background: rgba(2, 21, 61, 0.9);' 
          : 'border: 1px solid #4B227A; background: rgba(2, 21, 61, 0.7);';
        
        // Seçici tipini belirle
        const selectorType = domain.selectorType || (domain.xpath && domain.xpath.startsWith('/') ? 'xpath' : 'css');
        const selectorTypeText = selectorType === 'xpath' ? 'XPath' : 'CSS Selector';
        
        domainsHTML += `
          <div class="saved-domain-item" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            ${domainStyle}
          ">
            <div class="domain-info" style="
              display: flex;
              flex-direction: column;
            ">
              <span class="domain-name" style="
                font-weight: 600;
                color: #00EED0;
                font-size: 0.9rem;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 5px;
              ">
                ${domain.hostname}
                ${isDefaultDomain ? '<span style="color: #ffd700; font-size: 0.7rem; background: rgba(42, 82, 152, 0.8); padding: 2px 4px; border-radius: 3px;">Varsayılan</span>' : ''}
              </span>
              <span class="domain-type" style="
                font-size: 0.8rem;
                color: #aaa;
              ">${domain.type === 'euro' ? '€ Euro Bazlı' : domain.type === 'usd' ? '$ Dolar Bazlı' : '₺ TL Bazlı'}</span>
              ${domain.xpath ? `<span class="domain-xpath" style="
                font-size: 0.75rem;
                color: #88d8bd;
                margin-top: 3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
              " title="${domain.xpath}">${selectorTypeText}: ${domain.xpath}</span>` : ''}
            </div>
            ${isDefaultDomain ? 
              `<div style="
                 color: #00EED0;
                 font-size: 0.75rem;
                 opacity: 0.7;
               ">!</div>` : 
              `<button class="delete-domain-btn" data-domain="${domain.hostname}" style="
                 background: #4B227A;
                 border: none;
                 color: #ff6b6b;
                 border-radius: 4px;
                 padding: 6px 8px;
                 cursor: pointer;
                 font-size: 0.8rem;
                 transition: all 0.2s ease;
               ">Sil</button>`
            }
          </div>
        `;
      });
      
      savedDomainsContainer.innerHTML = domainsHTML;
      
      // Silme butonlarına event listener ekle
      document.querySelectorAll('.delete-domain-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const domainToDelete = e.target.getAttribute('data-domain');
          deleteSavedDomain(domainToDelete);
        });
      });
    });
  }
  
  // Domain silme fonksiyonu
  function deleteSavedDomain(domainToDelete) {
    chrome.storage.local.get(['savedDomains'], (result) => {
      let savedDomains = result.savedDomains || [];
      
      // İlgili domaini filtreleyerek çıkar
      savedDomains = savedDomains.filter(domain => domain.hostname !== domainToDelete);
      
      // Güncellenmiş listeyi kaydet
      chrome.storage.local.set({ savedDomains: savedDomains }, () => {
        // Listeyi yeniden yükle
        loadSavedDomains();
      });
    });
  }
});



