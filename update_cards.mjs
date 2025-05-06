import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === URL до скрипта Google Apps Script ===
const SHEET_API_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgrZHEq-8_2yEq4s5evI1JU6DOoku_ZqP_WkJMvcizs8lh3uoTzJlpdZYLfPGGbIt5FX7ljSgoBL1hiPLdS1IrZzm9nDBntlAKjZ1iEerssYdDt_xqDuH27Rioa3-WXikcC9iQlw1dhn2pxcHDHnsRinQAYXCr5GfYPmf4RT-0faMWXEJ15S7-tff9c76XS3QYE9-3r1NJ16dnV14MKKy8oBpIlq8FkkFKE1mxPOaykID9w82xtJtjC3-CJsdkB-HziwDuiJeoH6jlsdeBViFc_MYO-9A&lib=MHmJqwpiaLfj-qElDyyzwJ-7_LOrhYMhx"; // ← вставь сюда свой

// === Пути ===
const IMAGES_DIR = path.join(__dirname, "image");
const HTML_FILE = path.join(__dirname, "index.html");
const VIEW_TEMPLATE = path.join(__dirname, "view.html");
const GALLERY_DIR = path.join(__dirname, "gallery");

if (!fs.existsSync(GALLERY_DIR)) {
  fs.mkdirSync(GALLERY_DIR);
}

(async () => {
  const res = await fetch(SHEET_API_URL);
  const pdfData = await res.json();

  const imageFiles = fs.readdirSync(IMAGES_DIR).filter(file => file.endsWith(".png"));

  const cards = imageFiles.map(img => {
    const baseName = path.basename(img, ".png");
    const pdfEntry = pdfData.find(item => item.name === baseName);

    return {
      name: baseName,
      pdf: pdfEntry ? pdfEntry.pdf : "#",
      imgPath: `../image/${img}`
    };
  });

  // Генерация галереи для index.html
  const generatedHTML = cards.map(card => `
    <div class="card" data-title="${card.name}" data-description="" data-image="${card.imgPath}" data-pdf="${card.pdf}">
      <img src="${card.imgPath}" alt="${card.name}">
    </div>
  `).join("\n");

  let html = fs.readFileSync(HTML_FILE, "utf8");
  html = html.replace(
    /<main id="gallery">([\s\S]*?)<\/main>/,
    `<main id="gallery">\n${generatedHTML}\n</main>`
  );

  fs.writeFileSync(HTML_FILE, html, "utf8");

  // Генерация отдельных страниц для каждой картинки в папке gallery
  const viewTemplate = fs.readFileSync(VIEW_TEMPLATE, "utf8");
  function slugify(str) {
    return str.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  }
  for (const card of cards) {
    let page = viewTemplate
      .replace(/<title[^>]*>.*?<\/title>/, `<title>${card.name}</title>`)
      .replace('id="mainImage" class="main-image" src="" alt=""', `id="mainImage" class="main-image" src="${card.imgPath}" alt="${card.name}"`)
      .replace('id="mainTitle" class="main-title"></div>', `id="mainTitle" class="main-title">${card.name}</div>`)
      .replace('id="downloadBtn" href="#" download', `id="downloadBtn" href="${card.pdf}" download`);
    // Удаляем скрипт, который парсит параметры из URL
    page = page.replace(/<script>[\s\S]*?mainImg\.src = img;[\s\S]*?mainTitle\.textContent = title;[\s\S]*?document\.title = title \|\| 'View Image';[\s\S]*?let pdfUrl = null;[\s\S]*?\/\/ Получаем все картинки из index\.html \(парсим DOM\)[\s\S]*?gallery\.appendChild\(el\);[\s\S]*?\}\);[\s\S]*?\/\/ Кнопка поделиться[\s\S]*?\}\);[\s\S]*?<\/script>/, '');
    // Оставляем только кнопку share (копировать ссылку)
    page = page.replace('</main>', `</main>\n<script>\nconst shareBtn = document.getElementById('shareBtn');\nshareBtn.addEventListener('click', () => {\n  const shareUrl = window.location.href;\n  if (navigator.share) {\n    navigator.share({ title: document.title, url: shareUrl });\n  } else {\n    navigator.clipboard.writeText(shareUrl).then(() => {\n      shareBtn.textContent = 'Copied!';\n      setTimeout(() => shareBtn.textContent = 'Share', 1500);\n    });\n  }\n});\n</script>`);
    const fileName = slugify(card.name) + ".html";
    fs.writeFileSync(path.join(GALLERY_DIR, fileName), page, "utf8");
  }

  console.log("✅ Готово! Файлы для каждой картинки созданы в папке gallery.");
})();
