const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Fungsi untuk memeriksa apakah halaman adalah detail produk
const isDetailPage = ($) => {
  return $("tbody.f11").length > 0;
};

// Fungsi untuk membersihkan data nilai gizi
const cleanNutritionValue = (value) => {
  // Hapus karakter newline dan persentase
  return value.split("\n")[0].trim();
};

// Route untuk scraping daftar produk atau detail produk
app.get("/scrape", async (req, res) => {
  const productName = req.query.cari || "indomilk";
  const url = `https://nilaigizi.com/pencarian?cari=${productName}`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    if (isDetailPage($)) {
      // Jika halaman adalah detail produk, ekstrak data dari detail produk
      const result = {};

      // Ambil data nilai gizi dari tabel
      $("tbody.f11 tr").each((i, el) => {
        const label = $(el).find("td.title strong.text-primary").first().text().trim();
        let value = $(el).find("td.title strong.text-primary span.float-right").text().trim();

        if (label && value) {
          value = cleanNutritionValue(value); // Bersihkan nilai gizi
          result[label] = value;
        }
      });

      // Ambil gambar pertama dari class img-thumbnail
      const imageUrl = $(".img-thumbnail").first().attr("src");
      if (imageUrl) {
        result["image_url"] = imageUrl;
      }

      res.json(result);
    } else {
      // Jika halaman adalah daftar produk, ekstrak data dari daftar produk
      const results = [];

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

      res.json(results);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping" });
  }
});

// Route untuk scraping detail produk
app.get("/scrape/detail", async (req, res) => {
  const productUrl = req.query.url;

  if (!productUrl) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  try {
    const { data } = await axios.get(productUrl);
    const $ = cheerio.load(data);
    const result = {};

    // Ambil data nilai gizi dari tabel
    $("tbody.f11 tr").each((i, el) => {
      const label = $(el).find("td.title strong.text-primary").first().text().trim();
      let value = $(el).find("td.title strong.text-primary span.float-right").text().trim();

      if (label && value) {
        value = cleanNutritionValue(value); // Bersihkan nilai gizi
        result[label] = value;
      }
    });

    // Ambil gambar pertama dari class img-thumbnail
    const imageUrl = $(".img-thumbnail").first().attr("src");
    if (imageUrl) {
      result["image_url"] = imageUrl;
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
