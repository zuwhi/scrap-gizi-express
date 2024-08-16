const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Route untuk scraping
app.get("/scrape", async (req, res) => {
  const productName = req.query.cari;
  const url = `https://nilaigizi.com/pencarian?cari=${productName}`;

  try {
    // Mengirim request ke URL
    const { data } = await axios.get(url);

    // Load HTML ke cheerio
    const $ = cheerio.load(data);

    // Array untuk menampung hasil scraping
    const results = [];

    // Lakukan scraping dan push data ke array
    $(".row.mt-3.ml-1").each((i, el) => {
      const productName = $(el).find(".row.text-success").text().trim();
      const nutritionInfo = $(el).find(".row.text-body").text().trim();
      const href = $(el).find("a").attr("href");

      results.push({
        product_name: productName,
        nutrition_info: nutritionInfo,
        link: href,
      });
    });

    // Mengirimkan hasil dalam format JSON
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping" });
  }
});

app.get("/scrape/detail", async (req, res) => {
  const productUrl = req.query.url;

  if (!productUrl) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const { data } = await axios.get(productUrl);
    const $ = cheerio.load(data);
    const result = {};

    $("tbody.f11 tr").each((i, el) => {
      const label = $(el).find("td.title strong.text-primary").first().text().trim();
      const value = $(el).find("td.title strong.text-primary span.float-right").text().trim();

      if (label && value) {
        result[label] = value;
      }
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping" });
  }
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
