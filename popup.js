document.addEventListener('DOMContentLoaded', () => {
  const usdElement = document.getElementById('usdRate');
  const euroElement = document.getElementById('euroRate');
  const eurUsdElement = document.getElementById('eurUsdRate');
  const cnyElement = document.getElementById('cnyRate');
  const percentageOperationCheckbox = document.getElementById('percentage-operation');
  const kosatecOnlyElements = document.querySelector('.kosatec-only');
  const authScreen = document.getElementById('auth-screen');
  const mainContent = document.getElementById('main-content');
  const authForm = document.getElementById('auth-form');
  const authCodeInput = document.getElementById('auth-code');
  const authSubmitButton = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');

  // Kimlik doğrulama kontrolü
  function checkAuthentication() {
    // Kimlik doğrulama kontrolünü bypass et, her zaman ana içeriği göster
    authScreen.style.display = 'none';
    mainContent.style.display = 'block';
  }

  // Erişim kodunu kontrol et
  function verifyAccessCode(code) {
    return new Promise((resolve, reject) => {
      fetch('code.json')
        .then(response => response.json())
        .then(data => {
          const validCode = data.code[0].codepass;
          resolve(code === validCode);
        })
        .catch(error => {
          console.error('Erişim kodu yüklenirken hata oluştu:', error);
          reject(error);
        });
    });
  }

  // Kimlik doğrulama butonu tıklandığında
  authSubmitButton.addEventListener('click', () => {
    const code = authCodeInput.value.trim();
    if (!code) {
      authError.textContent = 'Lütfen bir erişim kodu girin.';
      authError.style.display = 'block';
      return;
    }

    verifyAccessCode(code)
      .then(isValid => {
        if (isValid) {
          // Doğrulama başarılı, oturumu sakla
          chrome.storage.session.set({ authenticated: true }, () => {
            authScreen.style.display = 'none';
            mainContent.style.display = 'block';
          });
        } else {
          // Yanlış kod
          authError.textContent = 'Yanlış erişim kodu. Lütfen tekrar deneyin.';
          authError.style.display = 'block';
          authCodeInput.value = '';
          authCodeInput.focus();
        }
      })
      .catch(error => {
        authError.textContent = 'Doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.';
        authError.style.display = 'block';
        console.error('Doğrulama hatası:', error);
      });
  });

  // Enter tuşu basıldığında form gönderimi
  authCodeInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      authSubmitButton.click();
    }
  });

  // Sayfa yüklendiğinde kimlik doğrulama kontrolü
  checkAuthentication();

  // Domain konfigürasyonlarını yükle
  const supportedDomains = [
    'www.akakce.com',
    'www.amazon.com.tr',
    'www.hepsiburada.com',
    'www.trendyol.com',
    'shop.kosatec.de',
    'www.imcopex.shop',
    'www.siewert-kau.com',
    'www.wave-distribution.de'
  ];

  const euroBasedDomains = ['shop.kosatec.de', 'www.imcopex.shop', 'www.siewert-kau.com', 'www.wave-distribution.de'];
  
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

  // Operasyon göstergelerini güncelle - artık sadece yüzde işlemi için kullanılıyor
  const updateOperationIndicators = (isAdd) => {
    // Artık gösterge elementleri olmadığı için sadece storage'a kaydetme işlemi yapılıyor
    // Bu fonksiyon geriye dönük uyumluluk için korundu
    console.log(`Yüzde işlemi: ${isAdd ? 'Ekleme' : 'Çıkarma'}`);
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

  // İndirim yüzdesi radio butonları için event listener
  document.querySelectorAll('input[name="discount-percentage"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const discountPercentage = parseFloat(e.target.value);
      // Seçilen indirim yüzdesini finans maliyeti olarak kaydet
      chrome.storage.local.set({ financeCost: discountPercentage, shippingCost: 0 });
      updatePageConversions();
    });
  });
  
  // Sayfa yüklendiğinde varsayılan olarak %5 seçili olsun ve satış masrafları 10 olsun
  chrome.storage.local.set({ financeCost: 5, shippingCost: 0, salesCost: 10, salesCostEnabled: false });
  updatePageConversions();
  
  const extraCostCheckbox = document.getElementById('extra-cost');
  const discountAmountInput = document.getElementById('discount-amount');
  const salesCostInput = document.getElementById('sales-cost');
  const salesCostEnabledCheckbox = document.getElementById('sales-cost-enabled');

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
  
  // Satış masrafları değişikliğini dinle
  salesCostInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      chrome.storage.local.set({ salesCost: value });
      updatePageConversions();
    }
  });

  // Satış masrafları checkbox değişikliğini dinle
  salesCostEnabledCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked === true; // Kesin boolean değeri alalım
    console.log('Satış masrafları checkbox değişti, isChecked:', isChecked, 'typeof:', typeof isChecked);
    
    // Önce mevcut değeri kontrol edelim
    chrome.storage.local.get(['salesCostEnabled'], (result) => {
      console.log('Mevcut salesCostEnabled değeri:', result.salesCostEnabled, 'typeof:', typeof result.salesCostEnabled);
      
      // Yeni değeri ayarlayalım
      chrome.storage.local.set({ 
        salesCostEnabled: isChecked // Kesin boolean değeri kullanıyoruz
      }, () => {
        console.log('Satış masrafları checkbox değeri kaydedildi:', isChecked);
        
        // Değişikliği tüm sayfada uygulayalım
        const allSettings = {
          salesCostEnabled: isChecked,
          salesCost: parseFloat(salesCostInput.value) || 10
        };
        
        console.log('Tüm ayarları güncelliyoruz:', allSettings);
        
        // Değişikliği hemen uygulayalım
        updatePageConversions();
      });
    });
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

  // Percentage operation checkbox event listener - TÜM DOMAİNLER İÇİN ORTAK KAYDETME İŞLEMİ
  if (percentageOperationCheckbox) {
    percentageOperationCheckbox.addEventListener('change', (e) => {
      const isAdd = e.target.checked;
      updateOperationIndicators(isAdd);
      
      // Her iki site tipi için de aynı değeri kaydet
      // Böylece kullanıcı ayarı tüm domainlerde korunur
      chrome.storage.local.set({ 
        euroPercentageOperation: isAdd,
        tlPercentageOperation: isAdd,
        percentageOperation: isAdd // Genel bir anahtar da ekleyelim
      });
      
      updatePageConversions();
    });
  }

  // Kaydedilmiş değerleri geri yükle
  chrome.storage.local.get(['financeCost', 'extraCost', 'kdvDiscount', 'discountAmount', 'euroPercentageOperation', 'tlPercentageOperation', 'salesCost', 'salesCostEnabled'], (result) => {
    if (result.financeCost) {
      // İndirim yüzdesi radio butonlarını ayarla
      if (result.financeCost === 10) {
        document.getElementById('discount-10').checked = true;
      } else {
        // Varsayılan olarak veya başka bir değer varsa %5'i seç
        document.getElementById('discount-5').checked = true;
      }
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
    
    // Satış masrafları değerlerini yükle
    if (result.salesCost !== undefined) {
      salesCostInput.value = result.salesCost;
    }
    if (result.salesCostEnabled !== undefined) {
      salesCostEnabledCheckbox.checked = result.salesCostEnabled;
    }
    
    // Percentage operation checkbox durumunu yükle
    if (percentageOperationCheckbox) {
      // Hem Euro hem de TL bazlı siteler için ortak bir değer kullan
      // Eğer herhangi biri true ise, checkbox'ı işaretle
      const isChecked = result.euroPercentageOperation || result.tlPercentageOperation;
      percentageOperationCheckbox.checked = !!isChecked;
      updateOperationIndicators(!!isChecked);
    }
  });


  // Aktif domain'i göster
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      currentDomain = domain;
      
      // Öncelikle user-defined bir domain mi kontrol et
      chrome.storage.local.get(['savedDomains'], (result) => {
        const savedDomains = result.savedDomains || [];
        const userSavedDomain = savedDomains.find(d => d.hostname === domain);
        
        // Kullanıcı tarafından kaydedilmiş bir domain varsa, tipini kontrol et
        if (userSavedDomain) {
          isCurrentSiteEuroBased = userSavedDomain.type === 'euro';
          configureUIForDomainType(isCurrentSiteEuroBased);
        } else {
          // Varsayılan Euro bazlı sitelerden biri mi kontrol et
          isCurrentSiteEuroBased = euroBasedDomains.includes(domain);
          configureUIForDomainType(isCurrentSiteEuroBased);
        }
        
        // Percentage operation checkbox durumunu ayarla
        if (percentageOperationCheckbox) {
          chrome.storage.local.get(['euroPercentageOperation', 'tlPercentageOperation'], (result) => {
            // Her iki değeri de kontrol et ve herhangi biri true ise checkbox'ı işaretle
            // Böylece kullanıcı ayarı tüm domainlerde korunur
            const isChecked = result.euroPercentageOperation || result.tlPercentageOperation;
              
            // Checkbox'ı ayarla
            percentageOperationCheckbox.checked = !!isChecked;
            
            // İşlem göstergelerini güncelle
            updateOperationIndicators(!!isChecked);
          });
        }
        
        // Domainle ilgili diğer UI güncellemeleri
        const domainElement = document.getElementById('currentDomain');
        if (domainElement) {
          domainElement.textContent = domain;
          
          // Kayıtlı domain vurgusu
          if (userSavedDomain || euroBasedDomains.includes(domain)) {
            domainElement.style.color = isCurrentSiteEuroBased ? '#66B2FF' : '#00EED0';
            domainElement.style.fontWeight = 'bold';
          } else {
            domainElement.style.color = '#fff';
            domainElement.style.fontWeight = 'normal';
          }
        }
      });
    }
  });

  // UI'ı domain tipine göre yapılandır (Euro veya TL)
  function configureUIForDomainType(isEuroBased) {
    // Euro bazlı siteler için özel düzenleme
    if (isEuroBased) {
      console.log('Euro bazlı site için UI yapılandırılıyor...');
      
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
        } else if (['usd_from_eur', 'try_from_eur', 'cny_from_eur'].includes(result.selectedCurrency)) {
          document.querySelector(`input[value="${result.selectedCurrency}"]`).checked = true;
        } else {
          // Geçersiz selection durumunda varsayılan ayarla
          document.getElementById('tl-to-usd').checked = true;
          chrome.storage.local.set({ selectedCurrency: 'usd_from_eur' });
        }
      });

      // KDV checkbox'ı gizle
      const kdvContainer = document.querySelector('.checkbox-container.mt-2');
      if (kdvContainer) {
        kdvContainer.style.display = 'none';
      }

      // Euro için özel ayarlar
      document.getElementById('currency-settings-title').textContent = 'Euro Ayarları';
      
      // Percentage operation checkbox label'ını güncelle
      const percentageLabel = document.querySelector('label[for="percentage-operation"]');
      if (percentageLabel) {
        percentageLabel.textContent = 'Yüzde İşlemi (+)';
      }
      
      // Finans/RMA alanları için açıklama metni güncelle
      document.getElementById('finance-label').textContent = 'Komisyon (%)';
      document.getElementById('shipping-label').textContent = 'Kargo (%)';
      
      // Euro bazlı siteler için içerik script'e bilgi gönder
      try {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'updateEuroSettings',
              isEuroBased: true
            }).catch(err => console.warn('İçerik script mesaj hatası:', err));
          }
        });
      } catch (error) {
        console.error('Euro ayarları güncelleme hatası:', error);
      }
    } else {
      console.log('TL bazlı site için UI yapılandırılıyor...');

      // Radio butonların text'lerini varsayılan değerlerine döndür
      document.querySelector('label[for="tl-to-usd"]').textContent = 'TL → USD';
      document.querySelector('label[for="tl-to-eur"]').textContent = 'TL → EUR';
      document.querySelector('label[for="tl-to-cny"]').textContent = 'TL → CNY';
      
      // Radio butonların value'larını varsayılan değerlerine döndür
      document.getElementById('tl-to-usd').value = 'usd';
      document.getElementById('tl-to-eur').value = 'eur';
      document.getElementById('tl-to-cny').value = 'cny';
      
      // Varsayılan seçimi güncelle
      chrome.storage.local.get('selectedCurrency', (result) => {
        if (!result.selectedCurrency || ['usd_from_eur', 'try_from_eur', 'cny_from_eur'].includes(result.selectedCurrency)) {
          document.getElementById('tl-to-usd').checked = true;
          chrome.storage.local.set({ selectedCurrency: 'usd' });
        } else if (['usd', 'eur', 'cny'].includes(result.selectedCurrency)) {
          document.querySelector(`input[value="${result.selectedCurrency}"]`).checked = true;
        } else {
          // Geçersiz selection durumunda varsayılan ayarla
          document.getElementById('tl-to-usd').checked = true;
          chrome.storage.local.set({ selectedCurrency: 'usd' });
        }
      });

      // KDV checkbox'ını göster
      const kdvContainer = document.querySelector('.checkbox-container.mt-2');
      if (kdvContainer) {
        kdvContainer.style.display = 'block';
      }

      // TL için varsayılan ayarlar
      document.getElementById('currency-settings-title').textContent = 'TL Ayarları';
      
      // Percentage operation checkbox label'ını güncelle
      const percentageLabel = document.querySelector('label[for="percentage-operation"]');
      if (percentageLabel) {
        percentageLabel.textContent = 'Yüzdeleri Ekle';
      }
      
      // Finans/RMA alanları için açıklama metni güncelle
      document.getElementById('finance-label').textContent = 'Finans/RMA (%)';
      document.getElementById('shipping-label').textContent = 'Kargo (%)';
      
      // TL bazlı siteler için içerik script'e bilgi gönder
      try {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'updateEuroSettings',
              isEuroBased: false
            }).catch(err => console.warn('İçerik script mesaj hatası:', err));
          }
        });
      } catch (error) {
        console.error('TL ayarları güncelleme hatası:', error);
      }
    }
  }

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
          // Kullanıcıya işlem başladığı bilgisini göster
          showError("XPath Finder başlatılıyor, lütfen bekleyin...");
          
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs[0]) {
              showError("Aktif sekme bulunamadı.");
              return;
            }
            
            console.log("XPath Finder aktifleştirme işlemi başlatılıyor...");
            
            // Doğrudan script enjekte etmeyi dene, her durumda
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['xpathFinder.js']
            })
            .then(() => {
              console.log("XPath Finder enjekte edildi, şimdi CSS ekleniyor...");
              
              // CSS dosyasını da enjekte et
              let cssInjected = false;
              
              chrome.scripting.insertCSS({
                target: { tabId: tabs[0].id },
                files: ['xpathFinder.css']
              })
              .then(() => {
                console.log("XPath Finder CSS enjekte edildi, daha uzun bekleme süresiyle aktifleştiriliyor...");
                cssInjected = true;
              })
              .catch(err => {
                console.error("CSS enjeksiyon hatası:", err);
                console.warn("CSS enjekte edilemedi, ancak XPathFinder'ı yine de çalıştırmayı deneyeceğiz");
              })
              .finally(() => {
                // CSS enjekte edilse de edilmese de XPath Finder'ı çalıştırmayı dene
                // Daha uzun bir bekleme süresi ile aktifleştir
                setTimeout(() => {
                  try {
                    // Aktivasyon fonksiyonu
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: "activateXPathFinder"
                    }, function(response) {
                      if (chrome.runtime.lastError) {
                        console.error("XPath Finder aktifleştirme hatası:", chrome.runtime.lastError);
                        showError("XPath Finder başlatılamadı. Sayfayı yenileyip tekrar deneyin.");
                      } else if (!response || !response.success) {
                        console.warn("XPath Finder geçersiz yanıt:", response);
                        showError("XPath Finder başlatılamadı. Sayfa türü veya içeriği bu işleve izin vermiyor olabilir.");
                      } else {
                        console.log("XPath Finder başarıyla aktifleştirildi:", response);
                        // CSS enjekte edilememişse kullanıcıyı bilgilendir
                        if (!cssInjected) {
                          alert("XPath Finder çalışıyor ancak CSS enjekte edilemedi. Görünümde sorunlar olabilir.");
                        }
                        // Başarılı aktivasyon durumunda popup'ı kapat
                        window.close();
                      }
                    });
                  } catch (error) {
                    console.error("Aktivasyon hatası:", error);
                    showError("XPath Finder aktifleştirilemedi: " + error.message);
                  }
                }, 750); // Bekleme süresini 750ms'ye çıkardık
              });
            })
            .catch(err => {
              console.error("XPath Finder enjeksiyon hatası:", err);
              showError("XPath Finder başlatılamadı. Bu sayfa türüne enjeksiyon yapılamıyor olabilir.");
            });
          });
        });
        
        xpathInputContainer.appendChild(xpathInput);
        xpathInputContainer.appendChild(xpathFinderButton);
        xpathRow.appendChild(xpathInputContainer);
        modalContent.appendChild(xpathRow);
        
        // Para birimi tipi seçimi
        const currencyTypeRow = document.createElement('div');
        currencyTypeRow.style.cssText = `
          display: flex;
          flex-direction: column;
          margin-bottom: 15px;
          gap: 10px;
        `;
        
        const currencyLabel = document.createElement('label');
        currencyLabel.textContent = 'Site Para Birimi:';
        currencyLabel.style.cssText = `
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          color: #00EED0;
        `;
        currencyTypeRow.appendChild(currencyLabel);
        
        const currencySelect = document.createElement('select');
        currencySelect.id = 'site-type-select';
        currencySelect.style.cssText = `
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #4B227A;
          background: rgba(2, 21, 61, 0.7);
          color: white;
          width: 100%;
          font-size: 14px;
          cursor: pointer;
        `;
        
        // Sadece TL ve Euro seçenekleri
        const currencyOptions = [
          { value: 'tl', text: 'Türk Lirası (TL)' },
          { value: 'euro', text: 'Euro (€)' }
        ];
        
        currencyOptions.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.text;
          currencySelect.appendChild(optionElement);
        });
        
        // Seçilen para birimi tipini sakla
        let selectedSiteType = 'tl'; // varsayılan olarak TL
        currencySelect.addEventListener('change', (e) => {
          selectedSiteType = e.target.value;
          console.log('Para birimi tipi seçildi:', selectedSiteType);
          
          // Para birimi seçimine göre dönüşüm seçeneklerini güncelle
          updateCurrencyTypeSelection();
        });
        
        currencyTypeRow.appendChild(currencySelect);
        modalContent.appendChild(currencyTypeRow);
        
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
  
  // XPath Finder'ı aktifleştirme yardımcı fonksiyonu - artık kullanılmıyor, yukarıdaki fonksiyonda doğrudan aktivasyon yapılıyor
  function activateXPathFinder(tabId, button) {
    console.log("Bu fonksiyon artık kullanılmıyor, aktivasyon direkt olarak gerçekleştiriliyor.");
    
    // Geri uyumluluk için mevcut fonksiyon yapısını koru
    try {
      chrome.tabs.sendMessage(tabId, {
        action: "activateXPathFinder"
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error("XPath Finder aktifleştirme hatası:", chrome.runtime.lastError);
          showError("XPath Finder başlatılamadı. Lütfen sayfıyı yenileyin ve tekrar deneyin.");
        } else if (!response || !response.success) {
          console.warn("XPath Finder geçersiz yanıt:", response);
          showError("XPath Finder başlatılamadı. Lütfen sayfıyı yenileyin ve tekrar deneyin.");
        } else {
          console.log("XPath Finder başarıyla aktifleştirildi:", response);
          // Başarılı aktivasyon durumunda popup'ı kapat
          window.close();
        }
        
        // Her durumda butonun aktif görünümünü kaldır
        button.classList.remove('active');
      });
    } catch (error) {
      console.error("Aktivasyon hatası:", error);
      showError("XPath Finder aktifleştirilemedi: " + error.message);
      button.classList.remove('active');
    }
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
  try {
    // Önce güncel tüm ayarları alalım
    chrome.storage.local.get([
      'selectedCurrency', 'financeCost', 'shippingCost', 
      'extraCost', 'kdvAction', 'discountAmount', 
      'euroPercentageOperation', 'tlPercentageOperation',
      'salesCost', 'salesCostEnabled'
    ], (settings) => {
      // Boolean değerleri kesin boolean tipine dönüştürelim
      const cleanSettings = {
        ...settings,
        extraCost: settings.extraCost === true,
        euroPercentageOperation: settings.euroPercentageOperation === true,
        tlPercentageOperation: settings.tlPercentageOperation === true,
        salesCostEnabled: settings.salesCostEnabled === true
      };
      
      // Sayısal değerleri kontrol edelim
      cleanSettings.financeCost = parseFloat(cleanSettings.financeCost) || 0;
      cleanSettings.shippingCost = parseFloat(cleanSettings.shippingCost) || 0;
      cleanSettings.salesCost = parseFloat(cleanSettings.salesCost) || 10;
      cleanSettings.discountAmount = parseFloat(cleanSettings.discountAmount) || 0;
      
      console.log('🔄 Güncel ayarlar (temizlenmiş):', cleanSettings);
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'updateConversions',
            settings: cleanSettings // Temizlenmiş ayarları gönderelim
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('❌ Dönüşüm güncelleme hatası:', chrome.runtime.lastError);
              return;
            }
            
            console.log('✅ Dönüşümler güncellendi, yanıt:', response);
            
            // Ayrıca dinamik ayarlar mesajı da gönder - kullanıcı tanımlı domainler için
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'applyDynamicSettings',
              settings: cleanSettings // Burada da temizlenmiş ayarları gönderelim
            }, (dynamicResponse) => {
              if (chrome.runtime.lastError) {
                console.warn('⚠️ Dinamik ayarlar uygulanamadı:', chrome.runtime.lastError);
                // İlk mesaj başarılı olduğu için hata gösterme
              } else {
                console.log('✅ Dinamik ayarlar uygulandı:', dynamicResponse);
              }
            });
          });
        }
      });
    });
  } catch (error) {
    console.error('❌ PageConversions güncelleme hatası:', error);
  }
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
    // Aktif domaini al
    let currentActiveDomain = '';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        currentActiveDomain = url.hostname;
        
        // Aktif domain belirlendikten sonra domainleri yükle
        loadDomainsList(currentActiveDomain);
      } else {
        // Aktif sekme bulunamadıysa domainleri yükle (tüm düzenleme butonları devre dışı olacak)
        loadDomainsList('');
      }
    });
    
    // Domainleri yükleme ve listeleme alt fonksiyonu
    function loadDomainsList(activeDomain) {
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
          
          // Aktif domain ile şuanki domain eşleşiyor mu kontrol et
          const isActiveDomain = domain.hostname === activeDomain;
          
          // Düzenleme butonu stili - aktif domain değilse devre dışı görünüm
          const editBtnStyle = !isActiveDomain 
            ? `
              background: #7a7a7a;
              opacity: 0.5;
              cursor: not-allowed;
            ` 
            : `
              background: #009688;
              cursor: pointer;
            `;
          
          domainsHTML += `
            <div class="saved-domain-item" style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 10px;
              border-radius: 6px;
              margin-bottom: 6px;
              ${domainStyle}
              ${isActiveDomain ? 'border: 2px solid #00EED0;' : ''}
            ">
              <div class="domain-info" style="
                display: flex;
                flex-direction: column;
                max-width: 200px;
                overflow: hidden;
                flex: 1;
              ">
                <span class="domain-name" style="
                  font-weight: 600;
                  color: ${isActiveDomain ? '#00ff88' : '#00EED0'};
                  font-size: 0.8rem;
                  margin-bottom: 2px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                ">
                  ${domain.hostname} ${isActiveDomain ? '(Aktif)' : ''}
                </span>
                <span class="domain-type" style="
                  font-size: 0.7rem;
                  color: #aaa;
                ">${domain.type === 'euro' ? '€ Euro Bazlı' : domain.type === 'usd' ? '$ Dolar Bazlı' : '₺ TL Bazlı'}</span>
                ${domain.xpath ? `<span class="domain-xpath" style="
                  font-size: 0.65rem;
                  color: #88d8bd;
                  margin-top: 2px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 200px;
                " title="${domain.xpath}">${selectorTypeText}: ${domain.xpath.substring(0, 25)}${domain.xpath.length > 25 ? '...' : ''}</span>` : ''}
              </div>
              <div class="domain-actions" style="
                display: flex; 
                gap: 5px; 
                align-items: center;
                flex-shrink: 0;
                margin-left: 8px;
              ">
                <button class="go-to-site-btn" data-domain="${domain.hostname}" style="
                  background: #FF9800;
                  border: none;
                  color: #000;
                  border-radius: 3px;
                  padding: 4px;
                  width: 26px;
                  height: 26px;
                  cursor: pointer;
                  font-size: 1rem;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">🚪</button>
                ${!isDefaultDomain ? `
                  <button class="edit-domain-btn" data-domain="${domain.hostname}" data-active="${isActiveDomain}" style="
                    border: none;
                    color: #fff;
                    border-radius: 3px;
                    padding: 4px;
                    width: 26px;
                    height: 26px;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    ${editBtnStyle}
                  ">🔧</button>
                  <button class="delete-domain-btn" data-domain="${domain.hostname}" style="
                    background: #4B227A;
                    border: none;
                    color: #ff6b6b;
                    border-radius: 3px;
                    padding: 4px;
                    width: 26px;
                    height: 26px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">🗑️</button>
                ` : ``}
              </div>
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
        
        // Siteye git butonlarına event listener ekle
        document.querySelectorAll('.go-to-site-btn').forEach(button => {
          button.addEventListener('click', (e) => {
            const domain = e.target.getAttribute('data-domain');
            // Domaine protokol ekleme
            const url = `https://${domain}`;
            // Yeni sekmede aç
            chrome.tabs.create({ url: url });
          });
        });
  
        // Düzenleme butonlarına event listener ekle - sadece aktif domain için çalışacak
        document.querySelectorAll('.edit-domain-btn').forEach(button => {
          const isActiveButton = button.getAttribute('data-active') === 'true';
          
          if (isActiveButton) {
            button.addEventListener('click', (e) => {
              const domainToEdit = e.target.getAttribute('data-domain');
              editSavedDomain(domainToEdit);
            });
          } else {
            // Aktif olmayan domain düğmelerine tıklandığında uyarı göster
            button.addEventListener('click', (e) => {
              alert('Bu domain düzenlemesi için, önce ilgili domain sayfasına gitmelisiniz.');
            });
          }
        });
      });
    }
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

  // Domain düzenleme fonksiyonu
  function editSavedDomain(domainToEdit) {
    chrome.storage.local.get(['savedDomains'], (result) => {
      const savedDomains = result.savedDomains || [];
      const domainData = savedDomains.find(domain => domain.hostname === domainToEdit);
      
      if (!domainData) {
        showError('Düzenlenecek domain bulunamadı!');
        return;
      }
      
      // Ayarlar modalını gizle
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.style.display = 'none';
      }
      
      // Mevcut düzenleme modalı varsa kaldır
      const existingModal = document.getElementById('edit-domain-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Düzenleme modalı oluştur (HTML içeriği değişmedi)
      const modalHTML = `
        <div id="edit-domain-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
        ">
          <div class="modal-content" style="
            background: linear-gradient(to bottom, #02153D, #0a1f4d);
            border-radius: 8px;
            width: 90%;
            max-width: 350px;
            padding: 15px;
            box-shadow: 0 4px 16px rgba(0, 238, 208, 0.3);
            border: 1px solid #4B227A;
            color: white;
            overflow: hidden;
          ">
            <div class="modal-header" style="
              font-size: 14px;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px solid #4B227A;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 8px;">🌐</span>
                <span style="color: #00EED0; font-weight: 600;">${domainToEdit}</span>
              </div>
              <button id="close-edit-modal" style="
                background: none;
                border: none;
                color: #fff;
                font-size: 1.2rem;
                cursor: pointer;
              ">✕</button>
            </div>
            
            <div class="modal-body">
              <!-- Seçici tipi dropdown'u -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
              ">
                <span style="
                  font-size: 14px;
                  color: #00EED0;
                  white-space: nowrap;
                ">Selector Tipi:</span>
                <select id="edit-selector-type" style="
                  padding: 4px 8px;
                  border-radius: 4px;
                  border: 1px solid #4B227A;
                  background: rgba(2, 21, 61, 0.7);
                  color: white;
                  font-size: 0.9rem;
                ">
                  <option value="xpath" ${domainData.selectorType === 'xpath' || domainData.xpath.startsWith('/') ? 'selected' : ''}>XPath</option>
                  <option value="css" ${domainData.selectorType === 'css' || !domainData.xpath.startsWith('/') ? 'selected' : ''}>CSS Selector</option>
                </select>
              </div>
              
              <!-- Selector etiketi -->
              <label id="edit-selector-label" style="
                display: block;
                margin-bottom: 5px;
                font-size: 14px;
                color: #00EED0;
              ">${domainData.selectorType === 'css' || !domainData.xpath.startsWith('/') ? 'CSS Selector:' : 'XPath:'}</label>
              
              <!-- Selector input ve seç butonu -->
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                margin-bottom: 15px;
              ">
                <input type="text" id="edit-selector" value="${domainData.xpath}" style="
                  flex: 1;
                  padding: 8px 12px;
                  border-radius: 6px;
                  border: 1px solid #4B227A;
                  background: rgba(2, 21, 61, 0.7);
                  color: white;
                  min-width: 0;
                ">
                <button id="run-xpath-finder" style="
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
                ">Seç</button>
              </div>
              
              <!-- Para birimi seçimi -->
              <div style="
                margin-bottom: 15px;
              ">
                <label style="
                  display: block;
                  margin-bottom: 5px;
                  font-size: 14px;
                  color: #00EED0;
                ">Site Para Birimi:</label>
                <select id="edit-site-type-select" style="
                  padding: 8px 12px;
                  border-radius: 6px;
                  border: 1px solid #4B227A;
                  background: rgba(2, 21, 61, 0.7);
                  color: white;
                  width: 100%;
                  font-size: 14px;
                  cursor: pointer;
                ">
                  <option value="tl" ${domainData.type === 'tl' ? 'selected' : ''}>Türk Lirası (TL)</option>
                  <option value="euro" ${domainData.type === 'euro' ? 'selected' : ''}>Euro (€)</option>
                </select>
              </div>
            </div>
            
            <!-- Butonlar -->
            <div style="
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin-top: 5px;
            ">
              <button id="cancel-edit" style="
                flex: 1;
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                background: #555;
                color: white;
                cursor: pointer;
                max-width: 100px;
              ">İptal</button>
              <button id="save-edit" style="
                flex: 1;
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                background: #27ae60;
                color: white;
                cursor: pointer;
                font-weight: bold;
                max-width: 100px;
              ">Kaydet</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Modal kapatma fonksiyonu - yerel olarak tanımlıyoruz
      function closeEditModal() {
        const modal = document.getElementById('edit-domain-modal');
        if (modal) {
          modal.remove();
        }
        
        // Düzenleme modülü kapandığında ayarlar modülünü tekrar göster
        if (settingsModal) {
          settingsModal.style.display = 'flex';
        }
      }
      
      // Hover efekti için event listener'lar
      const xpathFinderButton = document.getElementById('run-xpath-finder');
      xpathFinderButton.addEventListener('mouseenter', () => {
        xpathFinderButton.style.background = '#5c2d96';
      });
      
      xpathFinderButton.addEventListener('mouseleave', () => {
        xpathFinderButton.style.background = '#4B227A';
      });
      
      // Selector tipi değiştiğinde etiketi güncelle
      document.getElementById('edit-selector-type').addEventListener('change', (e) => {
        const label = document.getElementById('edit-selector-label');
        label.textContent = e.target.value === 'xpath' ? 'XPath:' : 'CSS Selector:';
      });
      
      // Modal kapama için event listener
      document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
      document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
      
      // Kaydet butonuna event listener ekle
      document.getElementById('save-edit').addEventListener('click', function() {
        console.log("Kaydet butonu tıklandı");
        
        // Düzenlenen değerleri al
        const selectorType = document.getElementById('edit-selector-type').value;
        const selectorValue = document.getElementById('edit-selector').value.trim();
        const siteType = document.getElementById('edit-site-type-select').value;
        
        if (!selectorValue) {
          alert("Lütfen bir seçici değeri girin!");
          return;
        }
        
        // Domaini güncelle
        chrome.storage.local.get(['savedDomains'], (result) => {
          let savedDomains = result.savedDomains || [];
          const index = savedDomains.findIndex(domain => domain.hostname === domainToEdit);
          
          if (index !== -1) {
            // Mevcut domain bilgilerini güncelle
            savedDomains[index] = {
              ...savedDomains[index],
              type: siteType,
              xpath: selectorValue,
              selectorType: selectorType,
              timestamp: new Date().getTime()
            };
            
            // Güncellenmiş listeyi kaydet
            chrome.storage.local.set({ savedDomains: savedDomains }, () => {
              console.log(`Domain güncellendi: ${domainToEdit} (${siteType} bazlı site, seçici: ${selectorValue}, tipi: ${selectorType})`);
              
              // Başarı bildirimi göster
              alert(`Domain başarıyla güncellendi!\n\nDomain: ${domainToEdit}\nPara Birimi: ${siteType.toUpperCase()}\nSeçici Tipi: ${selectorType.toUpperCase()}\nSeçici: ${selectorValue}`);
              
              // Modalı kapat
              closeEditModal();
              
              // Ayarlar listesini yenile
              loadSavedDomains();
            });
          } else {
            alert("Düzenlenecek domain bulunamadı!");
          }
        });
      });
      
      // XPath Finder butonuna event listener ekle
      const runXPathButton = document.getElementById('run-xpath-finder');
      
      if (runXPathButton) {
        console.log("Xpath Finder butonu bulundu, event listener ekleniyor");
        runXPathButton.addEventListener('click', function() {
          console.log("XPath Finder butonu tıklandı");
          
          // Yerel hata gösterme fonksiyonu
          const displayError = function(message) {
            alert(message);
          };
          
          // XPath Finder'ı başlat
          // Kullanıcıya işlem başladığı bilgisini göster
          displayError("XPath Finder başlatılıyor, lütfen bekleyin...");
          
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs[0]) {
              displayError("Aktif sekme bulunamadı.");
          return;
        }
        
            console.log("XPath Finder aktifleştirme işlemi başlatılıyor...", tabs[0].id);
            
            // Doğrudan script enjekte etmeyi dene, her durumda
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['xpathFinder.js']
            })
            .then(() => {
              console.log("XPath Finder enjekte edildi, şimdi CSS ekleniyor...");
              
              // CSS dosyasını da enjekte et
              let cssInjected = false;
              
              chrome.scripting.insertCSS({
                target: { tabId: tabs[0].id },
                files: ['xpathFinder.css']
              })
              .then(() => {
                console.log("XPath Finder CSS enjekte edildi, daha uzun bekleme süresiyle aktifleştiriliyor...");
                cssInjected = true;
              })
              .catch(err => {
                console.error("CSS enjeksiyon hatası:", err);
                console.warn("CSS enjekte edilemedi, ancak XPathFinder'ı yine de çalıştırmayı deneyeceğiz");
              })
              .finally(() => {
                // CSS enjekte edilse de edilmese de XPath Finder'ı çalıştırmayı dene
                // Daha uzun bir bekleme süresi ile aktifleştir
                setTimeout(() => {
                  try {
                    // Aktivasyon fonksiyonu
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: "activateXPathFinder"
                    }, function(response) {
                      if (chrome.runtime.lastError) {
                        console.error("XPath Finder aktifleştirme hatası:", chrome.runtime.lastError);
                        displayError("XPath Finder başlatılamadı. Sayfayı yenileyip tekrar deneyin.");
                      } else if (!response || !response.success) {
                        console.warn("XPath Finder geçersiz yanıt:", response);
                        displayError("XPath Finder başlatılamadı. Sayfa türü veya içeriği bu işleve izin vermiyor olabilir.");
                      } else {
                        console.log("XPath Finder başarıyla aktifleştirildi:", response);
                        // CSS enjekte edilememişse kullanıcıyı bilgilendir
                        if (!cssInjected) {
                          alert("XPath Finder çalışıyor ancak CSS enjekte edilemedi. Görünümde sorunlar olabilir.");
                        }
                        // Modal'ı kapat
                        closeEditModal();
                      }
                    });
                  } catch (error) {
                    console.error("Aktivasyon sırasında hata:", error);
                    displayError("XPath Finder aktivasyonu sırasında bir hata oluştu.");
                  }
                }, 1500); // daha uzun bekleme süresi (1.5 saniye)
              });
            })
            .catch(err => {
              console.error("XPath Finder enjeksiyon hatası:", err);
              displayError("XPath Finder yüklenemedi: " + err.message);
            });
          });
        });
      } else {
        console.error("XPath Finder butonu bulunamadı");
      }
    });
  }
});

// Para birimi tipi seçimi güncellendiğinde
function updateCurrencyTypeSelection() {
  const siteTypeSelect = document.getElementById('site-type-select');
  if (!siteTypeSelect) return;
  
  // Seçilen para birimi tipine göre radio butonlarını güncelle
  siteTypeSelect.addEventListener('change', (e) => {
    selectedSiteType = e.target.value;
    
    // Currency selection radio labellarını güncelle
    if (selectedSiteType === 'euro') {
      // Euro bazlı site
      document.querySelector('label[for="tl-to-usd"]').textContent = 'EUR → TRY';
      document.querySelector('label[for="tl-to-eur"]').textContent = 'EUR → TRY (KDV Hariç)';
      
      // Radio butonların value'larını güncelle
      document.getElementById('tl-to-usd').value = 'try_from_eur';
      document.getElementById('tl-to-eur').value = 'try_from_eur_no_vat';
      
      // Varsayılan seçimi güncelle
      document.getElementById('tl-to-usd').checked = true;
      
      // CNY seçeneğini gizle
      const cnyOption = document.querySelector('label[for="tl-to-cny"]').parentElement;
      if (cnyOption) cnyOption.style.display = 'none';
    } else {
      // TL bazlı site (varsayılan)
      document.querySelector('label[for="tl-to-usd"]').textContent = 'TL → EUR';
      document.querySelector('label[for="tl-to-eur"]').textContent = 'TL → EUR (KDV Hariç)';
      
      // Radio butonların value'larını güncelle
      document.getElementById('tl-to-usd').value = 'eur';
      document.getElementById('tl-to-eur').value = 'eur_no_vat';
      
      // Varsayılan seçimi güncelle
      document.getElementById('tl-to-usd').checked = true;
      
      // CNY seçeneğini gizle
      const cnyOption = document.querySelector('label[for="tl-to-cny"]').parentElement;
      if (cnyOption) cnyOption.style.display = 'none';
    }
    
    // Seçimi storage'a kaydet
    chrome.storage.local.set({ 
      selectedCurrency: document.querySelector('input[name="conversion"]:checked').value,
      selectedSiteType: selectedSiteType
    });
  });
}

// XPath Finder butonu için event listener
document.getElementById('xpath-finder').addEventListener('click', () => {
  try {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        
        // XPath Finder'ı inject et
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['xpathFinder.js']
        })
        .then(() => {
          console.log('XPath Finder başarıyla inject edildi');
          
          // XPath Finder CSS'i inject et
          chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['xpathFinder.css']
          })
          .then(() => {
            console.log('XPath Finder CSS başarıyla inject edildi');
            
            // XPath Finder'ı başlat
            chrome.tabs.sendMessage(tabId, { 
              action: 'startXPathFinder'
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('XPath Finder başlatma hatası:', chrome.runtime.lastError);
                return;
              }
              console.log('XPath Finder başlatıldı:', response);
            }).catch(err => {
              console.error('XPath Finder CSS inject hatası:', err);
              // CSS enjeksiyonu başarısız olsa bile devam et
              chrome.tabs.sendMessage(tabId, { 
                action: 'startXPathFinder'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('XPath Finder başlatma hatası:', chrome.runtime.lastError);
                  return;
                }
                console.log('XPath Finder başlatıldı (CSS olmadan):', response);
              });
            });
          }).catch(err => {
            console.error('XPath Finder inject hatası:', err);
          });
        }).catch(err => {
          console.error('XPath Finder inject hatası:', err);
        });
      }
    });
  } catch (error) {
    console.error('XPath Finder başlatma hatası:', error);
  }
});

// XPath Finder butonu için geliştirilmiş kod - içerik scriptlerini enjekte eder ve başlatır
function startXPathFinder(tabId) {
  console.log("XPath Finder başlatma işlemi başlatılıyor...");
  
  // İşlem başladığını göster
  showError("XPath Finder başlatılıyor, lütfen bekleyin...");
  
  // Önce içerik scriptinin yüklenip yüklenmediğini kontrol et
  chrome.tabs.sendMessage(tabId, { action: "xpathFinderTest" }, function(response) {
    if (chrome.runtime.lastError || !response) {
      console.log("XPath Finder yüklü değil, enjekte ediliyor...");
      injectAndActivateXPathFinder(tabId);
    } else {
      console.log("XPath Finder zaten yüklü, doğrudan aktifleştiriliyor...");
      activateExistingXPathFinder(tabId);
    }
  });
}

// XPath Finder'ı enjekte et ve aktifleştir
function injectAndActivateXPathFinder(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['xpathFinder.js']
  })
  .then(() => {
    console.log("XPath Finder JS başarıyla enjekte edildi");
    
    return chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['xpathFinder.css']
    })
    .then(() => {
      console.log("XPath Finder CSS başarıyla enjekte edildi");
      
      // Enjeksiyon işlemleri bittikten sonra biraz bekle ve aktifleştir
      setTimeout(() => {
        activateExistingXPathFinder(tabId);
      }, 1000);
    })
    .catch(err => {
      console.warn("CSS yüklenemedi, yine de XPath Finder'ı çalıştırmayı deneyeceğiz:", err);
      setTimeout(() => {
        activateExistingXPathFinder(tabId);
      }, 1000);
    });
  })
  .catch(err => {
    console.error("XPath Finder enjeksiyon hatası:", err);
    showError("XPath Finder yüklenemedi. Bu sayfa türüne enjeksiyon yapılamıyor olabilir.");
  });
}

// Mevcut XPath Finder'ı aktifleştir - yeniden deneme mekanizmalı
function activateExistingXPathFinder(tabId, attempt = 1) {
  if (attempt > 3) {
    showError("XPath Finder aktivasyonu başarısız oldu - maksimum deneme sayısına ulaşıldı.");
    return;
  }
  
  console.log(`XPath Finder aktifleştirme denemesi #${attempt}...`);
  
  try {
    chrome.tabs.sendMessage(tabId, {
      action: "activateXPathFinder"
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Aktivasyon hatası:", chrome.runtime.lastError);
        
        // Bir sonraki denemeyi zamanla
        setTimeout(() => {
          activateExistingXPathFinder(tabId, attempt + 1);
        }, 1000);
        
      } else if (!response || !response.success) {
        console.warn("Aktivasyon başarısız:", response);
        
        // Bir sonraki denemeyi zamanla
        setTimeout(() => {
          activateExistingXPathFinder(tabId, attempt + 1);
        }, 1000);
        
      } else {
        // Aktivasyon başarılı
        console.log("XPath Finder başarıyla aktifleştirildi:", response);
        
        // Aktivasyon başarılı olduğunda popup'ı kapat
        closeModal();
        setTimeout(() => {
          window.close();
        }, 500);
      }
    });
  } catch (error) {
    console.error("Aktivasyon hatası:", error);
    
    if (attempt < 3) {
      setTimeout(() => {
        activateExistingXPathFinder(tabId, attempt + 1);
      }, 1000);
    } else {
      showError("XPath Finder aktifleştirilemedi: " + error.message);
    }
  }
}

// Modalda XPath Finder başlatma kodu
xpathFinderButton.addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      showError("Aktif sekme bulunamadı.");
      return;
    }
    
    // XPath Finder başlat (modal hemen kapatılmaz)
    startXPathFinder(tabs[0].id);
  });
});

function injectXPathFinder(tabId) {
  // Önce JS dosyasını enjekte et
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['xpathFinder.js']
  })
  .then(() => {
    console.log("XPath Finder JS başarıyla enjekte edildi");
    
    // Sonra CSS enjekte et
    return chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['xpathFinder.css']
    });
  })
  .then(() => {
    console.log("XPath Finder CSS başarıyla enjekte edildi");
    
    // Şimdi modal'ı kapatabiliriz - CSS yüklemesi başarılı
              closeEditModal();
              
    // Script ve CSS başarıyla yüklendi, şimdi biraz bekleyip aktivasyonu dene
    setTimeout(() => {
      activateXPathFinderWithRetry(tabId);
    }, 1500); // 1.5 saniye bekle - bu kritik; içerik scriptinin tamamen yüklenmesini sağlar
  })
  .catch(err => {
    console.error("Enjeksiyon hatası:", err);
    
    // Hata durumunu kontrol et
    if (err.message && err.message.includes("Cannot access")) {
      showError("Bu sayfaya erişim izni yok. Lütfen uzantı izinlerini kontrol edin.");
    } else {
      showError("XPath Finder yüklenemedi: " + err.message);
    }
  });
}

// Yeniden deneme mekanizması ile XPath Finder'ı aktifleştir
function activateXPathFinderWithRetry(tabId, attempt = 1) {
  console.log(`XPath Finder aktifleştirme denemesi #${attempt}...`);
  
  if (attempt > 3) {
    showError("XPath Finder başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
    return;
  }
  
  try {
    // İlk olarak, content script'in yüklenmiş olup olmadığını kontrol edelim
    chrome.tabs.sendMessage(tabId, { action: "xpathFinderTest" }, function(testResponse) {
      console.log("Test mesajı yanıtı:", testResponse);
      
      if (chrome.runtime.lastError) {
        console.error("Test hatası:", chrome.runtime.lastError);
        
        // Content script yüklenmemiş, tekrar inject edelim
        if (attempt < 3) {
          console.log("Content script bulunamadı, yeniden yükleniyor...");
          
          // XPath Finder'ı yeniden enjekte et
          setTimeout(() => {
            injectXPathFinder(tabId);
          }, 500);
          return;
        }
      }
      
      // Content script yüklenmiş, aktive edelim
      chrome.tabs.sendMessage(tabId, {
        action: "activateXPathFinder"
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Aktivasyon hatası (deneme #" + attempt + "):", chrome.runtime.lastError);
          
          // Hata durumunda tekrar dene
          setTimeout(() => {
            activateXPathFinderWithRetry(tabId, attempt + 1);
          }, 1000);
          
        } else if (!response || !response.success) {
          console.warn("Geçersiz yanıt (deneme #" + attempt + "):", response);
          
          // Geçersiz yanıt durumunda tekrar dene
          setTimeout(() => {
            activateXPathFinderWithRetry(tabId, attempt + 1);
          }, 1000);
          
          } else {
          // Başarılı aktivasyon
          console.log("XPath Finder başarıyla aktifleştirildi:", response);
          
          // Popup'ı kapat
          setTimeout(() => {
            window.close();
          }, 500);
          }
        });
      });
  } catch (error) {
    console.error("Aktivasyon fonksiyonu hatası:", error);
    
    if (attempt < 3) {
      setTimeout(() => {
        activateXPathFinderWithRetry(tabId, attempt + 1);
      }, 1000);
    } else {
      showError("XPath Finder aktifleştirilemedi: " + error.message);
    }
  }
}



