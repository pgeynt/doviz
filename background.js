// background.js
chrome.runtime.onInstalled.addListener(() => {
  updateRates();
  // Verileri her saat güncelle
  setInterval(updateRates, 3600000); // 1 hour = 3600000 ms
  
  // Eklenti yüklendiğinde oturum durumunu otomatik olarak doğrulanmış yap
  chrome.storage.session.set({ authenticated: true });
});

// Tarayıcı başlangıcında oturum durumunu otomatik olarak doğrulanmış yap
chrome.runtime.onStartup.addListener(() => {
  // Tarayıcı başladığında kimlik doğrulama durumunu otomatik olarak doğrulanmış yap
  chrome.storage.session.set({ authenticated: true }, () => {
    console.log('Tarayıcı başlangıcında kimlik doğrulama durumu otomatik olarak doğrulanmış yapıldı.');
  });
});

// XPath Finder ve popup.js arasındaki mesaj iletişimi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type && request.rate !== undefined) {
    // Veriyi chrome.storage'e kaydet
    const data = {};
    data[request.type] = request.rate;
    
    chrome.storage.local.set(data, () => {
      console.log(`${request.type.toUpperCase()} rate saved:`, request.rate);
    });
  }
  
  // Domain kaydetme işlemi
  if (request.action === "saveDomain" && request.domain) {
    console.log("Yeni domain kaydediliyor:", request.domain);
    
    // Domain'i storage'a kaydet
    chrome.storage.local.get(['savedDomains'], (result) => {
      const savedDomains = result.savedDomains || [];
      
      // Eğer domain zaten kaydedilmişse güncelle, yoksa ekle
      const existingIndex = savedDomains.findIndex(d => d.hostname === request.domain.hostname);
      
      if (existingIndex > -1) {
        savedDomains[existingIndex] = {
          ...savedDomains[existingIndex],
          ...request.domain,
          timestamp: new Date().getTime()
        };
      } else {
        savedDomains.push({
          ...request.domain,
          timestamp: new Date().getTime()
        });
      }
      
      chrome.storage.local.set({ savedDomains: savedDomains }, () => {
        console.log("Domain başarıyla kaydedildi:", request.domain);
        sendResponse({ success: true, message: "Domain başarıyla kaydedildi" });
      });
    });
    
    return true; // Asenkron yanıt için true döndür
  }
  
  // XPath Finder mesajlarını işle
  if (request.action === "xpathSelected" || request.action === "xpathFinderClosed" || request.action === "xpathFinderReady") {
    console.log("Background script mesaj aldı:", request.action, request);
    
    // Content script'ten gelen mesajı popup'a ilet
    try {
      chrome.runtime.sendMessage(request, (response) => {
        if (chrome.runtime.lastError) {
          // Popup açık değilse hata almamak için
          console.log("Mesaj iletilemedi (muhtemelen popup açık değil):", chrome.runtime.lastError.message);
          // XPath seçildiyse storage'a kaydet
          if (request.action === "xpathSelected" && request.xpath) {
            chrome.storage.local.set({ selectedXPath: request.xpath }, () => {
              console.log("XPath background tarafından kaydedildi:", request.xpath);
            });
          }
        } else {
          console.log("Mesaj başarıyla iletildi, yanıt:", response);
        }
      });
    } catch (error) {
      console.error("Mesaj iletim hatası:", error);
      // Hata durumunda XPath'i yine de kaydetmeye çalış
      if (request.action === "xpathSelected" && request.xpath) {
        chrome.storage.local.set({ selectedXPath: request.xpath }, () => {
          console.log("Hata sonrası XPath kaydedildi:", request.xpath);
        });
      }
    }
  }
  
  // Mesajı aldığımızı bildirmek için true döndür (asenkron işlem için)
  return true;
});

// Domain değişikliklerini izle
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Kaydedilmiş domainleri kontrol et
      chrome.storage.local.get(['savedDomains'], (result) => {
        const savedDomains = result.savedDomains || [];
        const matchedDomain = savedDomains.find(d => d.hostname === domain);
        
        if (matchedDomain) {
          console.log(`Tab yüklemesi tamamlandı, kaydedilmiş domain algılandı: ${domain}`);
          
          // Content scriptleri yükle
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [
              'utils/currency.js',
              'utils/domainHandler.js',
              'utils/priceDisplay.js',
              'utils/observer.js',
              'utils/htmlRenderer.js',
              'domains/akakce.js',
              'domains/amazon.js',
              'domains/hepsiburada.js',
              'domains/trendyol.js',
              'domains/kosatec.js',
              'domains/imcopex.js',
              'domains/siewert-kau.js',
              'domainConfigs.js',
              'content.js'
            ]
          }).then(() => {
            console.log(`Content scriptler ${domain} için yüklendi`);
            
            // Content scripte kaydedilmiş selektörleri kontrol etmesini söyle
            chrome.tabs.sendMessage(tabId, { 
              action: 'refreshSelectors'
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Mesaj gönderme hatası:', chrome.runtime.lastError);
                return;
              }
              console.log('Seçici yenileme yanıtı:', response);
            });
          }).catch(err => {
            console.error(`Content script yükleme hatası:`, err);
          });
        }
      });
    } catch (error) {
      console.error('URL işleme hatası:', error);
    }
  }
});

function updateRates() {
  // Dolar kuru için
  chrome.tabs.create({
    url: 'https://kur.doviz.com/serbest-piyasa/amerikan-dolari',
    active: false
  }, (tab) => {
    handleTabUpdate(tab.id);
  });

  // Euro kuru için
  chrome.tabs.create({
    url: 'https://kur.doviz.com/serbest-piyasa/euro',
    active: false
  }, (tab) => {
    handleTabUpdate(tab.id);
  });

  // EUR/USD paritesi için
  chrome.tabs.create({
    url: 'https://www.doviz.com/pariteler/eur-usd',
    active: false
  }, (tab) => {
    handleTabUpdate(tab.id);
  });

  // Çin Yuanı için
  chrome.tabs.create({
    url: 'https://kur.doviz.com/serbest-piyasa/cin-yuani',
    active: false
  }, (tab) => {
    handleTabUpdate(tab.id);
  });
}

function handleTabUpdate(tabId) {
  chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
    if (info.status === 'complete' && updatedTabId === tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          'domains/akakce.js',
          'domains/amazon.js',
          'domains/hepsiburada.js',
          'domains/trendyol.js',
          'domains/kosatec.js',
          'domains/imcopex.js',
          'domains/siewert-kau.js',
          'domainConfigs.js',
          'content.js'
        ]
      });
      chrome.tabs.onUpdated.removeListener(listener);
      // Tab'ı kapat
      chrome.tabs.remove(tabId);
    }
  });
}
