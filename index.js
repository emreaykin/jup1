import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const app = express();
const port = 3000;

/** 
 * Sayaçlar (global veya module-scope)
 * Her saniyede bir sıfırlanacak.
 */
let successCount = 0;
let timeoutCount = 0;
let errorCount = 0;

// Her 1 saniyede bir sayaçları loglayıp sıfırlıyoruz
setInterval(() => {
  console.log(
    `Last second stats => success: ${successCount}, timeout: ${timeoutCount}, error: ${errorCount}`
  );
  successCount = 0;
  timeoutCount = 0;
  errorCount = 0;
}, 1000);

/**
 * Belirtilen dosyadan proxy listesini okuyup dizi olarak döndüren fonksiyon.
 * (Dosyadaki her satır: host:port:username:password formatında olmalıdır)
 */
function loadProxiesFromFile(filePath) {
  return fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

/**
 * Tek bir proxy için sonsuz döngüde istek atılması fonksiyonu.
 * - Her istek en fazla 1 saniye bekler (Timeout).
 * - Eğer 1 saniyeden erken başarı sağlanırsa, geri kalan süreyi (1s - geçen süre) kadar bekler.
 * - Eğer 1 saniyede yanıt gelmezse direkt yeni isteğe geçilir (çünkü zaten 1 saniye dolmuş olur).
 */
async function startProxyLoop(url, proxyUrl) {
  const agent = new HttpsProxyAgent(proxyUrl);

  while (true) {
    const startTime = Date.now();

    // 1) AbortController -> 1sn'de abort olacak
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(); // 1 saniye dolunca isteği iptal et
    }, 1000);

    try {
      await fetch(url, {
        agent,
        signal: controller.signal, // Timeout kontrolü
      });
      // Başarılı istek => sayacı artır
      successCount++;
    } catch (error) {
      if (error.name === "AbortError") {
        // 1 saniyede yanıt gelmedi => timeout
        timeoutCount++;
      } else {
        // Fetch hatası
        errorCount++;
      }
    } finally {
      // 2) Her halükarda setTimeout'u temizliyoruz
      clearTimeout(timeoutId);

      // 3) Geçen süreyi hesapla
      const elapsed = Date.now() - startTime;
      const waitTime = 1000 - elapsed;

      // 4) Eğer 1sn'den erken bitmişse kalan süre bekle
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

/**
 * Dosyadaki tüm proxy'ler için sonsuz döngüde istek atılmasını başlatan fonksiyon.
 * - Tüm proxy'ler için EŞZAMANLI (paralel) olarak startProxyLoop başlıyor.
 * - Bu şekilde hiçbir proxy diğerini beklemeyecek.
 */
function testProxies(filePath) {
  const proxies = loadProxiesFromFile(filePath);
  if (proxies.length === 0) {
    console.error("Proxy listesi boş. İstekler yapılmayacak.");
    return;
  }

  // Test edilecek örnek URL
  const url =
    "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50";

  proxies.forEach(proxyLine => {
    const [host, port, username, password] = proxyLine.split(":");
    const proxyUrl = `http://${username}:${password}@${host}:${port}`;

    // Her proxy için ayrı bir sonsuz döngü başlatıyoruz
    startProxyLoop(url, proxyUrl).catch(err => {
      // Bu döngüde oluşan beklenmeyen hataları yakalamak için
      console.error("startProxyLoop hatası:", err);
    });
  });
}

/**
 * /test1 endpoint'i --> proxy.txt dosyasını kullanarak sonsuz döngüde istekler başlatır
 */
app.get("/test1", (req, res) => {
  testProxies("./proxy.txt");
  return res.send("test1 api çalışıyor => Süresiz istekler başlatıldı.");
});

/**
 * /test2 endpoint'i --> proxy2.txt dosyasını kullanarak sonsuz döngüde istekler başlatır
 */
app.get("/test2", (req, res) => {
  testProxies("./proxy2.txt");
  return res.send("test2 api çalışıyor => Süresiz istekler başlatıldı.");
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu port ${port} üzerinde çalışıyor.`);
});
