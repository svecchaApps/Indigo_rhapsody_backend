const mongoose = require("mongoose");
const Product = require("../models/productModels");
const Designer = require("../models/designerModel");
const Category = require("../models/categoryModel");
const SubCategory = require("../models/subcategoryModel");
const { bucket } = require("../service/firebaseServices"); // Firebase storage configuration
const axios = require("axios"); // To fetch images from URLs
const xlsx = require("xlsx"); // Add this at the top of your file
const { v4: uuid } = require("uuid");

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
  const reqId = uuid(); // correlation for all logs
  const L = (...a) => console.log(`[bulk:${reqId}]`, ...a);

  try {
    L("START");

    // ─── Basic input check ─────────────────────────────────────
    const { fileUrl, designerRef } = req.body;
    if (!fileUrl) return res.status(400).json({ message: "fileUrl required" });
    if (!designerRef)
      return res.status(400).json({ message: "designerRef required" });

    // ─── Download spreadsheet ──────────────────────────────────
    L("GET", fileUrl);
    const { data: buf } = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    // ─── Parse first sheet to JSON ─────────────────────────────
    const wb = xlsx.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    L(`sheet "${sheetName}" rows:`, rows.length);
    if (!rows.length) throw new Error("Spreadsheet has no data rows");

    // ─── Build product map in memory ───────────────────────────
    const products = {}; // key = productName (lower)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const tag = `row:${i + 2}`; // +2 for 1-based Excel lines

      try {
        // ---------- mandatory column check ----------
        ["productName", "category", "subCategory", "color", "size"].forEach(
          (c) => {
            if (!r[c]) throw new Error(`missing ${c}`);
          }
        );

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
          ),
        ]);
        if (!subDoc.category)
          await SubCategory.updateOne(
            { _id: subDoc._id },
            { category: catDoc._id }
          );

        // ---------- product skeleton -----------------
        const key = r.productName.trim().toLowerCase();
        const firstSeen = !products[key];
        if (firstSeen) {
          // collect images once per product
          const imgList = [];
          if (r.ImageList) {
            for (const rawUrl of r.ImageList.split(",")
              .map((s) => s.trim())
              .filter(Boolean)) {
              try {
                const file = rawUrl.split("/").pop();
                const upl = await uploadImageFromURL(rawUrl, file);
                imgList.push(upl);
              } catch (e) {
                L(tag, "image upload fail", e.message);
              }
            }
          }

          products[key] = {
            productName: r.productName.trim(),
            description: r.description || "",
            price: r.price,
            mrp: r.mrp,
            sku: r.sku,
            fit: r.fit,
            fabric: r.fabric,
            material: r.material,
            category: catDoc._id,
            subCategory: subDoc._id,
            designerRef,
            createdDate: new Date(),
            coverImage: imgList[0] || "",
            variants: [],
            _baseImages: imgList, // temporary for variant reuse
          };
        }

        // ---------- variant by color -----------------
        const prod = products[key];
        let variant = prod.variants.find((v) => v.color === r.color);
        if (!variant) {
          variant = {
            color: r.color,
            imageList: [...prod._baseImages], // reuse, no dup upload
            sizes: [],
          };
          prod.variants.push(variant);
        }

        // size entry
        if (!variant.sizes.some((s) => s.size === r.size)) {
          variant.sizes.push({
            size: r.size,
            price: r.sizePrice ?? r.price,
            stock: r.sizeStock ?? r.stock ?? 0,
          });
        }

        L(tag, "OK");
      } catch (err) {
        L(tag, "FAIL ⇒", err.message);
      }
    }

    // remove temp property before save
    Object.values(products).forEach((p) => delete p._baseImages);

    // ─── Bulk upsert to MongoDB ────────────────────────────────
    const ops = Object.values(products).map((p) => ({
      updateOne: {
        filter: { productName: p.productName },
        update: { $set: p },
        upsert: true,
      },
    }));
    const bulkRes = await Product.bulkWrite(ops);
    L("bulkWrite result:", JSON.stringify(bulkRes));

    L("END ✓");
    res.status(201).json({ message: "Bulk import complete", counts: bulkRes });
  } catch (err) {
    console.error(`[bulk:${reqId}] FATAL`, err);
    res.status(500).json({ message: "Bulk import failed", error: err.message });
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
          coverImage: 1,
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
    const userId = req.user?.id; // Get user ID from auth middleware (optional)

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

    // Track product view if user is authenticated (not guest)
    if (userId && req.user?.role !== "Guest") {
      try {
        const User = require("../models/userModel");
        const user = await User.findById(userId);

        if (user) {
          // Remove existing entry for this product if it exists
          user.recentlyViewedProducts = user.recentlyViewedProducts.filter(
            (item) => item.productId.toString() !== productId
          );

          // Add the new view at the beginning (most recent first)
          user.recentlyViewedProducts.unshift({
            productId: productId,
            viewedAt: new Date(),
          });

          // Keep only the last 20 viewed products
          if (user.recentlyViewedProducts.length > 20) {
            user.recentlyViewedProducts = user.recentlyViewedProducts.slice(
              0,
              20
            );
          }

          await user.save();
        }
      } catch (trackError) {
        // Log the error but don't fail the main request
        console.error("Error tracking product view:", trackError.message);
      }
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
      returnPolicy: {
        returnable: product.returnable !== undefined ? product.returnable : true,
        return_Policy: product.return_Policy || "",
        return_Window: product.return_Window !== undefined && product.return_Window !== null ? product.return_Window : 7,
        return_Window_Unit: product.return_Window_Unit || "days",
      },
      materialAndCare: {
        material: product.material,
        material_Details: product.material_Details,
        fabric: product.fabric,
        care_Instructions: product.care_Instructions,
      },
      userType: userId
        ? req.user?.role === "Guest"
          ? "guest"
          : "authenticated"
        : "anonymous",
      trackingEnabled: userId && req.user?.role !== "Guest",
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
    const userId = req.user?.id; // Get user ID from auth middleware (optional)

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
          _id: 1,
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

    // Track product views for authenticated users (not guests)
    if (userId && req.user?.role !== "Guest") {
      try {
        const User = require("../models/userModel");
        const user = await User.findById(userId);

        if (user) {
          // Track each product in the subcategory view
          for (const product of products) {
            // Remove existing entry for this product if it exists
            user.recentlyViewedProducts = user.recentlyViewedProducts.filter(
              (item) => item.productId.toString() !== product._id.toString()
            );

            // Add the new view at the beginning (most recent first)
            user.recentlyViewedProducts.unshift({
              productId: product._id,
              viewedAt: new Date(),
            });
          }

          // Keep only the last 20 viewed products
          if (user.recentlyViewedProducts.length > 20) {
            user.recentlyViewedProducts = user.recentlyViewedProducts.slice(
              0,
              20
            );
          }

          await user.save();
        }
      } catch (trackError) {
        // Log the error but don't fail the main request
        console.error(
          "Error tracking subcategory product views:",
          trackError.message
        );
      }
    }

    return res.status(200).json({
      products,
      userType: userId
        ? req.user?.role === "Guest"
          ? "guest"
          : "authenticated"
        : "anonymous",
      trackingEnabled: userId && req.user?.role !== "Guest",
    });
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
    const query = { designerRef,  $or: [{ enabled: true }, { enabled: { $exists: false } }],
 };

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

exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10, random = false } = req.query;

    // Build the query for trending products
    let query = { isTrending: true };

    let products;

    if (random === "true") {
      // Get random trending products using MongoDB's $sample aggregation
      products = await Product.aggregate([
        { $match: query },
        { $sample: { size: parseInt(limit) } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "subcategories",
            localField: "subCategory",
            foreignField: "_id",
            as: "subCategory",
          },
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$subCategory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            category: { name: 1 },
            subCategory: { name: 1 },
            productName: 1,
            description: 1,
            price: 1,
            mrp: 1,
            discount: 1,
            coverImage: 1,
            variants: 1,
            averageRating: 1,
            totalRatings: 1,
            isTrending: 1,
            enabled: 1,
            in_stock: 1,
            stock: 1,
            createdDate: 1,
          },
        },
      ]);
    } else {
      // Get trending products in order (most recent first)
      products = await Product.find(query)
        .populate("category", "name")
        .populate("subCategory", "name")
        .sort({ createdDate: -1 })
        .limit(parseInt(limit));
    }

    if (products.length === 0) {
      return res.status(404).json({
        message: "No trending products found",
        products: [],
      });
    }

    return res.status(200).json({
      message: "Trending products retrieved successfully",
      products,
      totalCount: products.length,
      isRandom: random === "true",
    });
  } catch (error) {
    console.error("Error fetching trending products:", error.message);
    return res.status(500).json({
      message: "Error fetching trending products",
      error: error.message,
    });
  }
};

exports.toggleTrendingStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    // Ensure the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Toggle the trending status
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: { isTrending: !product.isTrending } },
      { new: true }
    )
      .populate("category", "name")
      .populate("subCategory", "name");

    return res.status(200).json({
      message: `Product ${
        updatedProduct.isTrending ? "marked as" : "removed from"
      } trending successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error toggling trending status:", error.message);
    return res.status(500).json({
      message: "Error toggling trending status",
      error: error.message,
    });
  }
};

exports.trackProductView = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id; // Get user ID from auth middleware

    // Validate productId
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Verify the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get user and update recently viewed products
    const User = require("../models/userModel");
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove existing entry for this product if it exists
    user.recentlyViewedProducts = user.recentlyViewedProducts.filter(
      (item) => item.productId.toString() !== productId
    );

    // Add the new view at the beginning (most recent first)
    user.recentlyViewedProducts.unshift({
      productId: productId,
      viewedAt: new Date(),
    });

    // Keep only the last 20 viewed products
    if (user.recentlyViewedProducts.length > 20) {
      user.recentlyViewedProducts = user.recentlyViewedProducts.slice(0, 20);
    }

    await user.save();

    return res.status(200).json({
      message: "Product view tracked successfully",
      productId: productId,
    });
  } catch (error) {
    console.error("Error tracking product view:", error.message);
    return res.status(500).json({
      message: "Error tracking product view",
      error: error.message,
    });
  }
};

exports.getRecentlyViewedProducts = async (req, res) => {
  try {
    const userId = req.user?.id; // Get user ID from auth middleware
    const { limit = 10 } = req.query;

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Get user with recently viewed products
    const User = require("../models/userModel");
    const user = await User.findById(userId).populate({
      path: "recentlyViewedProducts.productId",
      populate: [
        { path: "category", select: "name" },
        { path: "subCategory", select: "name" },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the recently viewed products with populated data
    const recentlyViewed = user.recentlyViewedProducts
      .filter((item) => item.productId) // Filter out any null products
      .slice(0, parseInt(limit))
      .map((item) => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        description: item.productId.description,
        price: item.productId.price,
        mrp: item.productId.mrp,
        discount: item.productId.discount,
        coverImage: item.productId.coverImage,
        variants: item.productId.variants,
        category: item.productId.category,
        subCategory: item.productId.subCategory,
        averageRating: item.productId.averageRating,
        totalRatings: item.productId.totalRatings,
        viewedAt: item.viewedAt,
      }));

    return res.status(200).json({
      message: "Recently viewed products retrieved successfully",
      products: recentlyViewed,
      totalCount: recentlyViewed.length,
    });
  } catch (error) {
    console.error("Error fetching recently viewed products:", error.message);
    return res.status(500).json({
      message: "Error fetching recently viewed products",
      error: error.message,
    });
  }
};

exports.clearRecentlyViewedProducts = async (req, res) => {
  try {
    const userId = req.user?.id; // Get user ID from auth middleware

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Get user and clear recently viewed products
    const User = require("../models/userModel");
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear the recently viewed products array
    user.recentlyViewedProducts = [];
    await user.save();

    return res.status(200).json({
      message: "Recently viewed products cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing recently viewed products:", error.message);
    return res.status(500).json({
      message: "Error clearing recently viewed products",
      error: error.message,
    });
  }
};

// Get all products with complete information
exports.getAllProductsWithCompleteInfo = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = "newest",
      enabled = true,
      includeDisabled = false,
      designerId,
      categoryId,
      subCategoryId,
      isTrending,
      inStock,
      minPrice,
      maxPrice,
      search
    } = req.query;

    // Build base query
    let query = {};
    
    // Filter by enabled status
    if (!includeDisabled) {
      query.enabled = enabled === 'true' || enabled === true;
    }

    // Filter by designer
    if (designerId) {
      query.designerRef = new mongoose.Types.ObjectId(designerId);
    }

    // Filter by category
    if (categoryId) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }

    // Filter by subcategory
    if (subCategoryId) {
      query.subCategory = new mongoose.Types.ObjectId(subCategoryId);
    }

    // Filter by trending status
    if (isTrending !== undefined) {
      query.isTrending = isTrending === 'true' || isTrending === true;
    }

    // Filter by stock status
    if (inStock !== undefined) {
      query.in_stock = inStock === 'true' || inStock === true;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search by product name
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'newest':
        sortOptions.createdDate = -1;
        break;
      case 'oldest':
        sortOptions.createdDate = 1;
        break;
      case 'price_low_to_high':
        sortOptions.price = 1;
        break;
      case 'price_high_to_low':
        sortOptions.price = -1;
        break;
      case 'name_asc':
        sortOptions.productName = 1;
        break;
      case 'name_desc':
        sortOptions.productName = -1;
        break;
      case 'rating':
        sortOptions.averageRating = -1;
        break;
      case 'trending':
        sortOptions.isTrending = -1;
        break;
      default:
        sortOptions.createdDate = -1;
    }

    // Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Main aggregation pipeline
    const products = await Product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "designers",
          localField: "designerRef",
          foreignField: "_id",
          as: "designer"
        }
      },
      { $unwind: { path: "$designer", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "designer.userId",
          foreignField: "_id",
          as: "designer.userId"
        }
      },
      { $unwind: { path: "$designer.userId", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subcategories",
          localField: "subCategory",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "reviews.userId",
          foreignField: "_id",
          as: "reviewUsers"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "wishlistedBy",
          foreignField: "_id",
          as: "wishlistUsers"
        }
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $project: {
          // Basic product information
          productName: 1,
          description: 1,
          price: 1,
          mrp: 1,
          sku: 1,
          enabled: 1,
          in_stock: 1,
          stock: 1,
          coverImage: 1,
          createdDate: 1,
          updatedAt: 1,
          
          // Product details
          fit: 1,
          productDetails: 1,
          material: 1,
          fabric: 1,
          is_customizable: 1,
          is_sustainable: 1,
          
          // Business logic
          discount: 1,
          isTrending: 1,
          returnable: 1,
          return_Policy: 1,
          return_Window: 1,
          return_Window_Unit: 1,
          
          // Material and Care
          material_Details: 1,
          care_Instructions: 1,
          
          // Variants and sizes
          variants: 1,
          
          // Reviews and ratings
          reviews: 1,
          totalRatings: 1,
          averageRating: 1,
          
          // Wishlist
          wishlistedBy: 1,
          wishlistCount: { $size: "$wishlistedBy" },
          
          // Populated references
          designer: {
            _id: "$designer._id",
            displayName: "$designer.userId.displayName",
            userId: {
              _id: "$designer.userId._id",
              displayName: "$designer.userId.displayName"
            },
            logoUrl: "$designer.logoUrl",
            backGroundImage: "$designer.backGroundImage",
            is_approved: "$designer.is_approved",
            pickup_location_name: "$designer.pickup_location_name",
            shortDescription: "$designer.shortDescription",
            about: "$designer.about",
            status: "$designer.status",
            createdTime: "$designer.createdTime",
            updatedTime: "$designer.updatedTime"
          },
          category: {
            _id: "$category._id",
            name: "$category.name",
            description: "$category.description",
            image: "$category.image"
          },
          subCategory: {
            _id: "$subCategory._id",
            name: "$subCategory.name",
            description: "$subCategory.description",
            image: "$subCategory.image"
          },
          
          // Computed fields
          discountPercentage: {
            $cond: {
              if: { $gt: ["$mrp", 0] },
              then: {
                $round: [
                  { $multiply: [{ $divide: [{ $subtract: ["$mrp", "$price"] }, "$mrp"] }, 100] },
                  2
                ]
              },
              else: 0
            }
          },
          
          // Review details with user information
          reviewDetails: {
            $map: {
              input: "$reviews",
              as: "review",
              in: {
                _id: "$$review._id",
                rating: "$$review.rating",
                comment: "$$review.comment",
                createdDate: "$$review.createdDate",
                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$reviewUsers",
                        as: "user",
                        cond: { $eq: ["$$user._id", "$$review.userId"] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await Product.countDocuments(query);

    // Calculate additional statistics
    const stats = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          totalStock: { $sum: "$stock" },
          trendingProducts: {
            $sum: { $cond: ["$isTrending", 1, 0] }
          },
          inStockProducts: {
            $sum: { $cond: ["$in_stock", 1, 0] }
          }
        }
      }
    ]);

    // Handle empty results
    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No products found matching the criteria",
        data: {
          products: [],
          pagination: {
            total: 0,
            page: pageNumber,
            pages: 0,
            limit: limitNumber,
            hasNext: false,
            hasPrev: false
          },
          stats: {
            totalProducts: 0,
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
            totalStock: 0,
            trendingProducts: 0,
            inStockProducts: 0
          }
        }
      });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: {
        products,
        pagination: {
          total: totalCount,
          page: pageNumber,
          pages: Math.ceil(totalCount / limitNumber),
          limit: limitNumber,
          hasNext: pageNumber < Math.ceil(totalCount / limitNumber),
          hasPrev: pageNumber > 1
        },
        stats: stats[0] || {
          totalProducts: 0,
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalStock: 0,
          trendingProducts: 0,
          inStockProducts: 0
        }
      }
    });

  } catch (error) {
    console.error("Error fetching products with complete info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Bulk update products via CSV
exports.bulkUpdateProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded"
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const csvData = XLSX.utils.sheet_to_json(worksheet);

    if (!csvData || csvData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty or invalid"
      });
    }

    // Validate required headers
    const requiredHeaders = ['Product ID'];
    const firstRow = csvData[0];
    const headers = Object.keys(firstRow);
    
    if (!headers.includes('Product ID')) {
      return res.status(400).json({
        success: false,
        message: "CSV must contain 'Product ID' column for matching products"
      });
    }

    const results = {
      total: csvData.length,
      updated: 0,
      notFound: 0,
      errors: [],
      success: []
    };

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because CSV is 1-indexed and we skip header

      try {
        const productId = row['Product ID'];
        
        if (!productId) {
          results.errors.push({
            row: rowNumber,
            error: "Product ID is missing"
          });
          continue;
        }

        // Validate Product ID format (MongoDB ObjectId)
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          results.errors.push({
            row: rowNumber,
            productId: productId,
            error: "Invalid Product ID format"
          });
          continue;
        }

        // Find product by Product ID (MongoDB _id)
        const product = await Product.findById(productId);
        
        if (!product) {
          results.notFound++;
          results.errors.push({
            row: rowNumber,
            productId: productId,
            error: "Product not found"
          });
          continue;
        }

        // Prepare update object
        const updateData = {};

        // Map CSV columns to product fields - only update if value is provided and not empty
        if (row['Product Name'] !== undefined && row['Product Name'] !== null && row['Product Name'].toString().trim() !== '') {
          updateData.productName = row['Product Name'].toString().trim();
        }
        
        if (row['SKU'] !== undefined && row['SKU'] !== null && row['SKU'].toString().trim() !== '') {
          updateData.sku = row['SKU'].toString().trim();
        }
        
        if (row['Description'] !== undefined && row['Description'] !== null && row['Description'].toString().trim() !== '') {
          updateData.description = row['Description'].toString().trim();
        }
        
        if (row['Designer Price'] !== undefined && row['Designer Price'] !== null && row['Designer Price'].toString().trim() !== '') {
          const price = parseFloat(row['Designer Price']);
          if (!isNaN(price) && price >= 0) {
            updateData.price = price;
          }
        }
        
        if (row['MRP'] !== undefined && row['MRP'] !== null && row['MRP'].toString().trim() !== '') {
          const mrp = parseFloat(row['MRP']);
          if (!isNaN(mrp) && mrp >= 0) {
            updateData.mrp = mrp;
          }
        }
        
        if (row['Discount %'] !== undefined && row['Discount %'] !== null && row['Discount %'].toString().trim() !== '') {
          const discount = parseFloat(row['Discount %']);
          if (!isNaN(discount) && discount >= 0) {
            updateData.discount = discount;
          }
        }
        
        if (row['Fit'] !== undefined && row['Fit'] !== null && row['Fit'].toString().trim() !== '') {
          updateData.fit = row['Fit'].toString().trim();
        }
        
        if (row['Fabric'] !== undefined && row['Fabric'] !== null && row['Fabric'].toString().trim() !== '') {
          updateData.fabric = row['Fabric'].toString().trim();
        }
        
        if (row['Material'] !== undefined && row['Material'] !== null && row['Material'].toString().trim() !== '') {
          updateData.material = row['Material'].toString().trim();
        }
        
        if (row['Status'] !== undefined && row['Status'] !== null && row['Status'].toString().trim() !== '') {
          const status = row['Status'].toString().trim().toLowerCase();
          if (status === 'enabled' || status === 'true' || status === 'disabled' || status === 'false') {
            updateData.enabled = status === 'enabled' || status === 'true';
          }
        }
        
        if (row['In Stock'] !== undefined && row['In Stock'] !== null && row['In Stock'].toString().trim() !== '') {
          const inStock = row['In Stock'].toString().trim().toLowerCase();
          if (inStock === 'true' || inStock === 'yes' || inStock === 'false' || inStock === 'no') {
            updateData.in_stock = inStock === 'true' || inStock === 'yes';
          }
        }
        
        if (row['Returnable'] !== undefined && row['Returnable'] !== null && row['Returnable'].toString().trim() !== '') {
          const returnable = row['Returnable'].toString().trim().toLowerCase();
          if (returnable === 'true' || returnable === 'yes' || returnable === 'false' || returnable === 'no') {
            updateData.returnable = returnable === 'true' || returnable === 'yes';
          }
        }
        
        if (row['Trending'] !== undefined && row['Trending'] !== null && row['Trending'].toString().trim() !== '') {
          const trending = row['Trending'].toString().trim().toLowerCase();
          if (trending === 'true' || trending === 'yes' || trending === 'false' || trending === 'no') {
            updateData.isTrending = trending === 'true' || trending === 'yes';
          }
        }
        
        if (row['Total Stock'] !== undefined && row['Total Stock'] !== null && row['Total Stock'].toString().trim() !== '') {
          const stock = parseInt(row['Total Stock']);
          if (!isNaN(stock) && stock >= 0) {
            updateData.stock = stock;
          }
        }

        // Handle category and subcategory by name (if provided)
        if (row['Category'] !== undefined && row['Category'] !== null && row['Category'].toString().trim() !== '') {
          const category = await mongoose.model('Category').findOne({ 
            name: { $regex: new RegExp(row['Category'].toString().trim(), 'i') } 
          });
          if (category) {
            updateData.category = category._id;
          }
        }

        if (row['Sub Category'] !== undefined && row['Sub Category'] !== null && row['Sub Category'].toString().trim() !== '') {
          const subCategory = await mongoose.model('SubCategory').findOne({ 
            name: { $regex: new RegExp(row['Sub Category'].toString().trim(), 'i') } 
          });
          if (subCategory) {
            updateData.subCategory = subCategory._id;
          }
        }

        // Handle designer by name (if provided)
        if (row['Designer'] !== undefined && row['Designer'] !== null && row['Designer'].toString().trim() !== '') {
          const designer = await mongoose.model('Designer').findOne({
            'userId.displayName': { $regex: new RegExp(row['Designer'].toString().trim(), 'i') }
          }).populate('userId');
          
          if (designer) {
            updateData.designerRef = designer._id;
          }
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length === 0) {
          results.success.push({
            row: rowNumber,
            productId: productId,
            sku: product.sku,
            productName: product.productName,
            message: "No fields to update - product unchanged"
          });
        } else {
          // Update product
          const updatedProduct = await Product.findByIdAndUpdate(
            product._id,
            updateData,
            { new: true, runValidators: true }
          );

          if (updatedProduct) {
            results.updated++;
            results.success.push({
              row: rowNumber,
              productId: productId,
              sku: updatedProduct.sku,
              productName: updatedProduct.productName,
              message: "Product updated successfully",
              updatedFields: Object.keys(updateData)
            });
          }
        }

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          productId: row['Product ID'] || 'Unknown',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk update completed",
      data: results
    });

  } catch (error) {
    console.error("Error in bulk update:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing bulk update",
      error: error.message
    });
  }
};

// Add or Update Return Policy for a Product
exports.addReturnPolicy = async (req, res) => {
  try {
    const { productId } = req.params;
    const { returnable, return_Policy, return_Window, return_Window_Unit } = req.body;

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Build update object with only provided fields
    const updateData = {};

    // Update returnable status if provided
    if (returnable !== undefined) {
      updateData.returnable = returnable;
    }

    // Update return policy if provided
    if (return_Policy !== undefined) {
      if (typeof return_Policy !== 'string' || return_Policy.trim() === '') {
        return res.status(400).json({
          success: false,
          message: "Return policy must be a non-empty string",
        });
      }
      updateData.return_Policy = return_Policy.trim();
    }

    // Update return window if provided
    if (return_Window !== undefined) {
      if (typeof return_Window !== 'number' || return_Window < 0) {
        return res.status(400).json({
          success: false,
          message: "Return window must be a positive number",
        });
      }
      updateData.return_Window = return_Window;
    }

    // Update return window unit if provided
    if (return_Window_Unit !== undefined) {
      const validUnits = ['days', 'weeks', 'months'];
      if (!validUnits.includes(return_Window_Unit.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Return window unit must be one of: ${validUnits.join(', ')}`,
        });
      }
      updateData.return_Window_Unit = return_Window_Unit.toLowerCase();
    }

    // Check if at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one return policy field must be provided for update",
      });
    }

    // If returnable is true, ensure required fields are present
    if (updateData.returnable === true || (updateData.returnable === undefined && product.returnable === true)) {
      const finalReturnable = updateData.returnable !== undefined ? updateData.returnable : product.returnable;
      const finalReturnPolicy = updateData.return_Policy || product.return_Policy;
      const finalReturnWindow = updateData.return_Window !== undefined ? updateData.return_Window : product.return_Window;
      const finalReturnWindowUnit = updateData.return_Window_Unit || product.return_Window_Unit;

      if (!finalReturnPolicy || !finalReturnWindow || !finalReturnWindowUnit) {
        return res.status(400).json({
          success: false,
          message: "When returnable is true, return_Policy, return_Window, and return_Window_Unit are required",
        });
      }
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('designerRef', 'userId').populate('category', 'name').populate('subCategory', 'name');

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found after update attempt",
      });
    }

    console.log(`✅ Return policy updated for product: ${productId}`);

    return res.status(200).json({
      success: true,
      message: "Return policy updated successfully",
      data: {
        productId: updatedProduct._id,
        productName: updatedProduct.productName,
        returnable: updatedProduct.returnable,
        return_Policy: updatedProduct.return_Policy,
        return_Window: updatedProduct.return_Window,
        return_Window_Unit: updatedProduct.return_Window_Unit,
      },
    });
  } catch (error) {
    console.error("Error adding/updating return policy:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating return policy",
      error: error.message,
    });
  }
};

// Get Return Policy for a Product
exports.getReturnPolicy = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Find the product and select only return policy fields
    const product = await Product.findById(productId).select(
      'productName returnable return_Policy return_Window return_Window_Unit'
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Return policy retrieved successfully",
      data: {
        productId: product._id,
        productName: product.productName,
        returnable: product.returnable,
        return_Policy: product.return_Policy,
        return_Window: product.return_Window,
        return_Window_Unit: product.return_Window_Unit,
      },
    });
  } catch (error) {
    console.error("Error getting return policy:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving return policy",
      error: error.message,
    });
  }
};

// Bulk Update Return Policy for Multiple Products
exports.bulkUpdateReturnPolicy = async (req, res) => {
  try {
    const { products, returnable, return_Policy, return_Window, return_Window_Unit } = req.body;

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and must not be empty",
      });
    }

    // Validate at least one return policy field is provided
    if (returnable === undefined && !return_Policy && return_Window === undefined && !return_Window_Unit) {
      return res.status(400).json({
        success: false,
        message: "At least one return policy field must be provided",
      });
    }

    // Validate return window unit if provided
    if (return_Window_Unit) {
      const validUnits = ['days', 'weeks', 'months'];
      if (!validUnits.includes(return_Window_Unit.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Return window unit must be one of: ${validUnits.join(', ')}`,
        });
      }
    }

    // Build update data
    const updateData = {};
    if (returnable !== undefined) updateData.returnable = returnable;
    if (return_Policy) updateData.return_Policy = return_Policy.trim();
    if (return_Window !== undefined) updateData.return_Window = return_Window;
    if (return_Window_Unit) updateData.return_Window_Unit = return_Window_Unit.toLowerCase();

    const results = {
      success: [],
      failed: [],
      total: products.length,
    };

    // Update each product
    for (const productId of products) {
      try {
        // Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          results.failed.push({
            productId,
            error: "Invalid product ID format",
          });
          continue;
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
          results.failed.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (updatedProduct) {
          results.success.push({
            productId: updatedProduct._id,
            productName: updatedProduct.productName,
          });
        } else {
          results.failed.push({
            productId,
            error: "Failed to update product",
          });
        }
      } catch (error) {
        results.failed.push({
          productId,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk return policy update completed. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    console.error("Error in bulk return policy update:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing bulk return policy update",
      error: error.message,
    });
  }
};

// Add or Update Material and Care Information for a Product
exports.addMaterialAndCare = async (req, res) => {
  try {
    const { productId } = req.params;
    const { material_Details, care_Instructions } = req.body;

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Build update object with only provided fields
    const updateData = {};

    // Update material details if provided
    if (material_Details !== undefined) {
      if (typeof material_Details !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Material details must be a string",
        });
      }
      updateData.material_Details = material_Details.trim();
    }

    // Update care instructions if provided
    if (care_Instructions !== undefined) {
      if (typeof care_Instructions !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Care instructions must be a string",
        });
      }
      updateData.care_Instructions = care_Instructions.trim();
    }

    // Check if at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field (material_Details or care_Instructions) must be provided for update",
      });
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('designerRef', 'userId').populate('category', 'name').populate('subCategory', 'name');

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found after update attempt",
      });
    }

    console.log(`✅ Material and care information updated for product: ${productId}`);

    return res.status(200).json({
      success: true,
      message: "Material and care information updated successfully",
      data: {
        productId: updatedProduct._id,
        productName: updatedProduct.productName,
        material_Details: updatedProduct.material_Details,
        care_Instructions: updatedProduct.care_Instructions,
      },
    });
  } catch (error) {
    console.error("Error adding/updating material and care:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating material and care information",
      error: error.message,
    });
  }
};

// Get Material and Care Information for a Product
exports.getMaterialAndCare = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Find the product and select only material and care fields
    const product = await Product.findById(productId).select(
      'productName material material_Details fabric care_Instructions'
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Material and care information retrieved successfully",
      data: {
        productId: product._id,
        productName: product.productName,
        material: product.material,
        material_Details: product.material_Details,
        fabric: product.fabric,
        care_Instructions: product.care_Instructions,
      },
    });
  } catch (error) {
    console.error("Error getting material and care:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving material and care information",
      error: error.message,
    });
  }
};

// Bulk Update Material and Care for Multiple Products
exports.bulkUpdateMaterialAndCare = async (req, res) => {
  try {
    const { products, material_Details, care_Instructions } = req.body;

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required and must not be empty",
      });
    }

    // Validate at least one field is provided
    if (!material_Details && !care_Instructions) {
      return res.status(400).json({
        success: false,
        message: "At least one field (material_Details or care_Instructions) must be provided",
      });
    }

    // Build update data
    const updateData = {};
    if (material_Details) updateData.material_Details = material_Details.trim();
    if (care_Instructions) updateData.care_Instructions = care_Instructions.trim();

    const results = {
      success: [],
      failed: [],
      total: products.length,
    };

    // Update each product
    for (const productId of products) {
      try {
        // Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          results.failed.push({
            productId,
            error: "Invalid product ID format",
          });
          continue;
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
          results.failed.push({
            productId,
            error: "Product not found",
          });
          continue;
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (updatedProduct) {
          results.success.push({
            productId: updatedProduct._id,
            productName: updatedProduct.productName,
          });
        } else {
          results.failed.push({
            productId,
            error: "Failed to update product",
          });
        }
      } catch (error) {
        results.failed.push({
          productId,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk material and care update completed. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    console.error("Error in bulk material and care update:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing bulk material and care update",
      error: error.message,
    });
  }
};
