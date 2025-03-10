/**
 * Kullanıcı ayarlarını dinleyen ve dinamik olarak uygulayan yardımcı fonksiyonlar
 */

// Kullanıcı ayarları dinleyicisi
(function(window) {
  
  // Ayarlardaki değişiklikleri dinle
  function setupStorageChangeListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') return;
      
      console.log('🔄 Storage değişikliği algılandı:', changes);
      
      // Dönüşümleri etkileyen ayarlar değişmişse güncelle
      const relevantChanges = [
        'selectedCurrency', 
        'financeCost', 
        'shippingCost', 
        'extraCost', 
        'kdvAction',
        'discountAmount',
        'euroPercentageOperation',
        'tlPercentageOperation',
        'usd',
        'eur',
        'cny',
        'eurusd'
      ];
      
      // İlgili değişiklikleri kontrol et
      const hasRelevantChanges = relevantChanges.some(key => changes[key] !== undefined);
      
      if (hasRelevantChanges) {
        console.log('💡 Dönüşümleri etkileyen ayarlar değişti, dönüşümler güncelleniyor...');
        // Eğer bu bir kullanıcı tanımlı domain ise, dönüşümleri güncelle
        if (_isUserDefinedDomain()) {
          _updatePageConversions();
        } else if (typeof window.checkAndConvertPrices === 'function') {
          window.checkAndConvertPrices();
        }
      }
    });
  }
  
  // Mesaj dinleyicisi
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'applyDynamicSettings') {
        console.log('🔄 Dinamik ayarlar uygulanıyor...');
        _updatePageConversions();
        sendResponse({ success: true });
      }
      
      return true; // Asenkron yanıt için
    });
  }
  
  // Sayfadaki dönüşümleri güncelleme fonksiyonu
  function _updatePageConversions() {
    try {
      console.log('🔄 Sayfa dönüşümleri güncelleniyor...');
      
      // Mevcut dönüşümleri temizle
      if (typeof window.clearExistingConversions === 'function') {
        window.clearExistingConversions();
      }
      
      // Seçicileri yeniden uygula ve dönüşümleri güncelle
      if (typeof window.checkAndApplySavedSelectors === 'function') {
        window.checkAndApplySavedSelectors();
      } else if (typeof window.checkAndConvertPrices === 'function') {
        window.checkAndConvertPrices();
      }
    } catch (error) {
      console.error('⛔ Sayfa dönüşümleri güncellenirken hata oluştu:', error);
    }
  }
  
  // Kullanıcı tanımlı domain üzerinde miyiz kontrolü
  function _isUserDefinedDomain() {
    try {
      // DomainHandler'dan current config'i al
      if (typeof DomainHandler === 'undefined') {
        console.warn('⚠️ DomainHandler tanımlı değil');
        return false;
      }
      
      const currentConfig = DomainHandler.getCurrentConfig();
      if (!currentConfig) {
        console.warn('⚠️ DomainHandler config\'i bulunamadı');
        return false;
      }
      
      // Bu bir kullanıcı tanımlı domain mi?
      return !!currentConfig.isUserDefined;
    } catch (error) {
      console.error('⛔ Domain kontrol hatası:', error);
      return false;
    }
  }
  
  // Ana başlatma fonksiyonu
  function initialize() {
    setupStorageChangeListener();
    setupMessageListener();
    console.log('✅ Dinamik kullanıcı ayarları modülü başlatıldı');
  }
  
  // Sayfa yüklendiğinde başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})(window); 