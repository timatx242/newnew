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
      imgPath: img // только имя файла
    };
  });

  // Генерация галереи для index.html (пути image/название.png)
  const generatedHTML = cards.map(card => `
    <div class="card" data-title="${card.name}" data-description="" data-image="image/${card.imgPath}" data-pdf="${card.pdf}">
      <img src="image/${card.imgPath}" alt="${card.name}">
    </div>
  `).join("\n");

  let html = fs.readFileSync(HTML_FILE, "utf8");
  html = html.replace(
    /<main id="gallery">([\s\S]*?)<\/main>/,
    `<main id="gallery">\n${generatedHTML}\n</main>`
  );
  // Исправляем подвал: только Contact us по центру
  html = html.replace(/<footer[\s\S]*?<\/footer>/, `<footer class="site-footer">
  <div class="footer-center">
    <a href="contact.html" class="footer-link">Contact us</a>
  </div>
  <div class="footer-copyright">
      Copyright © 2025 <a href="https://cardspdf.com">cardspdf.com</a>
  </div>
  <div class="footer-disclaimer">
      Copying, by any method, of material on this site for any purpose other than an individual's personal reference without the written permission of the copyright owner, is prohibited. All rights to the published coloring pages, pictures and other materials on cardspdf.com belong to their respective authors/publishers, and the Website Administration does not bear responsibility for their use. All the materials are for personal use only.
  </div>
</footer>`);
  fs.writeFileSync(HTML_FILE, html, "utf8");

  // Генерация отдельных страниц для каждой картинки в папке gallery (пути ../image/название.png)
  const viewTemplate = fs.readFileSync(VIEW_TEMPLATE, "utf8");
  function slugify(str) {
    return str.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  }
  for (const card of cards) {
    let page = viewTemplate
      .replace(/<title[^>]*>.*?<\/title>/, `<title>${card.name}</title>`)
      .replace('id="mainImage" class="main-image" src="" alt=""', `id="mainImage" class="main-image" src="../image/${card.imgPath}" alt="${card.name}"`)
      .replace('id="mainTitle" class="main-title"></div>', `id="mainTitle" class="main-title">${card.name}</div>`)
      .replace('id="downloadBtn" href="#" download', `id="downloadBtn" href="${card.pdf}" download`);
    const fileName = slugify(card.name) + ".html";
    fs.writeFileSync(path.join(GALLERY_DIR, fileName), page, "utf8");
  }

  console.log("✅ Всё готово! Галерея и страницы-картинки обновлены.");
})();
