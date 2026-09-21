// Script to instantly submit URLs to IndexNow (Bing, Yandex, Seznam, Naver)
const payload = {
  host: "vectric.online",
  key: "206fa105151543be81a5c6cbff972c3d",
  keyLocation: "https://vectric.online/206fa105151543be81a5c6cbff972c3d.txt",
  urlList: [
    "https://vectric.online/",
    "https://vectric.online/about.html",
    "https://vectric.online/contact.html",
    "https://vectric.online/privacy.html",
    "https://vectric.online/terms.html",
    "https://vectric.online/disclaimer.html"
  ]
};

async function submitIndexNow() {
  console.log("Submitting URLs to IndexNow API (api.indexnow.org)...");
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    });
    console.log(`IndexNow response status: ${res.status} ${res.statusText}`);
    if (res.status === 200 || res.status === 202) {
      console.log("Successfully submitted URLs to IndexNow for immediate search engine crawling!");
    } else {
      const text = await res.text();
      console.log(`IndexNow response detail: ${text}`);
    }
  } catch (err) {
    console.error("IndexNow submission error:", err.message);
  }
}

submitIndexNow();
