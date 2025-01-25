import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const app = express();
const port = 3000;

/**
 * Belirtilen dosyadan proxy listesini okuyup dizi olarak döndüren fonksiyon.
 * (Dosyadaki her satır: host:port:username:password formatında olmalıdır)
 */
const loadProxiesFromFile = (filePath) => {
  return fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
};

/**
 * Tek bir proxy üzerinden istek yapan fonksiyon.
 */
const makeRequest = async (url, proxy) => {
  const agent = new HttpsProxyAgent(proxy);
  const startTime = Date.now();

  try {
    await fetch(url, { agent }); // Sadece istek yapılıyor, gelen cevabı kullanmıyoruz
    const endTime = Date.now();
    console.log(`Request completed via proxy ${proxy} in ${endTime - startTime} ms`);
  } catch (error) {
    console.error(`Error with proxy ${proxy}:`, error.message);
  }
};

/**
 * Belirtilen dosyadaki tüm proxy'leri kullanarak
 * toplu şekilde istek yapan fonksiyon.
 */
const testProxies = async (filePath) => {
  const proxies = loadProxiesFromFile(filePath);
  if (proxies.length === 0) {
    console.error("Proxy listesi boş. İstekler yapılmayacak.");
    return;
  }

  // Test edilecek örnek URL
  const url = "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50";

  // Promise.all ile tüm proxy isteklerini paralel çalıştırıyoruz
  const requests = proxies.map(proxyLine => {
    const [host, port, username, password] = proxyLine.split(":");
    const proxyUrl = `http://${username}:${password}@${host}:${port}`;
    return makeRequest(url, proxyUrl);
  });

  await Promise.all(requests);
};

/**
 * /test1 endpoint'i --> proxy.txt dosyasını kullanarak test yapar
 */
app.get("/test1", async (req, res) => {
  await testProxies("./proxy.txt");
  return res.send("test1 api çalışıyor");
});

/**
 * /test2 endpoint'i --> proxy2.txt dosyasını kullanarak test yapar
 */
app.get("/test2", async (req, res) => {
  await testProxies("./proxy2.txt");
  return res.send("test2 api çalışıyor");
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu port ${port} üzerinde çalışıyor.`);
});
