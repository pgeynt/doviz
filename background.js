// background.js
chrome.runtime.onInstalled.addListener(() => {
  updateRates();
  // Verileri her saat güncelle
  setInterval(updateRates, 3600000); // 1 hour = 3600000 ms
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
