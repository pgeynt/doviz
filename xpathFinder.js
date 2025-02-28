// XPath Finder başlangıç bilgisi
console.log("XPath Finder content script yüklendi");

// Evrensel değişkenler
let finderActive = false;
let finderBar = null;
let activeElement = null;

// XPath oluşturma fonksiyonu
function getElementXPath(element) {
  if (!element) return '';
  
  // Attribute bazlı XPath oluştur
  const xpath = getElementXPathWithAttributes(element);
  
  // XPath'in daima / ile başladığından emin ol
  if (xpath && !xpath.startsWith('/')) {
    return '/' + xpath;
  }
  
  return xpath;
}

// Attribute bazlı XPath oluşturma
function getElementXPathWithAttributes(element) {
  if (!element) return '';
  if (element.id !== '') {
    return `//*[@id="${element.id}"]`;
  }
  
  // Element'in ebeveynleri
  const parents = [];
  let currentElement = element;
  
  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && currentElement !== document.body) {
    // Optimize edilmiş XPath için attribute kullan
    let currentPath = currentElement.tagName.toLowerCase();
    
    // Sınıf kullan (eğer varsa)
    if (currentElement.className && typeof currentElement.className === 'string' && currentElement.className.trim()) {
      const classes = currentElement.className.trim().split(/\s+/);
      if (classes.length > 0) {
        currentPath += `[contains(@class, "${classes[0]}")]`;
      }
    }
    
    // Tip, name veya title gibi önemli attribute'ları kullan
    else if (currentElement.getAttribute('name')) {
      currentPath += `[@name="${currentElement.getAttribute('name')}"]`;
    }
    else if (currentElement.getAttribute('title')) {
      currentPath += `[@title="${currentElement.getAttribute('title')}"]`;
    }
    
    // Konum bazlı
    else {
      // Kardeş elementlerin sayısını bul
      let siblingCount = 1;
      let sibling = currentElement.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === currentElement.tagName) {
          siblingCount++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      // Birden fazla aynı tag varsa, index kullan
      if (siblingCount > 1) {
        // İndex hesapla
        let index = 1;
        sibling = currentElement.previousElementSibling;
        
        while (sibling) {
          if (sibling.tagName === currentElement.tagName) {
            index++;
          }
          sibling = sibling.previousElementSibling;
        }
        
        currentPath += `[${index}]`;
      }
    }
    
    parents.unshift(currentPath);
    currentElement = currentElement.parentElement;
  }
  
  // XPath yolunu oluştur
  return `//${parents.join('/')}`;
}

// XPath Finder çubuğunu oluştur
function createFinderBar() {
  if (finderBar) return;
  
  // Ana container
  finderBar = document.createElement('div');
  finderBar.id = 'xpath-finder-bar';
  finderBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, #4b6cb7, #182848);
    color: white;
    padding: 10px 15px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  
  // Başlık
  const title = document.createElement('div');
  title.textContent = 'XPath Finder';
  title.style.cssText = `
    font-weight: bold;
    margin-right: 15px;
    font-size: 16px;
  `;
  finderBar.appendChild(title);
  
  // XPath ve CSS Selector seçim dropdown'u
  const selectorDropdown = document.createElement('select');
  selectorDropdown.id = 'selector-type-dropdown';
  selectorDropdown.style.cssText = `
    margin-right: 10px;
    padding: 6px;
    border-radius: 4px;
    border: none;
    background: rgba(255,255,255,0.9);
    font-family: Arial, sans-serif;
  `;
  
  const xpathOption = document.createElement('option');
  xpathOption.value = 'xpath';
  xpathOption.textContent = 'XPath';
  selectorDropdown.appendChild(xpathOption);
  
  const cssOption = document.createElement('option');
  cssOption.value = 'css';
  cssOption.textContent = 'CSS Selector';
  selectorDropdown.appendChild(cssOption);
  
  // Dropdown değişikliğini izle
  selectorDropdown.addEventListener('change', (e) => {
    console.log(`Seçici tipi değişti: ${e.target.value}`);
  });
  
  finderBar.appendChild(selectorDropdown);
  
  // XPath input alanı
  const xpathInput = document.createElement('input');
  xpathInput.id = 'xpath-finder-input';
  xpathInput.type = 'text';
  xpathInput.readOnly = true;
  xpathInput.style.cssText = `
    flex: 1;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    margin-right: 10px;
    background: rgba(255,255,255,0.9);
  `;
  finderBar.appendChild(xpathInput);
  
  // Kopyalama butonu
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Kopyala';
  copyButton.id = 'xpath-finder-copy-button';
  copyButton.style.cssText = `
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    margin-right: 10px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    user-select: none;
    position: relative;
    z-index: 9999999;
  `;
  copyButton.addEventListener('mouseenter', () => {
    copyButton.style.background = '#2ecc71';
  });
  copyButton.addEventListener('mouseleave', () => {
    copyButton.style.background = '#27ae60';
  });
  
  // Tamamen yeniden düzenlenmiş kopyalama fonksiyonu
  const copyXPathToClipboard = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log("Kopyala butonu tıklandı");
    
    // Görsel geri bildirim
    copyButton.style.background = '#219a52';
    copyButton.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
    
    try {
      const input = document.getElementById('xpath-finder-input');
      const xpathValue = input.value;
      
      if (!xpathValue || xpathValue.trim() === '') {
        console.warn("Kopyalanacak XPath değeri bulunamadı");
        showNotification("Kopyalanacak XPath bulunamadı!");
        setTimeout(() => {
          copyButton.style.background = '#27ae60';
          copyButton.style.boxShadow = 'none';
        }, 300);
        return;
      }
      
      // Modern clipboard API kullan
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(xpathValue)
          .then(() => {
            console.log("XPath başarıyla kopyalandı (modern yöntem):", xpathValue);
            showNotification('XPath kopyalandı!');
            setTimeout(() => {
              copyButton.style.background = '#27ae60';
              copyButton.style.boxShadow = 'none';
            }, 300);
          })
          .catch(err => {
            console.error("Clipboard API hatası:", err);
            // Hata durumunda eski yöntemi dene
            fallbackCopy(input);
          });
      } else {
        // Eski yöntem
        fallbackCopy(input);
      }
    } catch (error) {
      console.error("Kopyalama işleminde hata:", error);
      showNotification("Kopyalama başarısız!");
      setTimeout(() => {
        copyButton.style.background = '#27ae60';
        copyButton.style.boxShadow = 'none';
      }, 300);
    }
  };
  
  // Eski kopyalama yöntemi (yedek)
  function fallbackCopy(input) {
    try {
      input.select();
      const success = document.execCommand('copy');
      if (success) {
        console.log("XPath başarıyla kopyalandı (eski yöntem)");
        showNotification('XPath kopyalandı!');
      } else {
        console.warn("execCommand kopyalama başarısız");
        showNotification("Kopyalama başarısız, lütfen manuel kopyalayın!");
      }
      
      setTimeout(() => {
        copyButton.style.background = '#27ae60';
        copyButton.style.boxShadow = 'none';
      }, 300);
      
    } catch (err) {
      console.error("Fallback kopyalama hatası:", err);
      showNotification("Kopyalama başarısız, lütfen manuel kopyalayın!");
      
      setTimeout(() => {
        copyButton.style.background = '#27ae60';
        copyButton.style.boxShadow = 'none';
      }, 300);
    }
  }
  
  // Birden fazla olay dinleyicisi ekle (daha güvenilir olması için)
  copyButton.addEventListener('click', copyXPathToClipboard);
  copyButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyButton.style.background = '#219a52';
    copyButton.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
  });
  
  finderBar.appendChild(copyButton);
  
  // Kapatma butonu - tamamen yeniden düzenlenmiş
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Kapat';
  closeButton.id = 'xpath-finder-close-button';
  closeButton.style.cssText = `
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    user-select: none;
    position: relative;
    z-index: 9999999;
  `;
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = '#c0392b';
  });
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = '#e74c3c';
  });
  
  // Kapatma fonksiyonu - yeniden düzenlenmiş
  const handleCloseFinder = function(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log("Kapat butonu tıklandı");
    
    // Görsel geri bildirim
    closeButton.style.background = '#95281e';
    closeButton.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
    
    try {
      // Tüm event listener'ları kaldır
      document.removeEventListener('click', handleElementClick, true);
      document.removeEventListener('mouseover', handleElementMouseOver);
      document.removeEventListener('mouseout', handleElementMouseOut);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Highlight edilen elementleri temizle
      const highlighted = document.querySelectorAll('.xpath-hover-highlight');
      highlighted.forEach(el => el.classList.remove('xpath-hover-highlight'));
      
      // Aktif elementi temizle
      activeElement = null;
      
      // Finder bar'ı kaldır
      if (finderBar) {
        if (document.body.contains(finderBar)) {
          setTimeout(() => {
            try {
              document.body.removeChild(finderBar);
              console.log("Finder bar başarıyla kaldırıldı");
            } catch (error) {
              console.error("Finder bar kaldırma hatası:", error);
            }
            finderBar = null;
          }, 100);
        }
      }
      
      // Finder'ı deaktif et
      finderActive = false;
      
      // Kapatıldı bilgisi gönder
      try {
        chrome.runtime.sendMessage({
          action: "xpathFinderClosed"
        }, response => {
          console.log("XPath Finder kapatıldı bilgisi gönderildi:", response || "yanıt yok");
        });
      } catch (error) {
        console.error("Kapatıldı mesajı gönderme hatası:", error);
      }
      
      // Kapatıldı bildirimi göster
      showNotification("XPath Finder kapatıldı");
      console.log("XPath Finder başarıyla kapatıldı");
      
    } catch (error) {
      console.error("Kapatma işleminde hata:", error);
      
      // Hata olsa bile zorla kapat
      try {
        if (finderBar && document.body.contains(finderBar)) {
          document.body.removeChild(finderBar);
        }
        finderBar = null;
        finderActive = false;
        showNotification("XPath Finder zorla kapatıldı");
      } catch (e) {
        console.error("Zorla kapatma işleminde de hata:", e);
      }
    }
  };
  
  // Birden fazla olay dinleyicisi ekle (daha güvenilir olması için)
  closeButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeButton.style.background = '#95281e';
    closeButton.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
  });
  
  closeButton.addEventListener('click', handleCloseFinder);
  
  finderBar.appendChild(closeButton);
  
  // ESC tuşu dinleyicisi ve tüm çubuğu kapatmaya ayarla
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && finderActive) {
      handleCloseFinder();
    }
  });
  
  // Bar'ı sayfaya ekle
  document.body.appendChild(finderBar);
  
  // Sayfada çalışabilmesi için CSS ekle
  const style = document.createElement('style');
  style.textContent = `
    .xpath-hover-highlight {
      outline: 2px solid #e67e22 !important;
      background-color: rgba(230, 126, 34, 0.1) !important;
    }
    
    .xpath-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: fadeInOut 3s forwards;
    }
    
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(20px); }
      10% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    #xpath-finder-copy-button, #xpath-finder-close-button {
      position: relative !important;
      z-index: 9999999 !important;
    }
  `;
  document.head.appendChild(style);
}

// XPath Finder'ı aktifleştirme fonksiyonu
function activateXPathFinder() {
  if (finderActive) return;
  
  finderActive = true;
  console.log("XPath Finder aktifleştirildi");
  
  // XPath Finder bar oluştur
  createFinderBar();
  
  // Eleman seçimi için event listener ekle
  document.addEventListener('mouseover', handleElementMouseOver);
  document.addEventListener('mouseout', handleElementMouseOut);
  document.addEventListener('click', handleElementClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  // Bildirim göster
  showNotification("XPath Finder aktif. Bir öğe seçmek için tıklayın.");
}

// Zorla kapatma fonksiyonu (acil durum için)
function forceCloseXPathFinder() {
  console.log("XPath Finder zorla kapatılıyor...");
  
  try {
    finderActive = false;
    
    // Olay dinleyicilerini kaldır
    document.removeEventListener('click', handleElementClick, true);
    document.removeEventListener('mouseover', handleElementMouseOver);
    document.removeEventListener('mouseout', handleElementMouseOut);
    document.removeEventListener('keydown', handleKeyDown);
    
    // Finder çubuğunu kaldır
    if (finderBar) {
      if (document.body.contains(finderBar)) {
        document.body.removeChild(finderBar);
      }
    }
    finderBar = null;
    
    // Aktif elementi temizle
    activeElement = null;
    
    // Highlight sınıflarını kaldır
    document.querySelectorAll('.xpath-hover-highlight').forEach(el => {
      el.classList.remove('xpath-hover-highlight');
    });
    
    console.log("XPath Finder zorla kapatıldı");
  } catch (error) {
    console.error("Zorla kapatma işleminde de hata:", error);
  }
}

// XPath Finder'ı deaktive etme - artık kullanılmıyor, bunun yerine her buton kendi mantığını içeriyor
function deactivateXPathFinder() {
  console.log("deactivateXPathFinder fonksiyonu kullanım dışı. Doğrudan kapat butonuna ait fonksiyon kullanılıyor.");
  
  // Finder bar'daki kapat butonunu bul ve tıklama olayını tetikle
  const closeButton = document.getElementById('xpath-finder-close-button');
  if (closeButton) {
    // Manuel olarak click olayını tetikle
    closeButton.click();
  } else {
    console.warn("Kapat butonu bulunamadı, zorla kapatılıyor...");
    forceCloseXPathFinder();
  }
}

// XPath veya CSS Selector oluşturma fonksiyonu
function getSelector(element, type) {
  console.log("getSelector çağrıldı. Tip:", type);
  
  let selector;
  
  if (type === 'css') {
    // CSS Selector oluştur
    selector = getCssSelector(element);
    console.log("CSS Selector oluşturuldu:", selector);
    
    // CSS formatı kontrolü
    if (selector.startsWith('/')) {
      console.warn("CSS Selector '/' ile başlıyor, format düzeltiliyor");
      selector = selector.substring(1); // Başındaki '/' karakterini kaldır
    }
  } else {
    // XPath oluştur
    selector = getElementXPath(element);
    console.log("XPath oluşturuldu:", selector);
    
    // XPath formatı kontrolü
    if (!selector.startsWith('/')) {
      console.warn("XPath '/' ile başlamıyor, format düzeltiliyor");
      selector = '/' + selector; // Başına '/' ekle
    }
  }
  
  return selector;
}

// CSS Selector oluşturma fonksiyonu
function getCssSelector(element) {
  if (!(element instanceof Element)) return '';
  const path = [];
  while (element.nodeType === Node.ELEMENT_NODE && element !== document.body) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector += '#' + element.id;
      path.unshift(selector);
      break;
    } else {
      let sib = element, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() == selector) nth++;
      }
      selector += ":nth-of-type(" + nth + ")";
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(" > ");
}

// Tıklama işleyicisi
function handleElementClick(event) {
  if (!finderActive) return;
  
  if (event.target.closest('#xpath-finder-bar')) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const element = event.target;
  console.log("Seçilen element:", element);
  console.log("Element tag:", element.tagName);
  console.log("Element ID:", element.id);
  console.log("Element class:", element.className);
  
  // Dropdown'dan seçici tipini al
  const selectorTypeDropdown = document.getElementById('selector-type-dropdown');
  const selectorType = selectorTypeDropdown ? selectorTypeDropdown.value : 'xpath';
  
  // Log ile seçici tipinin doğru alındığını kontrol edelim
  console.log("Seçilen seçici tipi:", selectorType);
  
  // Seçici tipine göre XPath veya CSS Selector oluştur
  let selector;
  if (selectorType === 'css') {
    selector = getCssSelector(element);
    console.log("Oluşturulan CSS Selector:", selector);
  } else {
    selector = getElementXPath(element);
    console.log("Oluşturulan XPath:", selector);
  }
  
  const input = document.getElementById('xpath-finder-input');
  if (input) {
    input.value = selector;
    console.log("Input değeri ayarlandı:", input.value);
  }
  
  // Seçilen seçici bilgisini gönder
  chrome.runtime.sendMessage({
    action: "selectorSelected",
    selectorType: selectorType, // 'xpath' veya 'css'
    selector: selector
  }, response => {
    console.log(`${selectorType.toUpperCase()} seçme bildirimi gönderildi:`, response);
  });
  
  showNotification(`${selectorType.toUpperCase()} seçildi: ${selector}`);
}

// Mouseover işleyicisi
function handleElementMouseOver(event) {
  if (!finderActive) return;
  
  // Finder çubuğu içindeki hover olaylarını yoksay
  if (event.target.closest('#xpath-finder-bar')) {
    return;
  }
  
  // Hover efekti ekle
  event.target.classList.add('xpath-hover-highlight');
  activeElement = event.target;
}

// Mouseout işleyicisi
function handleElementMouseOut(event) {
  if (!finderActive) return;
  
  // Hover efektini kaldır
  if (event.target.classList.contains('xpath-hover-highlight')) {
    event.target.classList.remove('xpath-hover-highlight');
  }
  
  // Aktif elementi temizle
  if (activeElement === event.target) {
    activeElement = null;
  }
}

// Klavye işleyicisi
function handleKeyDown(event) {
  if (!finderActive) return;
  
  // ESC tuşuyla kapat
  if (event.key === 'Escape') {
    // Kapat butonunu bul ve tıkla
    const closeButton = document.getElementById('xpath-finder-close-button');
    if (closeButton) {
      closeButton.click();
    } else {
      forceCloseXPathFinder();
    }
  }
}

// Bildirim gösterme fonksiyonu
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'xpath-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // 3 saniye sonra kaldır
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Message listeneri (en üstte tanımlı olması daha iyi)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("XPath Finder mesaj aldı:", request);
  
  // Test mesajını işle - content scriptin çalıştığını doğrula
  if (request.action === "xpathFinderTest") {
    console.log("XPath Finder test mesajı alındı, yanıt gönderiliyor");
    sendResponse({ 
      success: true, 
      message: "XPath Finder content script çalışıyor",
      version: "1.0"
    });
    return true; // Asenkron mesaj işleme için true döndür
  }
  
  // XPath Finder'ı aktifleştir
  if (request.action === "activateXPathFinder") {
    console.log("activateXPathFinder mesajı alındı");
    
    try {
      if (finderActive) {
        console.log("XPath Finder zaten aktif");
        sendResponse({ success: true, message: "XPath Finder zaten aktif" });
      } else {
        console.log("XPath Finder aktifleştiriliyor...");
        activateXPathFinder();
        sendResponse({ success: true, message: "XPath Finder aktifleştirildi" });
      }
    } catch (error) {
      console.error("XPath Finder aktifleştirme hatası:", error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Asenkron mesaj işleme için true döndür
  }
  
  return true; // Tüm mesajlar için true döndür
});

// Sayfa yüklendiğinde veya DOM içeriği yüklendiğinde XPath Finder'ın hazır olduğunu bildir
if (document.readyState === 'complete') {
  console.log("XPath Finder hazır (sayfa tamamen yüklendi)");
  chrome.runtime.sendMessage({ action: "xpathFinderReady" }, response => {
    console.log("XPath Finder hazır olduğu bildirildi, yanıt:", response || "yanıt yok");
  });
} else {
  window.addEventListener('load', function() {
    console.log("XPath Finder hazır (window.load olayı)");
    chrome.runtime.sendMessage({ action: "xpathFinderReady" }, response => {
      console.log("XPath Finder hazır olduğu bildirildi, yanıt:", response || "yanıt yok");
    });
  });
  
  document.addEventListener('DOMContentLoaded', function() {
    console.log("XPath Finder hazır (DOMContentLoaded olayı)");
    chrome.runtime.sendMessage({ action: "xpathFinderReady" }, response => {
      console.log("XPath Finder hazır olduğu bildirildi, yanıt:", response || "yanıt yok");
    });
  });
}
