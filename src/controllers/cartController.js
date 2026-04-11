const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Product = require("../models/productModels");

// Create or Update Cart
// Create or Update Cart

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
exports.createCart = async (req, res) => {
  try {
    const { userId, products } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
        error: "Missing userId in request body"
      });
    }

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        message: "products must be an array",
        error: "products is not iterable"
      });
    }

    if (products.length === 0) {
      return res.status(400).json({
        message: "products array cannot be empty",
        error: "No products provided"
      });
    }

    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Reset the products array if cart already exists
      cart.products = [];
    } else {
      cart = new Cart({
        userId,
        products: [],
      });
    }

    let subtotal = 0;

    // Loop through each product and calculate price
    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found for ${item.productId}` });
      }

      const variant = product.variants.find((v) => v.color === item.color);
      if (!variant) {
        return res.status(404).json({
          message: `Color variant not found for product ${product.productName}`,
        });
      }

      const sizeVariant = variant.sizes.find((s) => s.size === item.size);
      if (!sizeVariant) {
        return res.status(404).json({
          message: `Size ${item.size} not found for product ${product.productName}`,
        });
      }

      // Check stock availability
      if (sizeVariant.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${product.productName}`,
        });
      }

      // Add product to cart
      cart.products.push({
        productId: item.productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        is_customizable: item.is_customizable || false,
        customizations: item.customizations || "",
      });

      subtotal += sizeVariant.price * item.quantity;

      // Update product stock
      sizeVariant.stock -= item.quantity;
      await product.save();
    }

    // Calculate Shipping Cost: ₹99 per product/item
    const deliveryChargePerItem = 99;
    const shipping_cost = cart.products.length * deliveryChargePerItem;

    // Calculate Total Amount (without GST)
    cart.subtotal = subtotal;
    cart.tax_amount = 0;  // No GST/tax
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + shipping_cost;

    await cart.save();
    return res
      .status(201)
      .json({ message: "Cart created/updated successfully", cart });
  } catch (error) {
    console.error("Error creating/updating cart:", error);
    return res
      .status(500)
      .json({ message: "Error creating/updating cart", error: error.message });
  }
};

exports.addItemToCart = async (req, res) => {
  try {
    const {
      userId,
      productId,
      quantity,
      size,
      color,
      is_customizable,
      customizations,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    if (sizeVariant.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (productInCart) {
      productInCart.quantity += quantity;
    } else {
      cart.products.push({
        productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity,
        size,
        color,
        is_customizable: is_customizable || false,
        customizations: customizations || "",
      });
    }

    sizeVariant.stock -= quantity;
    await product.save();

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Calculate Shipping Cost: ₹99 per product/item
    const deliveryChargePerItem = 99;
    const shipping_cost = cart.products.length * deliveryChargePerItem;

    cart.subtotal = subtotal;
    cart.tax_amount = 0;  // No GST/tax
    cart.shipping_cost = shipping_cost;
    cart.total_amount = subtotal + shipping_cost;

    await cart.save();
    return res.status(201).json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return res
      .status(500)
      .json({ message: "Error adding item to cart", error: error.message });
  }
};
exports.updateQuantity = async (req, res) => {
  try {
    const { userId, productId, size, color, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (!productInCart)
      return res.status(404).json({ message: "Product not found in cart" });

    const quantityChange = quantity - productInCart.quantity;

    // Adjust quantity or remove item if quantity is less than 1
    if (quantity < 1) {
      cart.products = cart.products.filter(
        (item) =>
          !(
            item.productId.toString() === productId.toString() &&
            item.size === size &&
            item.color === color
          )
      );
    } else {
      if (quantityChange > 0 && sizeVariant.stock < quantityChange) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      productInCart.quantity = quantity;
      sizeVariant.stock -= quantityChange;
    }

    await product.save();

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });
    
    // Calculate Shipping Cost: ₹99 per product/item
    const deliveryChargePerItem = 99;
    const shipping_cost = cart.products.length * deliveryChargePerItem;

    cart.subtotal = subtotal;
    cart.tax_amount = 0;  // No GST/tax
    cart.shipping_cost = shipping_cost;

    // Adjust discount if cart is cleared
    if (cart.products.length === 0) {
      cart.discount_applied = false;
      cart.discount_amount = 0;
    }

    cart.total_amount =
      subtotal + shipping_cost - cart.discount_amount;

    await cart.save();
    return res.status(200).json({ message: "Quantity updated", cart });
  } catch (error) {
    console.error("Error updating quantity:", error);
    return res
      .status(500)
      .json({ message: "Error updating quantity", error: error.message });
  }
};
exports.deleteItem = async (req, res) => {
  try {
    const { userId, productId, size, color } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant) return res.status(404).json({ message: "Color not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size not found" });

    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (!productInCart)
      return res.status(404).json({ message: "Product not found in cart" });

    // Update stock in the product model
    sizeVariant.stock += productInCart.quantity;
    await product.save();

    // Remove the product from the cart
    cart.products = cart.products.filter(
      (item) =>
        !(
          item.productId.toString() === productId.toString() &&
          item.size === size &&
          item.color === color
        )
    );

    // Recalculate totals
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Calculate Shipping Cost: ₹99 per product/item
    const deliveryChargePerItem = 99;
    const shipping_cost = cart.products.length * deliveryChargePerItem;

    cart.subtotal = subtotal;
    cart.tax_amount = 0;  // No GST/tax
    cart.shipping_cost = shipping_cost;

    // Adjust discount if cart is cleared
    if (cart.products.length === 0) {
      cart.discount_applied = false;
      cart.discount_amount = 0;
    }

    cart.total_amount =
      subtotal + shipping_cost - cart.discount_amount;

    await cart.save();
    return res.status(200).json({ message: "Item deleted from cart", cart });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    return res
      .status(500)
      .json({ message: "Error deleting item from cart", error: error.message });
  }
};

exports.getCartForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the cart and populate necessary fields from the product and variant fields
    const cart = await Cart.findOne({ userId }).populate({
      path: "products.productId",
      select: "productName price variants is_customizable coverImage",
      populate: {
        path: "variants",
        select: "color sizes",
      },
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Map through cart products to append size, price, and color info
    const populatedProducts = cart.products.map((item) => {
      const product = item.productId;
      // Check if product exists and has variants
      if (!product || !product.variants || !Array.isArray(product.variants)) {
        return {
          ...item.toObject(),
          productName: product?.productName || "Unknown Product",
          price: product?.price || 0,
          color: item.color,
          size: item.size,
          is_customizable: product?.is_customizable || false,
          image: product?.coverImage || null,
        };
      }

      const variant = product.variants.find((v) => v.color === item.color);
      const sizeInfo = variant?.sizes?.find((s) => s.size === item.size);

      return {
        ...item.toObject(),
        productName: product.productName,
        price: sizeInfo ? sizeInfo.price : product.price,
        color: variant?.color || item.color,
        size: item.size,
        is_customizable: product.is_customizable,
        image: product.coverImage,
      };
    });

    const responseCart = {
      ...cart.toObject(),
      products: populatedProducts,
      tax_amount: cart.tax_amount,
      shipping_cost: cart.shipping_cost,
      total_amount: cart.total_amount,
    };

    return res.status(200).json({ cart: responseCart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Error fetching cart", error });
  }
};

exports.upsertCart = async (req, res) => {
  try {
    const {
      userId,
      productId,
      quantity,
      size,
      color,
      is_customizable,
      customizations,
    } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        discount_applied: false, // Set default value for discount_applied
        shipping_cost: 0,
        total_amount: 0,
      });
    }

    // Fetch the product details
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find((v) => v.color === color);
    if (!variant)
      return res.status(404).json({ message: "Color variant not found" });

    const sizeVariant = variant.sizes.find((s) => s.size === size);
    if (!sizeVariant)
      return res.status(404).json({ message: "Size Not Selected" });

    if (sizeVariant.stock < quantity) {
      return res
        .status(400)
        .json({ message: "Insufficient stock for selected Product" });
    }

    // Check if the product already exists in the cart
    const productInCart = cart.products.find(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.size === size &&
        item.color === color
    );

    if (productInCart) {
      // Update quantity if product already exists in the cart
      productInCart.quantity += quantity;
    } else {
      // Add new product to cart
      cart.products.push({
        productId,
        designerRef: product.designerRef,
        price: sizeVariant.price,
        quantity,
        size,
        color,
        is_customizable: is_customizable || false,
        customizations: customizations || "",
      });
    }

    // Reduce stock based on the quantity added
    sizeVariant.stock -= quantity;
    await product.save();

    // Recalculate the subtotal
    let subtotal = 0;
    cart.products.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Calculate Shipping Cost: ₹99 per product/item
    const deliveryChargePerItem = 99;
    const shipping_cost = cart.products.length * deliveryChargePerItem;

    // Apply discount if available
    let discount_amount = 0;
    if (cart.discount_applied) {
      discount_amount = cart.discount_amount;
    }

    // Update the cart totals (without GST)
    cart.subtotal = roundToTwoDecimals(subtotal);
    cart.tax_amount = 0;  // No GST/tax
    cart.shipping_cost = shipping_cost;
    cart.discount_amount = roundToTwoDecimals(discount_amount);
    cart.total_amount = roundToTwoDecimals(
      subtotal + shipping_cost - discount_amount
    );

    await cart.save();

    return res.status(201).json({ message: "Item Added To Cart", cart });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res
      .status(500)
      .json({ message: "Error updating cart", error: error.message });
  }
};

// Get Cart ID by User ID
exports.getCartIdByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Find cart by userId
    const cart = await Cart.findOne({ userId }).select('_id userId status createdDate lastUpdatedDate');

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart ID retrieved successfully",
      data: {
        cartId: cart._id,
        userId: cart.userId,
        status: cart.status,
        createdDate: cart.createdDate,
        lastUpdatedDate: cart.lastUpdatedDate
      }
    });

  } catch (error) {
    console.error("Error getting cart ID by user ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving cart ID",
      error: error.message
    });
  }
};

// Get Cart ID by User ID (Alternative method with more details)
exports.getCartDetailsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Find cart by userId with basic details
    const cart = await Cart.findOne({ userId }).select(
      '_id userId status subtotal total_amount discount_amount tax_amount shipping_cost products.length createdDate lastUpdatedDate'
    );

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart details retrieved successfully",
      data: {
        cartId: cart._id,
        userId: cart.userId,
        status: cart.status,
        itemCount: cart.products.length,
        subtotal: cart.subtotal,
        totalAmount: cart.total_amount,
        discountAmount: cart.discount_amount,
        taxAmount: cart.tax_amount,
        shippingCost: cart.shipping_cost,
        createdDate: cart.createdDate,
        lastUpdatedDate: cart.lastUpdatedDate
      }
    });

  } catch (error) {
    console.error("Error getting cart details by user ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving cart details",
      error: error.message
    });
  }
};

// Update Cart Address
exports.updateCartAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { address } = req.body;

    // Validate required fields
    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
        error: "Missing address in request body"
      });
    }

    // Validate address fields
    if (!address.street || !address.city || !address.state || !address.pincode) {
      return res.status(400).json({
        success: false,
        message: "Address must include street, city, state, and pincode",
        error: "Incomplete address information"
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Find the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found for this user"
      });
    }

    // Update the cart with address information
    cart.address = {
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country || "India",
      phoneNumber: address.phoneNumber || ""
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart address updated successfully",
      data: {
        cartId: cart._id,
        userId: cart.userId,
        address: cart.address,
        lastUpdatedDate: cart.lastUpdatedDate
      }
    });

  } catch (error) {
    console.error("Error updating cart address:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating cart address",
      error: error.message
    });
  }
};



exports.getCartTotalByUserId = async (req, res) => {
  try {
    // Get userId from params, query, or body
    const userId = req.params.userId || req.query.userId || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Provide userId in params, query, or body."
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    // Find cart for the user (don't filter by status - get any cart for the user)
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart not found for this user",
        data: {
          userId: userId,
          totalAmount: 0,
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          shippingCost: 0,
          itemCount: 0,
          productCount: 0,
          isEmpty: true
        }
      });
    }

    // Debug logging (can be removed in production)
    console.log(`Cart found for userId: ${userId}`);
    console.log(`Cart products count: ${cart.products ? cart.products.length : 'null'}`);
    console.log(`Cart status: ${cart.status}`);
    console.log(`Cart total_amount: ${cart.total_amount}`);

    // Check if cart has products
    if (!cart.products || !Array.isArray(cart.products) || cart.products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: {
          userId: userId,
          cartId: cart._id,
          totalAmount: roundToTwoDecimals(cart.total_amount || 0),
          subtotal: roundToTwoDecimals(cart.subtotal || 0),
          discountAmount: roundToTwoDecimals(cart.discount_amount || 0),
          taxAmount: roundToTwoDecimals(cart.tax_amount || 0),
          shippingCost: roundToTwoDecimals(cart.shipping_cost || 0),
          itemCount: 0,
          productCount: 0,
          isEmpty: true,
          status: cart.status
        }
      });
    }

    // Calculate item count (total quantity of all items)
    const itemCount = cart.products.reduce((total, item) => {
      return total + (item.quantity || 1);
    }, 0);

    // Product count (number of unique products)
    const productCount = cart.products.length;

    return res.status(200).json({
      success: true,
      message: "Cart total retrieved successfully",
      data: {
        userId: userId,
        cartId: cart._id,
        totalAmount: roundToTwoDecimals(cart.total_amount || 0),
        subtotal: roundToTwoDecimals(cart.subtotal || 0),
        discountAmount: roundToTwoDecimals(cart.discount_amount || 0),
        taxAmount: roundToTwoDecimals(cart.tax_amount || 0),
        shippingCost: roundToTwoDecimals(cart.shipping_cost || 0),
        itemCount: itemCount,
        productCount: productCount,
        isEmpty: false,
        discountApplied: cart.discount_applied || false,
        lastUpdated: cart.lastUpdatedDate
      }
    });

  } catch (error) {
    console.error("Error getting cart total by userId:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving cart total",
      error: error.message
    });
  }
};
