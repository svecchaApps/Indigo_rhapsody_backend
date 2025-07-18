const mongoose = require("mongoose");
const Product = require("../models/productModels");
const Designer = require("../models/designerModel");
const Category = require("../models/categoryModel");
const SubCategory = require("../models/subcategoryModel");
const { bucket } = require("../service/firebaseServices"); // Firebase storage configuration
const axios = require("axios"); // To fetch images from URLs
const xlsx = require("xlsx"); // Add this at the top of your file
const { v4: uuid } = require('uuid');

const uploadImageFromURL = async (imageUrl, filename) => {
  try {
    // Check if the URL is a Google Drive URL and modify it accordingly
    if (imageUrl.includes("drive.google.com")) {
      const fileId = imageUrl.match(/\/file\/d\/([^\/]+)\//)[1];
      imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    const response = await axios({
      url: imageUrl,
      responseType: "stream", // Fetch the image as a stream
    });

    const blob = bucket.file(`products/${Date.now()}_${filename}`);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: response.headers["content-type"],
      },
    });

    // Pipe the image stream to Firebase Storage
    response.data.pipe(blobStream);

    return new Promise((resolve, reject) => {
      blobStream.on("finish", async () => {
        const firebaseUrl = await blob.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(firebaseUrl[0]);
      });

      blobStream.on("error", (error) => reject(error));
    });
  } catch (error) {
    throw new Error(`Failed to upload image from URL: ${error.message}`);
  }
};
exports.createProduct = async (req, res) => {
  try {
    const {
      productName,
      category, // This should be the category ID
      subCategory, // This should be the subcategory ID
      description,
      price,
      mrp,
      sku,
      fit,
      fabric,
      material,
      designerRef,
      variants, // Array of variant objects: { color, imageList, sizes: [{ size, price, stock }] }
    } = req.body;

    // Check if required fields are present
    if (!productName || !category || !price || !designerRef) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Look up the existing category by ID
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Look up the existing subcategory by ID
    let subCategoryDoc = null;
    if (subCategory) {
      subCategoryDoc = await SubCategory.findById(subCategory);
      if (!subCategoryDoc) {
        return res.status(404).json({ message: "SubCategory not found" });
      }
    }

    // Process each variant to upload images and generate image URLs
    const processedVariants = [];
    for (const variant of variants) {
      const { color, imageList, sizes } = variant;
      let uploadedImageUrls = [];

      // Upload each image for the variant and get the URLs
      if (imageList && imageList.length > 0) {
        for (const url of imageList) {
          const filename = url.split("/").pop();
          const firebaseUrl = await uploadImageFromURL(url, filename);
          uploadedImageUrls.push(firebaseUrl);
        }
      }

      // Create the processed variant object with the image URLs and sizes
      processedVariants.push({
        color,
        imageList: uploadedImageUrls,
        sizes: sizes.map((size) => ({
          size: size.size,
          price: size.price,
          stock: size.stock,
        })),
      });
    }

    // Create product
    const product = new Product({
      productName,
      category: categoryDoc._id,
      subCategory: subCategoryDoc ? subCategoryDoc._id : null,
      description,
      price,
      sku,
      mrp,
      fit,
      fabric,
      material,
      coverImage: processedVariants[0]?.imageList[0] || null, // Set cover image from the first variant's first image
      designerRef,
      createdDate: new Date(),
      variants: processedVariants,
    });

    // Save product to the database
    await product.save();

    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(500).json({
      message: "Error creating product",
      error: error.message,
    });
  }
};

exports.searchProductsByDesigner = async (req, res) => {
  try {
    const { designerRef, searchTerm, limit } = req.query;

    if (!designerRef) {
      return res
        .status(400)
        .json({ message: "Designer reference is required" });
    }

    const query = { designerRef };

    // Add search term if provided
    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i"); // Case-insensitive partial match
      query.productName = { $regex: regex }; // Match product name based on searchTerm
    }

    // Limit the number of results, defaulting to 10
    const productLimit = parseInt(limit) || 10;

    // Query the products based on designerRef and optional searchTerm
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .limit(productLimit);

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this designer" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error searching products by designer:", error);
    return res.status(500).json({
      message: "Error searching products by designer",
      error: error.message,
    });
  }
};

exports.uploadSingleProduct = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      productName,
      price,
      mrp,
      sku,
      fit,
      description,
      imageUrls,
    } = req.body;

    // Find or create Category and Subcategory
    const categoryDoc = await Category.findOneAndUpdate(
      { name: category },
      { name: category },
      { upsert: true, new: true }
    );
    const subCategoryDoc = await SubCategory.findOneAndUpdate(
      { name: subCategory },
      { name: subCategory, category: categoryDoc._id },
      { upsert: true, new: true }
    );

    let imageList = [];
    for (const url of imageUrls) {
      const filename = url.split("/").pop(); // Get the filename from the URL
      const firebaseUrl = await uploadImageFromURL(url, filename);
      imageList.push(firebaseUrl);
    }

    const product = new Product({
      productName,
      price,
      sku,
      mrp,
      description,
      category: categoryDoc._id,
      subCategory: subCategoryDoc._id,
      fit,
      imageList,
    });

    await product.save();
    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  } catch (error) {
    return res.status(500).json({ message: "Error creating product", error });
  }
};
exports.uploadBulkProducts = async (req, res) => {
  const reqId = uuid();                       // correlation for all logs
  const L     = (...a) => console.log(`[bulk:${reqId}]`, ...a);

  try {
    L('START');

    // ─── Basic input check ─────────────────────────────────────
    const { fileUrl, designerRef } = req.body;
    if (!fileUrl)     return res.status(400).json({ message: 'fileUrl required' });
    if (!designerRef) return res.status(400).json({ message: 'designerRef required' });

    // ─── Download spreadsheet ──────────────────────────────────
    L('GET', fileUrl);
    const { data: buf } = await axios.get(fileUrl, { responseType: 'arraybuffer' });

    // ─── Parse first sheet to JSON ─────────────────────────────
    const wb         = xlsx.read(buf, { type: 'buffer' });
    const sheetName  = wb.SheetNames[0];
    const rows       = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    L(`sheet "${sheetName}" rows:`, rows.length);
    if (!rows.length) throw new Error('Spreadsheet has no data rows');

    // ─── Build product map in memory ───────────────────────────
    const products = {};                         // key = productName (lower)
    for (let i = 0; i < rows.length; i++) {
      const r   = rows[i];
      const tag = `row:${i + 2}`;               // +2 for 1-based Excel lines

      try {
        // ---------- mandatory column check ----------
        ['productName', 'category', 'subCategory', 'color', 'size']
          .forEach(c => { if (!r[c]) throw new Error(`missing ${c}`); });

        // ---------- upsert category / subCategory ----
        const [catDoc, subDoc] = await Promise.all([
          Category.findOneAndUpdate(
            { name: r.category.trim() },
            { $setOnInsert: { name: r.category.trim() } },
            { upsert: true, new: true }
          ),
          SubCategory.findOneAndUpdate(
            { name: r.subCategory.trim() },
            { $setOnInsert: { name: r.subCategory.trim() } },
            { upsert: true, new: true }
          )
        ]);
        if (!subDoc.category)
          await SubCategory.updateOne({ _id: subDoc._id }, { category: catDoc._id });

        // ---------- product skeleton -----------------
        const key        = r.productName.trim().toLowerCase();
        const firstSeen  = !products[key];
        if (firstSeen) {
          // collect images once per product
          const imgList = [];
          if (r.ImageList) {
            for (const rawUrl of r.ImageList.split(',').map(s => s.trim()).filter(Boolean)) {
              try {
                const file = rawUrl.split('/').pop();
                const upl  = await uploadImageFromURL(rawUrl, file);
                imgList.push(upl);
              } catch (e) {
                L(tag, 'image upload fail', e.message);
              }
            }
          }

          products[key] = {
            productName : r.productName.trim(),
            description : r.description || '',
            price       : r.price,
            mrp         : r.mrp,
            sku         : r.sku,
            fit         : r.fit,
            fabric      : r.fabric,
            material    : r.material,
            category    : catDoc._id,
            subCategory : subDoc._id,
            designerRef,
            createdDate : new Date(),
            coverImage  : imgList[0] || '',
            variants    : [],
            _baseImages : imgList        // temporary for variant reuse
          };
        }

        // ---------- variant by color -----------------
        const prod   = products[key];
        let variant  = prod.variants.find(v => v.color === r.color);
        if (!variant) {
          variant = {
            color     : r.color,
            imageList : [...prod._baseImages],  // reuse, no dup upload
            sizes     : []
          };
          prod.variants.push(variant);
        }

        // size entry
        if (!variant.sizes.some(s => s.size === r.size)) {
          variant.sizes.push({
            size  : r.size,
            price : r.sizePrice ?? r.price,
            stock : r.sizeStock ?? r.stock ?? 0
          });
        }

        L(tag, 'OK');
      } catch (err) {
        L(tag, 'FAIL ⇒', err.message);
      }
    }

    // remove temp property before save
    Object.values(products).forEach(p => delete p._baseImages);

    // ─── Bulk upsert to MongoDB ────────────────────────────────
    const ops = Object.values(products).map(p => ({
      updateOne: {
        filter : { productName: p.productName },
        update : { $set: p },
        upsert : true
      }
    }));
    const bulkRes = await Product.bulkWrite(ops);
    L('bulkWrite result:', JSON.stringify(bulkRes));

    L('END ✓');
    res.status(201).json({ message: 'Bulk import complete', counts: bulkRes });
  } catch (err) {
    console.error(`[bulk:${reqId}] FATAL`, err);
    res.status(500).json({ message: 'Bulk import failed', error: err.message });
  }
};
exports.updateVariantStock = async (req, res) => {
  try {
    const { fileUrl } = req.body; // Multer handles file upload

    if (!fileUrl) {
      return res.status(400).json({ message: "No file URL provided" });
    }

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(response.data, "binary");
    // Read the Excel file from buffer
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    // Iterate through each row in Excel
    for (const row of sheetData) {
      const { productName, color, size, stock } = row;

      if (!productName || !color || !size || stock === undefined) {
        console.error(`Invalid data in row: ${JSON.stringify(row)}`);
        continue;
      }

      // Find the product by name (case-insensitive)
      const product = await Product.findOne({
        productName: new RegExp(
          `^${productName.trim().replace(/\s+/g, " ")}$`,
          "i"
        ),
      });
      if (!product) {
        console.error(`Product not found: ${productName}`);
        console.error(
          `Make sure the productName in Excel matches the database productName.`
        );
        continue;
      }

      // Find the variant by color (case-insensitive)
      const variant = product.variants.find(
        (variant) =>
          variant.color.trim().toLowerCase() === color.trim().toLowerCase()
      );

      if (!variant) {
        console.error(
          `Variant with color ${color} not found for product ${productName}`
        );
        continue;
      }

      // Find the size within the variant (case-insensitive)
      const sizeEntry = variant.sizes.find(
        (variantSize) =>
          variantSize.size.trim().toLowerCase() === size.trim().toLowerCase()
      );

      if (!sizeEntry) {
        console.error(
          `Size ${size} not found for variant color ${color} in product ${productName}`
        );
        continue;
      }

      // Update the stock for the specified size
      sizeEntry.stock = stock;

      // Save the updated product
      await product.save();
    }

    return res
      .status(200)
      .json({ message: "Stock updated successfully for variants" });
  } catch (error) {
    console.error("Error updating variant stock:", error.message);
    return res.status(500).json({
      message: "Error updating variant stock",
      error: error.message,
    });
  }
};
exports.getProducts = async (req, res) => {
  try {
    const {
      productName,
      minPrice,
      maxPrice,
      sort,
      color,
      fit,
      category,
      subCategory,
      page = 1,
      limit = 10,
    } = req.query;

    // Construct the base query
    let query = { enabled: true };

    // 1. Product name search (case-insensitive)
    if (productName) {
      query.productName = { $regex: productName, $options: "i" };
    }

    // 2. Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 3. Color filter (search in variants array)
    if (color) {
      query["variants.color"] = { $regex: color, $options: "i" };
    }

    // 4. Fit filter
    if (fit) {
      query.fit = fit;
    }

    // 5. Category filter
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (!categoryDoc) {
        return res.status(404).json({ message: "Category not found" });
      }
      query.category = categoryDoc._id;
    }

    // 6. SubCategory filter
    if (subCategory) {
      const subCategoryDoc = await SubCategory.findOne({ name: subCategory });
      if (!subCategoryDoc) {
        return res.status(404).json({ message: "SubCategory not found" });
      }
      query.subCategory = subCategoryDoc._id;
    }

    // 7. Sorting options
    let sortOptions = {};
    if (sort === "lowToHigh") {
      sortOptions.price = 1;
    } else if (sort === "highToLow") {
      sortOptions.price = -1;
    } else if (sort === "newest") {
      sortOptions.createdAt = -1;
    }

    // 8. Pagination calculations
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // 9. Main query with population and filtering
    const products = await Product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "designers",
          localField: "designerRef",
          foreignField: "_id",
          as: "designer",
        },
      },
      { $unwind: "$designer" },
      { $match: { "designer.is_approved": true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory",
        },
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      // { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $project: {
          productName: 1,
          price: 1,
          description: 1,
          variants: 1,
          fit: 1,
          images: 1,
          enabled: 1,
          createdAt: 1,
          coverImage:1,
          "category.name": 1,
          "subCategory.name": 1,
          "designer.userId": 1,
          "designer.is_approved": 1,
        },
      },
    ]);

    // 10. Count total matching products (for pagination)
    const countQuery = { ...query };
    const totalCount = await Product.countDocuments(countQuery)
      .where("designerRef")
      .in(await Designer.find({ is_approved: true }).distinct("_id"));

    // 11. Handle empty results
    if (products.length === 0) {
      return res.status(404).json({
        message: "No approved products found matching your criteria",
        total: 0,
        page: 1,
        pages: 1,
      });
    }

    // 12. Return successful response
    return res.status(200).json({
      message: "Products retrieved successfully",
      products,
      total: totalCount,
      page: pageNumber,
      pages: Math.ceil(totalCount / limitNumber),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      message: "Error fetching products",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
exports.searchProducts = async (req, res) => {
  try {
    const { searchTerm, limit } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const regex = new RegExp(searchTerm, "i"); // Case-insensitive search

    // Log the query parameters to debug input issues
    console.log("Search Term:", searchTerm);

    // Add filter for enabled: true
    const products = await Product.find({
      productName: { $regex: regex },
      enabled: true, // Only fetch enabled products
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .limit(parseInt(limit) || 10);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error searching products:", error.message);
    return res.status(500).json({
      message: "Error searching products",
      error: error.message,
    });
  }
};
exports.getLatestProducts = async (req, res) => {
  try {
    const { limit } = req.query;

    // Default limit is 10 if not provided
    const productLimit = parseInt(limit) || 10;

    // Fetch latest products from approved designers
    const latestProducts = await Product.aggregate([
      {
        $match: { enabled: true },
      },
      {
        $lookup: {
          from: "designers",
          localField: "designerRef",
          foreignField: "_id",
          as: "designer",
        },
      },
      { $unwind: "$designer" },
      { $match: { "designer.is_approved": true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory",
        },
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      { $sort: { createdDate: -1 } },
      { $limit: productLimit },
      {
        $project: {
          productName: 1,
          price: 1,
          description: 1,
          variants: 1,
          coverImage: 1,
          fit: 1,
          images: 1,
          enabled: 1,
          createdDate: 1,
          "category.name": 1,
          "subCategory.name": 1,
        },
      },
    ]);

    if (latestProducts.length === 0) {
      return res.status(404).json({
        message: "No latest products from approved designers found",
      });
    }

    return res.status(200).json({ products: latestProducts });
  } catch (error) {
    console.error("Error fetching latest products:", error);
    return res.status(500).json({
      message: "Error fetching latest products",
      error: error.message,
    });
  }
};
exports.getTotalProductCount = async (req, res) => {
  try {
    // Count the total number of documents in the Product collection
    const totalProducts = await Product.countDocuments();

    return res.status(200).json({ totalProducts });
  } catch (error) {
    console.error("Error fetching total product count:", error);
    return res.status(500).json({
      message: "Error fetching total product count",
      error: error.message,
    });
  }
};

exports.getProductsById = async (req, res) => {
  try {
    const { productId } = req.params;
    const { color } = req.query; // Accept color as a query parameter

    // Validate the productId format
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Query the product by ID
    const product = await Product.findById(productId)
      .populate("category", "name")
      .populate("subCategory", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Create availableColors array with color and a single image
    const availableColors = product.variants.map((variant) => ({
      color: variant.color,
      image:
        variant.imageList && variant.imageList.length > 0
          ? variant.imageList[0]
          : null,
    }));

    // Find the selected variant based on the color parameter, if provided
    let selectedVariant = null;
    if (color) {
      selectedVariant = product.variants.find(
        (v) => v.color.toLowerCase() === color.toLowerCase()
      );

      if (!selectedVariant) {
        return res
          .status(404)
          .json({ message: "Variant not found for this color" });
      }
    } else {
      // Default to the first variant if no color is specified
      selectedVariant = product.variants[0];
    }

    return res.status(200).json({
      productId: product._id,
      productName: product.productName,
      description: product.description,
      price: product.price,
      sku: product.sku,
      category: product.category,
      subCategory: product.subCategory,
      fit: product.fit,
      material: product.material,
      fabric: product.fabric,
      wishlistedBy: product.wishlistedBy,
      designerRef: product.designerRef,
      coverImage: product.coverImage,
      availableColors: availableColors, // Now includes color and single image
      variant: selectedVariant,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

exports.toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate the productId
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Toggle the enabled field
    product.enabled = !product.enabled;

    // Save the updated product
    await product.save();

    // Return success response
    return res.status(200).json({
      message: `Product ${
        product.enabled ? "enabled" : "disabled"
      } successfully`,
      product,
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    return res.status(500).json({
      message: "Error toggling product status",
      error: error.message,
    });
  }
};
exports.getProductsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { fit, color, minPrice, maxPrice, sortBy, sortOrder } = req.query;

    // Validate the subCategoryId format
    if (!mongoose.isValidObjectId(subCategoryId)) {
      return res.status(400).json({ message: "Invalid subCategory ID" });
    }

    // Build the base query
    const query = {
      subCategory: new mongoose.Types.ObjectId(subCategoryId), // Fixed: added 'new'
      enabled: true,
    };

    // Handle fit filter
    if (fit) {
      const fitArray = fit.split(",").map((f) => f.trim());
      query.fit = { $in: fitArray };
    }

    // Handle color filter
    if (color) {
      const colorArray = color.split(",").map((c) => c.trim());
      query["variants.color"] = { $in: colorArray };
    }

    // Handle price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Handle sorting
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      // Default sorting if not specified
      sortOptions.createdDate = -1;
    }

    // Fetch products with aggregation pipeline
    const products = await Product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "designers",
          localField: "designerRef",
          foreignField: "_id",
          as: "designer",
        },
      },
      { $unwind: "$designer" },
      { $match: { "designer.is_approved": true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory",
        },
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      { $sort: sortOptions },
      {
        $project: {
          productName: 1,
          price: 1,
          description: 1,
          variants: 1,
          fit: 1,
          coverImage: 1,
          images: 1,
          enabled: 1,
          createdDate: 1,
          "category.name": 1,
          "subCategory.name": 1,
        },
      },
    ]);

    if (products.length === 0) {
      return res.status(404).json({
        message: "No approved products found for this subcategory",
      });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products by subcategory:", error);
    return res.status(500).json({
      message: "Error fetching products by subcategory",
      error: error.message,
    });
  }
};

exports.getProductVariantByColor = async (req, res) => {
  try {
    const { productId, color } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!color) {
      return res.status(400).json({ message: "Color is required" });
    }

    // Find the product by ID
    const product = await Product.findById(productId)
      .populate("category", "name")
      .populate("subCategory", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find the variant with the specified color
    const variant = product.variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase()
    );

    if (!variant) {
      return res
        .status(404)
        .json({ message: "Variant not found for this color" });
    }

    // Return the variant along with the product details
    return res.status(200).json({
      productId: product._id,
      productName: product.productName,
      description: product.description,
      category: product.category,
      subCategory: product.subCategory,
      fit: product.fit,
      material: product.material,
      fabric: product.fabric,
      designerRef: product.designerRef,
      coverImage: product.coverImage,
      wishlistedBy: product.wishlistedBy,
      variant: variant,
    });
  } catch (error) {
    console.error("Error fetching product variant:", error);
    return res.status(500).json({
      message: "Error fetching product variant",
      error: error.message,
    });
  }
};

exports.getProductsByDesigner = async (req, res) => {
  try {
    const { designerRef } = req.params;
    const {
      category,
      subCategory,
      color,
      fit,
      minPrice,
      maxPrice,
      sortBy,
      order,
    } = req.query;

    // Validate if designerRef is provided
    if (!designerRef) {
      return res
        .status(400)
        .json({ message: "Designer reference is required" });
    }

    // Build the query object dynamically
    const query = { designerRef };

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (color) query.color = color;
    if (fit) query.fit = fit;

    // Handle optional price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Create the products query
    let productsQuery = Product.find(query)
      .populate("category", "name")
      .populate("subCategory", "name");

    // Handle optional sorting
    if (sortBy) {
      const sortOrder = order === "desc" ? -1 : 1; // Default order is ascending
      productsQuery = productsQuery.sort({ [sortBy]: sortOrder });
    }

    // Execute the query
    const products = await productsQuery;

    // Check if products were found
    if (!products.length) {
      return res
        .status(404)
        .json({ message: "No products found for this designer" });
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products by designer:", error);
    return res.status(500).json({
      message: "Error fetching products by designer",
      error: error.message,
    });
  }
};

exports.searchProductsAdvanced = async (req, res) => {
  try {
    const {
      searchTerm, // Keyword search for product name
      category, // Filter by category name
      subCategory, // Filter by subcategory name
      minPrice, // Minimum price filter
      maxPrice, // Maximum price filter
      color, // Filter by product color
      fit, // Filter by product fit
      sortBy, // Sort by field (e.g., price, name)
      order = "asc", // Order of sorting (asc/desc)
      page = 1, // Pagination: page number
      limit = 10, // Pagination: items per page
    } = req.query;

    // Build dynamic query object
    let query = {};

    // 1. Search term for product name (case-insensitive)
    if (searchTerm) {
      query.productName = { $regex: new RegExp(searchTerm, "i") };
    }

    // 2. Filter by category (ensure valid ID query)
    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (!categoryDoc) {
        return res.status(404).json({ message: "Category not found" });
      }
      query.category = categoryDoc._id.toString(); // Store as a string to prevent ObjectId conflicts
    }

    // 3. Filter by subcategory
    if (subCategory) {
      const subCategoryDoc = await SubCategory.findOne({ name: subCategory });
      if (!subCategoryDoc) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      query.subCategory = subCategoryDoc._id.toString();
    }

    // 4. Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // 5. Filter by color within product variants
    if (color) {
      query["variants.color"] = { $regex: new RegExp(color, "i") };
    }

    // 6. Filter by fit
    if (fit) {
      query.fit = fit;
    }

    // 7. Set up sorting (default to ascending order)
    let sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = order === "desc" ? -1 : 1;
    }

    // 8. Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 9. Execute the query with filters, sorting, and pagination
    const products = await Product.find(query)
      .populate("category", "name") // Populate category name
      .populate("subCategory", "name") // Populate subCategory name
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    // 10. Handle case where no products are found
    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    // 11. Return the list of products with pagination info
    const totalProducts = await Product.countDocuments(query);
    return res.status(200).json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error.message);
    return res.status(500).json({
      message: "Error searching products",
      error: error.message,
    });
  }
};

exports.getTotalProductsByDesigner = async (req, res) => {
  try {
    const { designerId } = req.params;

    // Validate designerId
    if (!designerId) {
      return res.status(400).json({ message: "Designer ID is required" });
    }

    // Count the number of products by designer ID
    const totalProducts = await Product.countDocuments({
      designerRef: designerId,
    });

    return res.status(200).json({
      totalProducts,
    });
  } catch (error) {
    console.error("Error fetching total products by designer:", error.message);
    return res.status(500).json({
      message: "Error fetching total products by designer",
      error: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Ensure the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update the product with the provided fields
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res
      .status(200)
      .json({ message: "Product updated successfully", updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};
