const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape/fatsecret", async (req, res) => {
  const productName = req.query.q || "pocari"; // Nama produk dari query parameter
  const url = `https://www.fatsecret.co.id/kalori-gizi/search?q=${productName}`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const results = [];

    $("tbody tr").each((i, el) => {
      const productName = $(el).find("a.prominent").text().trim();
      const brandName = $(el).find("a.brand").text().trim();
      let details = $(el).find(".smallText.greyText.greyLink").text().trim();
      const href = $(el).find("a.prominent").attr("href");
      const link = `https://www.fatsecret.co.id${href}`;

      // Memastikan details tidak kosong dan mengandung teks yang diharapkan
      if (details && details.includes(" - ")) {
        const [portionInfo, nutritionInfo] = details.split(" - ");
        let [calories, fat, carbs, protein] = nutritionInfo.split("|").map((item) => item.trim());

        // Membersihkan karakter tidak diinginkan dan teks tambahan
        protein = protein
          .replace(/[\n\t]/g, "")
          .replace("Informasi Gizi", "")
          .trim();

        results.push({
          product_name: productName,
          brand_name: brandName,
          portion_info: portionInfo.trim(),
          calories: calories.trim().replace("Kalori:", "").trim(),
          fat: fat.trim().replace("Lemak:", "").trim(),
          carbs: carbs.trim().replace("Karb:", "").trim(),
          protein: protein.trim().replace("Prot:", "").trim(),
          link: link,
        });
      }
    });

    // Mengirimkan response dalam format JSON
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping FatSecret" });
  }
});

app.get("/scrape/fatsecret/product", async (req, res) => {
  const productUrl = req.query.url;

  if (!productUrl) {
    return res.status(400).json({ error: "URL produk diperlukan" });
  }

  try {
    const { data } = await axios.get(productUrl);
    const $ = cheerio.load(data);

    const productDetails = {};

    // Mengambil informasi gizi dari elemen yang disebutkan
    const servingSize = $(".serving_size_value").text().trim();
    const energyKJ = $(".nutrition_facts .nutrient").eq(1).next(".tRight").text().trim();
    const energyKcal = $(".nutrition_facts .nutrient").eq(3).next(".tRight").text().trim();
    const fat = $(".nutrition_facts .nutrient")
      .filter((i, el) => $(el).text().trim() === "Lemak")
      .next(".tRight")
      .text()
      .trim();
    const saturatedFat = $(".nutrition_facts .nutrient.sub")
      .filter((i, el) => $(el).text().trim() === "Lemak Jenuh")
      .next(".tRight")
      .text()
      .trim();
    const protein = $(".nutrition_facts .nutrient")
      .filter((i, el) => $(el).text().trim() === "Protein")
      .next(".tRight")
      .text()
      .trim();
    const carbs = $(".nutrition_facts .nutrient")
      .filter((i, el) => $(el).text().trim() === "Karbohidrat")
      .next(".tRight")
      .text()
      .trim();
    const sugars = $(".nutrition_facts .nutrient.sub")
      .filter((i, el) => $(el).text().trim() === "Gula")
      .next(".tRight")
      .text()
      .trim();
    const sodium = $(".nutrition_facts .nutrient")
      .filter((i, el) => $(el).text().trim() === "Sodium")
      .next(".tRight")
      .text()
      .trim();

    // Menyusun hasil scraping ke dalam objek JSON
    productDetails.serving_size = servingSize;
    productDetails.energy_kj = energyKJ;
    productDetails.energy_kcal = energyKcal;
    productDetails.fat = fat;
    productDetails.saturated_fat = saturatedFat;
    productDetails.protein = protein;
    productDetails.carbs = carbs;
    productDetails.sugars = sugars;
    productDetails.sodium = sodium;

    // Mengirimkan hasil sebagai respon JSON
    res.json(productDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong while scraping product details" });
  }
});

// NILAI GIZI.COM///////////

const isDetailPage = ($) => {
  return $("tbody.f11").length > 0;
};

// Fungsi untuk membersihkan data nilai gizi
const cleanNutritionValue = (value) => {
  // Hapus karakter newline dan persentase
  return value.split("\n")[0].trim();
};

// Route untuk scraping daftar produk atau detail produk
app.get("/scrape/ng/", async (req, res) => {
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
app.get("/scrape/ng/detail", async (req, res) => {
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
