import fetch from 'node-fetch'; // Node 18 öncesi için gerekliyse: npm install node-fetch

// İstek atmak istediğimiz iki URL
const urls = [
  "http://dcgc08w0g4g8wgowwccocg0o.46.17.100.13.sslip.io/test1",
  "http://tg40s0ow084cgsc00840wcow.46.17.100.79.sslip.io/test1"
];

async function callApis() {
  try {
    // Her bir URL için fetch işlemi yapıp text() sonucu döndüren promise'lar oluşturuyoruz
    const promises = urls.map(async url => {
      const startTime = Date.now();
      const response = await fetch(url);
      const data = await response.text();
      const endTime = Date.now();
      
      // İsteğin sürmesini hesaplıyoruz (ms cinsinden)
      const duration = endTime - startTime;
      
      // Fonksiyon sonucunu, URL ve yanıt içeriğini ve süresini birlikte döndürüyoruz
      return {
        url,
        data,
        duration
      };
    });

    // Tüm istekler tamamlanıncaya kadar bekliyor
    const results = await Promise.all(promises);

    // Gelen sonuçları konsola yazdıralım
    results.forEach(({ url, data, duration }) => {
      console.log(`Response from ${url}:`, data);
      console.log(`Request took ${duration} ms\n`);
    });
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// Çalıştır
callApis();
