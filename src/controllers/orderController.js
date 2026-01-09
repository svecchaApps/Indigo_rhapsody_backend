const mongoose = require("mongoose");
const axios = require("axios"); // Import axios to fetch the image
const Order = require("../models/orderModel");
const Product = require("../models/productModels");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const PaymentDetails = require("../models/paymentDetailsModel");
const PhonePeService = require("../service/phonepeService");
const fs = require("fs");
const PDFDocument = require("pdfkit"); // To generate PDF invoices
const nodemailer = require("nodemailer");
const { bucket } = require("../service/firebaseServices");
const { DateTime } = require("luxon");
const {
  createNotification,
  sendFcmNotification,
} = require("../controllers/notificationController");
const phonepeService = require("../service/phonepeService");

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "orders@indigorhapsody.com",
    pass: "OrdersPassword123@#",
  },
});

const notifyDesignerByEmail = async (designerEmail, orderDetails) => {
  const mailOptions = {
    from: "orders@indigorhapsody.com",
    to: designerEmail,
    subject: "New Order Notification",
    html: `
      <h1>New Order Available</h1>
      <p>Congratulations!A new order has been created that includes products designed by you.</p>
      <h2>Order Details</h2>
      <ul>
        ${orderDetails
        .map(
          (product) =>
            `<li>${product.productName} - ${product.quantity} x $${product.price}</li>`
        )
        .join("")}
      </ul>
      <p>Please log in to your dashboard to view and manage this order.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};
const generateAndUploadInvoice = async (order) => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoices/invoice-${order.orderId}.pdf`;
    const firebaseFile = bucket.file(fileName);
    const stream = firebaseFile.createWriteStream({
      metadata: { contentType: "application/pdf" },
    });

    // Ensure numerical properties are valid and default to 0 if undefined
    const subtotal = order.subtotal || 0;
    const discount = order.discount || 0;
    const tax = order.tax || 0;
    const shippingCost = order.shipping_cost || 0;
    const totalAmount = order.amount || 0;

    // Logo URL
    const logoUrl =
      "https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe";

    try {
      // Fetch the logo image as a buffer
      const response = await axios.get(logoUrl, {
        responseType: "arraybuffer",
      });
      const logoBuffer = Buffer.from(response.data, "binary");

      // Header Section
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill("#f8f8f8")
        .fillColor("#000")
        .fontSize(24)
        .text("Invoice", 50, 40);

      // Add logo from buffer
      doc.image(logoBuffer, doc.page.width - 150, 30, { width: 100 });

      // Invoice Details
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Invoice #: ${order.orderId}`, 50, 120)
        .text(
          `Date of Issue: ${new Date(order.createdDate).toLocaleDateString()}`
        );

      // Fetch and display customer name
      doc
        .text("Billed To:", 50, 160)
        .font("Helvetica-Bold")
        .text(order.userId?.displayName || "Customer Name") // Ensure correct field is used
        .font("Helvetica")
        .text(order.shippingDetails?.address?.street || "Street Address")
        .text(
          `${order.shippingDetails?.address?.city || "City"}, ${order.shippingDetails?.address?.state || "State"
          } - ${order.shippingDetails?.address?.country || "Country"}`,
          { align: "left" }
        );

      // Table Header
      doc.moveDown(2);
      const tableTop = 250;
      const tableColumns = ["Product Name", "Qty", "Rate", "Amount"];
      const columnWidths = [200, 80, 80, 80];

      tableColumns.forEach((text, i) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            text,
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            tableTop,
            {
              width: columnWidths[i],
              align: i === 3 ? "right" : "left",
            }
          );
      });

      // Draw Divider Line
      doc
        .strokeColor("#cccccc")
        .lineWidth(1)
        .moveTo(50, tableTop + 20)
        .lineTo(doc.page.width - 50, tableTop + 20)
        .stroke();

      // Table Rows
      let rowY = tableTop + 30;

      order.products.forEach((product) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .text(product.productName || "-", 50, rowY, {
            width: columnWidths[0],
          })
          .text(product.quantity || 0, 250, rowY, {
            width: columnWidths[1],
            align: "center",
          })
          .text(`₹${product.price || 0}`, 330, rowY, {
            width: columnWidths[2],
            align: "center",
          })
          .text(
            `₹${((product.price || 0) * (product.quantity || 0)).toFixed(2)}`,
            410,
            rowY,
            {
              width: columnWidths[3],
              align: "right",
            }
          );

        rowY += 20; // Move to the next row
      });

      // Total Summary
      const summaryTop = rowY + 30;

      doc
        .font("Helvetica-Bold")
        .text("Subtotal:", 400, summaryTop, { align: "left" })
        .text(`₹${subtotal.toFixed(2)}`, 480, summaryTop, {
          align: "right",
        });

      doc
        .font("Helvetica")
        .text("Discount:", 400, summaryTop + 15, { align: "left" })
        .text(`-₹${discount.toFixed(2)}`, 480, summaryTop + 15, {
          align: "right",
        });

      doc
        .text("Delivery Charges:", 400, summaryTop + 30, { align: "left" })
        .text(`₹${shippingCost.toFixed(2)}`, 480, summaryTop + 30, {
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .text("Total:", 400, summaryTop + 45, { align: "left" })
        .text(`₹${totalAmount.toFixed(2)}`, 480, summaryTop + 45, {
          align: "right",
        });

      // Footer Section
      doc.moveDown(2);

      doc
        .fontSize(10)
        .text("Conditions/Instructions:", 50, doc.page.height - 60)
        .text(
          order.instructions || "Please contact us if you have any questions.",
          50,
          doc.page.height - 45,
          { width: doc.page.width - 100 }
        );

      // Finalize PDF
      doc.end();
      doc.pipe(stream);

      // Upload to Firebase
      stream.on("finish", async () => {
        const [url] = await firebaseFile.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(url); // Return the Firebase URL
      });

      stream.on("error", (error) => {
        console.error("Error uploading PDF to Firebase:", error);
        reject(error);
      });
    } catch (error) {
      console.error("Error fetching the logo:", error);
      reject(error);
    }
  });
};

exports.getTotalOrdersOfparticularDesigner = async (req, res) => { };

// Create Order Controller
// Create Order Controller
exports.createOrder = async (req, res) => {
  try {
    const { userId, cartId, paymentMethod, notes, address } = req.body;

    // Validate User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const fcmToken = user.fcmToken;

    // Validate Address in the Request Body
    if (
      !address ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or missing address details" });
    }

    // Prepare Shipping Details
    const shippingDetails = {
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: "India",
      },
      phoneNumber: address.phoneNumber || user.phoneNumber, // Use provided phone number or fallback to user's
    };

    // Find the cart and populate product details
    const cart = await Cart.findOne({ _id: cartId, userId }).populate(
      "products.productId",
      "productName sku variants designerRef"
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Prepare Order Products
    const orderProducts = cart.products.map((item) => {
      const product = item.productId;
      return {
        productId: product._id,
        productName: product.productName,
        designerRef: product.designerRef,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        sku: product.sku,
        price: item.price,
        discount: item.discount || 0,
      };
    });

    // Extract required fields from the cart
    const {
      total_amount,
      tax_amount,
      shipping_cost,
      discount_amount,
      subtotal,
    } = cart;

    // Create and save the new order
    const order = new Order({
      userId,
      amount: total_amount,
      cartId: cart._id,
      products: orderProducts,
      paymentMethod,
      shippingDetails,
      notes,
      tax_amount,
      shipping_cost,
      discountAmount: discount_amount,
      subtotal,
      orderId: `ORD-${Date.now()}`,
    });

    await order.save();

    // Clear the user's cart
    cart.products = [];
    cart.discount_amount = 0;
    await cart.save();

    const designerEmails = new Set();
    for (const product of orderProducts) {
      const designer = await User.findById(product.designerRef).select("email");
      if (designer) designerEmails.add(designer.email);
    }

    // Send email notification to each designer
    designerEmails.forEach(async (email) => {
      try {
        await notifyDesignerByEmail(email, orderProducts);
      } catch (error) {
        console.error(`Error sending email to designer ${email}:`, error);
      }
    });

    const email = user.email;

    // Generate and upload the invoice to Firebase
    const firebaseUrl = await generateAndUploadInvoice(order);

    // Send confirmation email with invoice link
    const mailOptions = {
      from: "orders@indigorhapsody.com",
      to: email,
      subject: "Order Confirmation",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Order Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background-color: #004080;
            color: #ffffff;
            text-align: center;
            padding: 20px;
          }
          .header img {
            max-width: 100px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0 0;
            font-size: 14px;
          }
          .content {
            padding: 20px;
            color: #333333;
          }
          .content h2 {
            font-size: 20px;
            margin-bottom: 10px;
            color: #004080;
          }
          .content p {
            font-size: 16px;
            margin: 10px 0;
          }
          .content .order-details {
            margin: 20px 0;
          }
          .content .order-details table {
            width: 100%;
            border-collapse: collapse;
          }
          .content .order-details table th,
          .content .order-details table td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #eeeeee;
          }
          .content .order-details table th {
            color: #666666;
          }
          .content .total {
            font-size: 18px;
            margin: 10px 0;
          }
          .footer {
            background-color: #f4f4f4;
            padding: 15px;
            text-align: center;
            font-size: 14px;
            color: #999999;
          }
          .footer a {
            color: #004080;
            text-decoration: none;
            margin: 0 5px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/sveccha-11c31.appspot.com/o/Logo.png?alt=media&token=c8b4c22d-8256-4092-8b46-e89e001bd1fe"
              alt="Logo"
            />
            <h1>Order Received!</h1>
            <p>Order No: ${order.orderId}</p>
          </div>
          <div class="content">
            <h2>Hello, ${user.displayName}!</h2>
            <p>Thank you for your order. Below are the details of your order:</p>
            <div class="order-details">
              <table>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
                ${orderProducts
          .map(
            (product) => `
                <tr>
                  <td>${product.productName}</td>
                  <td>${product.quantity}</td>
                  <td>${product.price}</td>
                </tr>
                `
          )
          .join("")}
              </table>
            </div>
            <p class="total"><strong>Subtotal:</strong> ₹${subtotal}</p>
            <p class="total"><strong>Shipping:</strong> ₹${shipping_cost}</p>
            <p class="total"><strong>Discount:</strong> -₹${discount_amount}</p>
            <p class="total"><strong>Total Amount:</strong> ₹${total_amount}</p>
            <p>You can download your invoice <a href="${firebaseUrl}">here</a>.</p>
          </div>
          <div class="footer">
            <p>Follow us: <a href="https://twitter.com">Twitter</a> | <a href="https://facebook.com">Facebook</a></p>
          </div>
        </div>
      </body>
      </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Send FCM Notification
    if (fcmToken) {
      await sendFcmNotification(
        fcmToken,
        "Order Placed Successfully",
        `Your order with ID ${order.orderId} has been placed successfully.`
      );
    }

    res.status(201).json({
      message:
        "Order created successfully, email sent, and notifications created.",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
};

exports.getOrdersByDesignerRef = async (req, res) => {
  try {
    const { designerRef } = req.params;

    const orders = await Order.find({
      "products.designerRef": designerRef,
    })
      .sort({ createdDate: -1 }) // Sort by createdDate in descending order (newest first)
      .populate({
        path: "products.productId",
        select: "productName",
      })
      .populate({
        path: "userId",
        select: "displayName phoneNumber email",
      });

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for this designer" });
    }

    // Filter products by designerRef and calculate the total amount for each order
    const filteredOrders = orders.map((order) => {
      const designerProducts = order.products.filter(
        (product) => product.designerRef === designerRef
      );

      // Calculate the amount only for the designer's products
      const designerAmount = designerProducts.reduce(
        (total, product) => total + product.price * product.quantity,
        0
      );

      return {
        orderId: order.orderId,
        userId: {
          displayName: order.userId.displayName,
          phoneNumber: order.userId.phoneNumber,
          email: order.userId.email,
        },
        products: designerProducts,
        amount: designerAmount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdDate,
        address: order.shippingDetails.address,
        city: order.shippingDetails.address.city,
        state: order.shippingDetails.address.state,
        pincode: order.shippingDetails.address.pincode,
        country: order.shippingDetails.address.country,
      };
    });

    return res.status(200).json({ orders: filteredOrders });
  } catch (error) {
    console.error("Error fetching orders by designerRef:", error);
    return res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all orders for the user and sort by newest first
    const orders = await Order.find({ userId })
      .sort({ createdDate: -1 }) // Sort by createdDate in descending order
      .populate({
        path: "products.productId",
        select: "productName",
      });

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching orders", error });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, shippingDetails, paymentStatus } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        status,
        paymentStatus,
        shippingDetails,
        [`statusTimestamps.${status.toLowerCase()}`]: Date.now(),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
  } catch (error) {
    return res.status(500).json({ message: "Error updating order", error });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdDate: -1 }) // Sort by createdDate in descending order (newest first)
      .populate({
        path: "products.productId",
        select: "productName",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    if (!orders.length)
      return res.status(404).json({ message: "No orders found" });

    return res.status(200).json({ orders });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching all orders", error });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, shippingDetails, paymentStatus } = req.body;

    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        status,
        paymentStatus,
        shippingDetails,
        [`statusTimestamps.${status.toLowerCase()}`]: Date.now(),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    return res
      .status(200)
      .json({ message: "Order updated successfully", order });
  } catch (error) {
    return res.status(500).json({ message: "Error updating order", error });
  }
};
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Ensure the orderId is converted to a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID" });
    }

    // Find the order by ObjectId
    const order = await Order.findById(orderId)
      .populate({
        path: "products.productId",
        select: "productName sku coverImage",
      })
      .populate({
        path: "userId",
        select: "name email",
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Format the createDate to IST
    const createDateIST = DateTime.fromJSDate(order.createdDate) // assuming `createdAt` is the field storing the order creation time
      .setZone("Asia/Kolkata")
      .toLocaleString(DateTime.DATETIME_MED);

    // Add the formatted createDate to the response
    const orderResponse = {
      ...order.toObject(),
      createDate: createDateIST,
    };

    return res.status(200).json({ order: orderResponse });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(500).json({
      message: "Error fetching order",
      error: error.message,
    });
  }
};

exports.getTotalOrderCount = async (req, res) => {
  try {
    // Count the total number of documents in the Order collection
    const totalOrders = await Order.countDocuments();

    return res.status(200).json({ totalOrders });
  } catch (error) {
    console.error("Error fetching total order count:", error);
    return res.status(500).json({
      message: "Error fetching total order count",
      error: error.message,
    });
  }
};

exports.getMonthlyOrderStats = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1; // Default to current month
    const year = parseInt(req.query.year) || new Date().getFullYear(); // Default to current year

    // Define the start and end dates for the month
    const startDate = new Date(year, month - 1, 1); // First day of the specified month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the specified month

    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdDate" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.day": 1 },
      },
    ]);

    const formattedData = dailyOrders.map((entry) => ({
      day: entry._id.day,
      totalOrders: entry.totalOrders,
      totalRevenue: entry.totalRevenue,
    }));

    res.status(200).json({ dailyStats: formattedData });
  } catch (error) {
    console.error("Error fetching monthly order stats:", error);
    res.status(500).json({
      message: "Error fetching monthly order stats",
      error: error.message,
    });
  }
};
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, productId, reason, imageUrl } = req.body;

    // Ensure productId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid productId format" });
    }

    const order = await Order.findOne({
      _id: orderId,
      "products.productId": productId,
    });

    if (!order) {
      return res.status(404).json({ message: "Order or Product not found" });
    }

    // Find the specific product within the order
    const product = order.products.find(
      (p) => p.productId.toString() === productId.toString()
    );

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    product.returnRequest = true;
    product.returnStatus = "requested";
    product.returnId = `RET-${Date.now()}`;
    product.reason = reason || "Not provided"; // Corrected field name
    product.imageUrl = imageUrl || ""; // Corrected field name

    await order.save();

    return res.status(200).json({
      message: "Return request created successfully",
      product: {
        productId: product.productId,
        productName: product.productName,
        designerRef: product.designerRef,
        returnId: product.returnId,
        returnStatus: product.returnStatus,
        reason: product.reason, // Corrected field name
        imageUrl: product.imageUrl, // Corrected field name
      },
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    return res.status(500).json({
      message: "Error creating return request",
      error: error.message,
    });
  }
};

exports.getReturnRequestsByDesigner = async (req, res) => {
  try {
    const { designerRef } = req.params;

    // Aggregation to find products with return requests for the given designerRef
    const returnRequests = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to access them individually
      {
        $match: {
          "products.designerRef": designerRef,
          "products.returnRequest": true,
        },
      },
      {
        $project: {
          orderId: 1,
          "products.productId": 1,
          "products.productName": 1,
          "products.quantity": 1,
          "products.returnId": 1,
          "products.returnStatus": 1,
          "products.color": 1,
          "products.size": 1,
          "products.imageUrl": 1, // Include imageUrl
          "products.reason": 1, // Include reason
          createdDate: 1,
        },
      },
    ]);

    if (returnRequests.length === 0) {
      return res.status(404).json({
        message: "No return requests found for this designer",
      });
    }

    return res.status(200).json({
      message: "Return requests fetched successfully",
      returnRequests,
    });
  } catch (error) {
    console.error("Error fetching return requests:", error);
    return res.status(500).json({
      message: "Error fetching return requests",
      error: error.message,
    });
  }
};

// Endpoint to get total orders by designers
exports.getTotalOrdersByDesigners = async (req, res) => {
  try {
    // Aggregate orders to count total number of orders per designer
    const totalOrdersByDesigner = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to process each product individually
      {
        $group: {
          _id: "$products.designerRef", // Group by designerRef
          totalOrders: { $sum: 1 }, // Increment for each product
        },
      },
      {
        $lookup: {
          from: "designers", // Adjust the name if your designer collection is different
          localField: "_id",
          foreignField: "_id",
          as: "designerDetails",
        },
      },
      {
        $project: {
          _id: 0,
          designerRef: "$_id",
          totalOrders: 1,
          designerDetails: { $arrayElemAt: ["$designerDetails", 0] }, // Get the first (and only) element
        },
      },
    ]);

    if (totalOrdersByDesigner.length === 0) {
      return res.status(404).json({ message: "No orders found for designers" });
    }

    return res.status(200).json({ totalOrdersByDesigner });
  } catch (error) {
    console.error("Error fetching total orders by designers:", error);
    return res.status(500).json({
      message: "Error fetching total orders by designers",
      error: error.message,
    });
  }
};

// Endpoint to get total sales (total amount of all orders)
exports.getTotalSales = async (req, res) => {
  try {
    // Aggregate to calculate the total sales amount
    const totalSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: "$amount" }, // Sum the total amount of each order
        },
      },
      {
        $project: {
          _id: 0,
          totalSalesAmount: 1,
        },
      },
    ]);

    if (totalSales.length === 0) {
      return res.status(404).json({ message: "No sales data found" });
    }

    return res.status(200).json({ totalSales: totalSales[0].totalSalesAmount });
  } catch (error) {
    console.error("Error fetching total sales amount:", error);
    return res.status(500).json({
      message: "Error fetching total sales amount",
      error: error.message,
    });
  }
};

// Endpoint to get total orders for a particular designer by ID
exports.getTotalOrdersForDesigner = async (req, res) => {
  try {
    const { designerId } = req.params; // Get the designer ID from the request parameters

    // Aggregate to count the total number of unique orders per designer
    const totalOrders = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to access individual product details
      { $match: { "products.designerRef": designerId } }, // Match the specific designer ID
      {
        $group: {
          _id: "$_id", // Group by order ID (not designerRef) to count unique orders
          designerOrders: { $addToSet: "$products.designerRef" }, // Collect designer IDs in a set to avoid duplicates
        },
      },
      {
        $project: {
          _id: 1, // Keep the order ID
          designerOrders: { $size: "$designerOrders" }, // Get the size of the designerOrders set (1 if the order includes the designer)
        },
      },
      {
        $match: { designerOrders: { $gt: 0 } }, // Only keep orders that have at least one product from the designer
      },
      {
        $count: "totalOrders", // Count the total number of unique orders for this designer
      },
    ]);

    if (totalOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this designer" });
    }

    return res
      .status(200)
      .json({ designerId, totalOrders: totalOrders[0].totalOrders });
  } catch (error) {
    console.error("Error fetching total orders for designer:", error);
    return res.status(500).json({
      message: "Error fetching total orders for designer",
      error: error.message,
    });
  }
};

// Endpoint to get total sales for a particular designer by ID
exports.getTotalSalesForDesigner = async (req, res) => {
  try {
    const { designerId } = req.params; // Get the designer ID from the request parameters

    // Aggregate to calculate the total sales amount for a specific designer
    const totalSales = await Order.aggregate([
      { $unwind: "$products" }, // Unwind products to group by designerRef
      { $match: { "products.designerRef": designerId } }, // Match the specific designer ID
      {
        $group: {
          _id: "$products.designerRef",
          totalSalesAmount: {
            $sum: { $multiply: ["$products.price", "$products.quantity"] },
          }, // Calculate the total sales amount
        },
      },
    ]);

    if (totalSales.length === 0) {
      return res
        .status(404)
        .json({ message: "No sales data found for this designer" });
    }

    return res
      .status(200)
      .json({ designerId, totalSalesAmount: totalSales[0].totalSalesAmount });
  } catch (error) {
    console.error("Error fetching total sales for designer:", error);
    return res.status(500).json({
      message: "Error fetching total sales for designer",
      error: error.message,
    });
  }
};

exports.createReturnRequestForDesigner = async (req, res) => { };

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelBy } = req.body; // cancelBy can be 'user', 'admin', 'system'

    // Validate order ID
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate("userId", "displayName email phoneNumber")
      .populate("products.productId", "productName sku stock");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ["Order Placed", "Processing"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in current status: ${order.status}. Only orders with status 'Order Placed' or 'Processing' can be cancelled.`,
      });
    }

    // Check if payment has been processed
    if (order.paymentStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "Order with completed payment cannot be cancelled. Please contact support for refund processing.",
      });
    }

    // Update order status to cancelled
    const updateData = {
      status: "Cancelled",
      "statusTimestamps.cancelled": new Date(),
      notes: reason ? `Cancelled: ${reason}` : "Order cancelled",
    };

    // Add cancellation details
    if (reason) {
      updateData.cancellationReason = reason;
    }
    if (cancelBy) {
      updateData.cancelledBy = cancelBy;
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    }).populate("userId", "displayName email phoneNumber");

    // Restore product stock
    for (const product of order.products) {
      try {
        await Product.findByIdAndUpdate(product.productId, {
          $inc: { stock: product.quantity },
        });
      } catch (error) {
        console.error(
          `Error restoring stock for product ${product.productId}:`,
          error
        );
      }
    }

    // Send notification to user
    try {
      const notificationData = {
        userId: order.userId._id,
        title: "Order Cancelled",
        message: `Your order #${order.orderId} has been cancelled successfully.`,
        type: "order_cancelled",
        data: {
          orderId: order.orderId,
          orderAmount: order.amount,
          cancellationReason: reason || "No reason provided",
        },
      };

      await createNotification(notificationData);
      await sendFcmNotification(notificationData);
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
    }

    // Send email notification to user
    try {
      const mailOptions = {
        from: "orders@indigorhapsody.com",
        to: order.userId.email,
        subject: `Order Cancelled - #${order.orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Order Cancelled</h2>
            <p>Dear ${order.userId.displayName},</p>
            <p>Your order has been cancelled successfully.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${order.orderId}</p>
              <p><strong>Order Date:</strong> ${new Date(
          order.createdDate
        ).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${order.amount}</p>
              <p><strong>Cancellation Reason:</strong> ${reason || "No reason provided"
          }</p>
            </div>

            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Refund Information:</h3>
              ${order.paymentStatus === "Completed"
            ? "<p>Since payment was completed, a refund will be processed within 5-7 business days.</p>"
            : "<p>No payment was processed, so no refund is required.</p>"
          }
            </div>

            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you for choosing Indigo Rhapsody.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending cancellation email:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        orderId: updatedOrder.orderId,
        status: updatedOrder.status,
        cancelledAt: updatedOrder.statusTimestamps.cancelled,
        cancellationReason: reason,
        cancelledBy: cancelBy,
        refundRequired: order.paymentStatus === "Completed",
      },
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message,
    });
  }
};

// Get cancellation reasons (for dropdown)
exports.getCancellationReasons = async (req, res) => {
  try {
    const reasons = [
      "Changed my mind",
      "Found better price elsewhere",
      "Ordered by mistake",
      "Item no longer needed",
      "Shipping time too long",
      "Payment issues",
      "Duplicate order",
      "Wrong size/color selected",
      "Product out of stock",
      "Other",
    ];

    return res.status(200).json({
      success: true,
      message: "Cancellation reasons retrieved successfully",
      data: {
        reasons: reasons,
      },
    });
  } catch (error) {
    console.error("Error getting cancellation reasons:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving cancellation reasons",
      error: error.message,
    });
  }
};

// Cancel order by designer (for designer dashboard)
// Cancel order by designer (for designer dashboard)
exports.cancelOrderByDesigner = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    // ---- Auth / inputs ----
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });
    }
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Cancellation reason is required" });
    }

    const designerId = req.user._id;

    // ---- Load order with product->designer mapping ----
    const order = await Order.findOne({ orderId })
      .populate("userId", "displayName email phoneNumber")
      .populate("products.productId", "productName sku stock designerRef");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ---- Identify designer's products correctly ----
    // Note: designerRef is on productId, not on the order line item itself
    const designerProducts = (order.products || []).filter((p) => {
      const dRef = p?.productId?.designerRef; // ObjectId or String
      return dRef && designerId && String(dRef) === String(designerId);
    });

    // Debug logs
    console.log("Order found:", {
      orderId: order.orderId,
      totalProducts: order.products?.length || 0,
      designerId: String(designerId),
      designerProductsCount: designerProducts.length,
    });

    // ---- Status & payment checks ----
    const cancellableStatuses = ["Order Placed", "Processing"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in current status: ${order.status}. Only 'Order Placed' or 'Processing' can be cancelled.`,
      });
    }

    if (order.paymentStatus === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "Order with completed payment cannot be cancelled by designer. Please contact admin for refund processing.",
      });
    }

    // ---- Update order ----
    // NOTE: This cancels the entire order if any of the designer's products are present.
    // If you want *partial* cancellation, see the comment near the end.
    const updateData = {
      status: "Cancelled",
      "statusTimestamps.cancelled": new Date(),
      notes: reason
        ? `Cancelled by designer: ${reason}`
        : "Order cancelled by designer",
      cancellationReason: reason,
      cancelledBy: "designer",
      cancelledByDesigner: designerId,
    };

    const updatedOrder = await Order.findOneAndUpdate({ orderId }, updateData, {
      new: true,
    }).populate("userId", "displayName email phoneNumber");

    // ---- Restore stock for the designer's items only ----
    for (const line of designerProducts) {
      try {
        const pid = line?.productId?._id || line?.productId; // handle populated/unpopulated
        const qty = Number(line?.quantity) || 0;
        if (pid && qty > 0) {
          await Product.findByIdAndUpdate(pid, { $inc: { stock: qty } });
          console.log(`Stock restored for product ${pid}: +${qty}`);
        } else {
          console.warn("Skipping stock restore; invalid product line:", {
            pid,
            qty,
          });
        }
      } catch (e) {
        console.error("Error restoring stock for line:", line?._id, e);
      }
    }

    // ---- Notify user (best-effort) ----
    try {
      const notificationData = {
        userId: order.userId?._id,
        title: "Order Cancelled by Designer",
        message: `Your order #${order.orderId} has been cancelled by the designer.`,
        type: "order_cancelled_by_designer",
        data: {
          orderId: order.orderId,
          orderAmount: order.amount,
          cancellationReason: reason,
          cancelledBy: "designer",
        },
      };
      await createNotification(notificationData);
      await sendFcmNotification(notificationData);
    } catch (e) {
      console.error("Error sending cancellation notification:", e);
    }

    // ---- Email user (best-effort) ----
    try {
      const mailOptions = {
        from: "orders@indigorhapsody.com",
        to: order.userId?.email,
        subject: `Order Cancelled by Designer - #${order.orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Order Cancelled by Designer</h2>
            <p>Dear ${order.userId?.displayName || "Customer"},</p>
            <p>Your order has been cancelled by the designer.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${order.orderId}</p>
              <p><strong>Order Date:</strong> ${new Date(
          order.createdDate
        ).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${order.amount}</p>
              <p><strong>Cancellation Reason:</strong> ${reason}</p>
              <p><strong>Cancelled By:</strong> Designer</p>
            </div>
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Refund Information:</h3>
              ${order.paymentStatus === "Completed"
            ? "<p>Since payment was completed, a refund will be processed within 5-7 business days.</p>"
            : "<p>No payment was processed, so no refund is required.</p>"
          }
            </div>
            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you for choosing Indigo Rhapsody.</p>
          </div>
        `,
      };
      if (order.userId?.email) {
        await transporter.sendMail(mailOptions);
      }
    } catch (e) {
      console.error("Error sending cancellation email:", e);
    }

    // ---- Notify admin (log for now) ----
    try {
      const adminNotificationData = {
        title: "Order Cancelled by Designer",
        message: `Order #${order.orderId} has been cancelled by designer.`,
        type: "order_cancelled_by_designer_admin",
        data: {
          orderId: order.orderId,
          designerId: String(designerId),
          cancellationReason: reason,
          customerEmail: order.userId?.email,
        },
      };
      console.log("Admin notification:", adminNotificationData);
    } catch (e) {
      console.error("Error sending admin notification:", e);
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully by designer",
      data: {
        orderId: updatedOrder.orderId,
        status: updatedOrder.status,
        cancelledAt: updatedOrder.statusTimestamps?.cancelled,
        cancellationReason: reason,
        cancelledBy: "designer",
        designerId: String(designerId),
        refundRequired: order.paymentStatus === "Completed",
        designerProductsCancelled: designerProducts.length,
      },
    });
  } catch (error) {
    console.error("Error cancelling order by designer:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error?.message || String(error),
    });
  }
};

// Get orders that can be cancelled by designer
exports.getCancellableOrdersByDesigner = async (req, res) => {
  try {
    const designerId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find orders that contain designer's products and are in cancellable status
    const cancellableStatuses = ["Order Placed", "Processing"];

    const orders = await Order.find({
      "products.designerRef": designerId,
      status: { $in: cancellableStatuses },
      paymentStatus: { $ne: "Completed" }, // Exclude orders with completed payment
    })
      .populate("userId", "displayName email phoneNumber")
      .populate("products.productId", "productName sku stock designerRef")
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter to only show designer's products in each order
    const filteredOrders = orders.map((order) => {
      const designerProducts = order.products.filter(
        (product) =>
          product.designerRef &&
          product.designerRef.toString &&
          product.designerRef.toString() === designerId.toString()
      );

      return {
        ...order.toObject(),
        products: designerProducts,
        totalDesignerProducts: designerProducts.length,
        totalOrderProducts: order.products.length,
      };
    });

    // Get total count
    const totalOrders = await Order.countDocuments({
      "products.designerRef": designerId,
      status: { $in: cancellableStatuses },
      paymentStatus: { $ne: "Completed" },
    });

    return res.status(200).json({
      success: true,
      message: "Cancellable orders retrieved successfully",
      data: {
        orders: filteredOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders,
          hasNextPage: skip + filteredOrders.length < totalOrders,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting cancellable orders by designer:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving cancellable orders",
      error: error.message,
    });
  }
};


exports.createPaymentService = async (req, res) => {
  try {
    const {
      userId,
      cartId,
      orderId,
      paymentMethod,
      amount,
      currency = "INR",
      customerDetails: { name, email, phone, address } = {},
      paymentOptions = {},
      description,
      notes,
      returnUrl,
      webhookUrl,
    } = req.body;

    if (!userId || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId, paymentMethod, and amount are required",
      });
    }

    // Validate amount - must be a positive number (including decimals)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than 0. Decimal amounts are supported (e.g., 1299.99)",
      });
    }

    const supportedPaymentMethods = [
      "phonepe",
      "razorpay",
      "stripe",
      "paypal",
      "cod",
    ];

    if (!supportedPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Unsupported payment method. Supported methods: ${supportedPaymentMethods.join(
          ", "
        )}`,
      });
    }

    const paymentReferenceId = `PAY_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const finalOrderId =
      orderId || `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paymentRecord = {
      userId,
      cartId,
      orderId: finalOrderId,
      paymentMethod: paymentMethod.toLowerCase(),
      amount: parsedAmount, // Use validated and parsed decimal amount
      currency,
      paymentReferenceId,
      status: "initiated",
      customerDetails: {
        name: name || "",
        email: email || "",
        phone: phone || "",
        address: address || {},
      },
      paymentOptions,
      description: description || `Payment for order ${finalOrderId}`,
      notes: notes || "",
      returnUrl: returnUrl || "",
      webhookUrl: webhookUrl || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // --- PAYMENT DISPATCHER ---
    let paymentResponse = null;

    switch (paymentMethod.toLowerCase()) {
      case "phonepe":
        paymentResponse = await handlePhonePePayment(paymentRecord);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
    }

    if (!paymentResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Payment initiation failed",
        error: paymentResponse.message || "Unknown error",
      });
    }

    // Store payment record in database
    try {
      const paymentRecordToSave = new PaymentDetails({
        userId,
        cartId,
        orderId: finalOrderId,
        paymentReferenceId,
        transactionId: paymentResponse.data.transactionId || paymentReferenceId,
        paymentId: paymentResponse.data.paymentId || null,
        paymentMethod: paymentMethod.toLowerCase(),
        amount: parsedAmount, // Use validated and parsed amount
        currency,
        paymentStatus: "Initiated",
        status: "initiated",
        customerDetails: {
          name: name || "",
          email: email || "",
          phone: phone || "",
          address: address || {},
        },
        paymentOptions,
        description: description || `Payment for order ${finalOrderId}`,
        notes: notes || "",
        returnUrl: returnUrl || "",
        webhookUrl: webhookUrl || "",
        createdDate: new Date(),
        updatedAt: new Date(),
      });

      const savedPayment = await paymentRecordToSave.save();
      console.log("✅ Payment record saved to database:", savedPayment._id);

      // ✅ include redirect URL in the response
      return res.status(200).json({
        success: true,
        message: "Payment initiated successfully",
        data: {
          paymentId: savedPayment._id,
          paymentReferenceId,
          orderId: finalOrderId,
          paymentMethod,
          amount,
          currency,
          redirectUrl: paymentResponse.data.redirectUrl, // ✅ explicit mapping
          ...paymentResponse.data,
        },
      });
    } catch (dbError) {
      console.error("❌ Database Error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Payment initiated but failed to save to database",
        error: dbError.message,
        data: {
          paymentReferenceId,
          orderId: finalOrderId,
          paymentMethod,
          amount,
          currency,
          redirectUrl: paymentResponse.data.redirectUrl,
          ...paymentResponse.data,
        },
      });
    }
  } catch (error) {
    console.error("❌ Payment Service Error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment service error",
      error: error.message,
    });
  }
};

// PhonePe Legacy Payment Handler (X-VERIFY method)
async function handlePhonePePaymentLegacy(paymentRecord) {
  try {
    const { amount, orderId, userId, customerDetails } = paymentRecord;

    const phonePeResponse = await phonepeService.createPaymentLegacy({
      amount,
      merchantTransactionId: orderId,
      merchantUserId: userId,
      mobileNumber: customerDetails.phone,
      email: customerDetails.email,
      redirectMode: "POST",
    });

    const redirectUrl =
      phonePeResponse?.data?.redirectUrl ||
      phonePeResponse?.data?.paymentUrl;

    if (phonePeResponse.success && redirectUrl) {
      return {
        success: true,
        data: {
          provider: "PhonePe",
          merchantTransactionId: phonePeResponse.data.merchantTransactionId,
          transactionId: phonePeResponse.data.transactionId,
          redirectUrl,
        },
      };
    } else {
      console.error("⚠️ PhonePe Legacy Payment Failure:", phonePeResponse);
      return {
        success: false,
        message: phonePeResponse.message || "Failed to create PhonePe payment session",
      };
    }
  } catch (error) {
    console.error("❌ PhonePe Legacy Handler Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

// PhonePe Payment Handler
async function handlePhonePePayment(paymentRecord) {
  try {
    const { amount, orderId, customerDetails } = paymentRecord;

    const phonePeResponse = await PhonePeService.createPaymentRequest({
      amount,
      orderId,
      customerId: paymentRecord.userId,
      customerPhone: customerDetails.phone,
    });

    // ✅ Check for both nested and direct redirect URLs
    const redirectUrl =
      phonePeResponse?.data?.redirectUrl ||
      phonePeResponse?.data?.paymentUrl ||
      phonePeResponse?.redirectUrl;

    if (phonePeResponse.success && redirectUrl) {
      return {
        success: true,
        data: {
          provider: "PhonePe",
          orderId: phonePeResponse.data.orderId,
          state: phonePeResponse.data.state,
          expireAt: phonePeResponse.data.expireAt,
          redirectUrl, // ✅ ensure redirectUrl is always included
        },
      };
    } else {
      console.error("⚠️ PhonePe Payment Failure:", phonePeResponse);
      return {
        success: false,
        message:
          phonePeResponse.message || "Failed to create PhonePe payment session",
      };
    }
  } catch (error) {
    console.error("❌ PhonePe Handler Error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

// Razorpay Payment Handler
const handleRazorpayPayment = async (paymentRecord) => {
  try {
    // Razorpay integration would go here
    // For now, returning a mock response
    return {
      success: true,
      data: {
        paymentUrl: `https://razorpay.com/payment/${paymentRecord.paymentReferenceId}`,
        transactionId: paymentRecord.paymentReferenceId,
        paymentId: `rzp_${paymentRecord.paymentReferenceId}`,
        expiresIn: 1800,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Stripe Payment Handler
const handleStripePayment = async (paymentRecord) => {
  try {
    // Stripe integration would go here
    // For now, returning a mock response
    return {
      success: true,
      data: {
        paymentUrl: `https://stripe.com/payment/${paymentRecord.paymentReferenceId}`,
        transactionId: paymentRecord.paymentReferenceId,
        paymentId: `stripe_${paymentRecord.paymentReferenceId}`,
        expiresIn: 1800,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// PayPal Payment Handler
const handlePayPalPayment = async (paymentRecord) => {
  try {
    // PayPal integration would go here
    // For now, returning a mock response
    return {
      success: true,
      data: {
        paymentUrl: `https://paypal.com/payment/${paymentRecord.paymentReferenceId}`,
        transactionId: paymentRecord.paymentReferenceId,
        paymentId: `paypal_${paymentRecord.paymentReferenceId}`,
        expiresIn: 1800,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Cash on Delivery Payment Handler
const handleCODPayment = async (paymentRecord) => {
  try {
    // COD doesn't require payment gateway integration
    return {
      success: true,
      data: {
        paymentUrl: null,
        transactionId: paymentRecord.paymentReferenceId,
        paymentId: `cod_${paymentRecord.paymentReferenceId}`,
        message: "Cash on Delivery payment confirmed",
        status: "confirmed",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Verify Payment Status
// Verify Payment Status (Generic - supports all payment methods)
exports.verifyPaymentStatus = async (req, res) => {
  try {
    const { paymentReferenceId, paymentMethod } = req.params;

    if (!paymentReferenceId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "paymentReferenceId and paymentMethod are required",
      });
    }

    let verificationResponse;

    switch (paymentMethod.toLowerCase()) {
      case "phonepe":
        verificationResponse = await phonepeService.verifyPayment(
          paymentReferenceId
        );
        break;
      case "razorpay":
        verificationResponse = await verifyRazorpayPayment(paymentReferenceId);
        break;
      case "stripe":
        verificationResponse = await verifyStripePayment(paymentReferenceId);
        break;
      case "paypal":
        verificationResponse = await verifyPayPalPayment(paymentReferenceId);
        break;
      case "cod":
        verificationResponse = { success: true, data: { status: "confirmed" } };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
    }

    if (!verificationResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error: verificationResponse.message,
      });
    }

    // Update payment status in database if verification successful
    if (verificationResponse.data && paymentMethod.toLowerCase() === "phonepe") {
      try {
        const { orderId, status, amount } = verificationResponse.data;

        const updateData = {
          paymentStatus: status === "PAID" || status === "SUCCESS" ? "Completed" : status,
          status: status === "PAID" || status === "SUCCESS" ? "completed" : status.toLowerCase(),
          updatedAt: new Date(),
        };

        if (status === "PAID" || status === "SUCCESS") {
          updateData.completedAt = new Date();
        }

        await PaymentDetails.findOneAndUpdate(
          { transactionId: orderId },
          updateData,
          { new: true }
        );

        console.log(`✅ Payment status updated in database for order: ${orderId}`);
      } catch (dbError) {
        console.error("❌ Database update error:", dbError);
        // Continue even if DB update fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment status verified",
      data: {
        paymentReferenceId,
        paymentMethod,
        ...verificationResponse.data,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification error",
      error: error.message,
    });
  }
};

// Check PhonePe Order Status (Specific PhonePe API endpoint)
exports.checkPhonePeOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    console.log(`🔍 Checking PhonePe status for order: ${orderId}`);

    // Call PhonePe verify payment API
    const verificationResponse = await phonepeService.verifyPayment(orderId);

    if (!verificationResponse.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to verify payment status",
        error: verificationResponse.error || verificationResponse.message,
      });
    }

    const { status, amount, responseCode, responseMessage } =
      verificationResponse.data;

    // Update payment status in database
    try {
      const updateData = {
        paymentStatus: status === "PAID" || status === "SUCCESS" ? "Completed" : status,
        status: status === "PAID" || status === "SUCCESS" ? "completed" : status.toLowerCase(),
        updatedAt: new Date(),
      };

      if (status === "PAID" || status === "SUCCESS") {
        updateData.completedAt = new Date();
      } else if (status === "FAILED") {
        updateData.failedAt = new Date();
        updateData.failureReason = responseMessage || "Payment failed";
      }

      const updatedPayment = await PaymentDetails.findOneAndUpdate(
        { transactionId: orderId },
        updateData,
        { new: true }
      ).populate("userId", "displayName email")
        .populate("cartId", "total_amount");

      if (updatedPayment) {
        console.log(`✅ Payment status updated: ${status}`);

        return res.status(200).json({
          success: true,
          message: "Payment status retrieved and updated successfully",
          data: {
            orderId,
            status,
            amount,
            responseCode,
            responseMessage,
            paymentDetails: updatedPayment,
          },
        });
      } else {
        // Payment not found in DB, still return PhonePe status
        console.warn(`⚠️ Payment record not found for order: ${orderId}`);
        return res.status(200).json({
          success: true,
          message: "Payment status retrieved (not found in database)",
          data: {
            orderId,
            status,
            amount,
            responseCode,
            responseMessage,
          },
        });
      }
    } catch (dbError) {
      console.error("❌ Database error:", dbError);
      // Return PhonePe status even if DB update fails
      return res.status(200).json({
        success: true,
        message: "Payment status retrieved (database update failed)",
        data: {
          orderId,
          status,
          amount,
          responseCode,
          responseMessage,
        },
        warning: "Database update failed",
      });
    }
  } catch (error) {
    console.error("❌ Error checking PhonePe order status:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking payment status",
      error: error.message,
    });
  }
};

// Payment Webhook Handler
exports.handlePaymentWebhook = async (req, res) => {
  try {
    const { paymentMethod } = req.params;
    const webhookData = req.body;

    console.log(`Payment webhook received for ${paymentMethod}:`, webhookData);

    let webhookResponse;

    switch (paymentMethod.toLowerCase()) {
      case "phonepe":
        webhookResponse = await handlePhonePeWebhook(webhookData);
        break;
      case "razorpay":
        webhookResponse = await handleRazorpayWebhook(webhookData);
        break;
      case "stripe":
        webhookResponse = await handleStripeWebhook(webhookData);
        break;
      case "paypal":
        webhookResponse = await handlePayPalWebhook(webhookData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
    }

    if (!webhookResponse.success) {
      return res.status(500).json({
        success: false,
        message: "Webhook processing failed",
        error: webhookResponse.message,
      });
    }

    // Handle order creation for successful payments
    if (webhookResponse.data.shouldCreateOrder && webhookResponse.data.paymentRecord) {
      try {
        console.log("🛒 Creating order from webhook...");
        const { paymentRecord } = webhookResponse.data;

        // Create order request
        const orderRequest = {
          body: {
            userId: paymentRecord.userId,
            cartId: paymentRecord.cartId,
            paymentMethod: "PhonePe",
            shippingDetails: {}, // Add shipping details if available
            notes: `Payment completed via PhonePe - Order ID: ${paymentRecord.orderId}`,
          },
        };

        // Create order using existing order creation logic
        const orderResult = await createOrder(orderRequest, res);

        if (orderResult) {
          console.log("✅ Order created successfully from webhook");
          webhookResponse.data.orderCreated = true;
          webhookResponse.data.orderId = orderResult.orderId;
        }
      } catch (orderError) {
        console.error("❌ Error creating order from webhook:", orderError);
        webhookResponse.data.orderCreationError = orderError.message;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      data: webhookResponse.data,
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing error",
      error: error.message,
    });
  }
};

// PhonePe Webhook Handler
const handlePhonePeWebhook = async (webhookData) => {
  try {
    console.log("🎯 PhonePe Webhook Received:", JSON.stringify(webhookData, null, 2));

    const callbackResult = phonepeService.handlePaymentCallback(webhookData);

    if (callbackResult.success) {
      const {
        orderId,
        merchantOrderId,
        transactionId,
        status,
        amount,
        paymentMode,
        responseCode,
        responseMessage
      } = callbackResult.data;

      console.log("📊 Processing PhonePe Webhook Data:");
      console.log("- Order ID:", orderId);
      console.log("- Merchant Order ID:", merchantOrderId);
      console.log("- Transaction ID:", transactionId);
      console.log("- Status:", status);
      console.log("- Amount:", amount);
      console.log("- Payment Mode:", paymentMode);

      // Update payment status in database
      try {
        const updateData = {
          status: status.toLowerCase(),
          paymentStatus: status === "COMPLETED" ? "Completed" : "Failed",
          updatedAt: new Date(),
        };

        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
          updateData.paymentId = orderId; // Use PhonePe orderId as paymentId
          updateData.responseCode = responseCode;
          updateData.responseMessage = responseMessage;
        } else if (status === "FAILED") {
          updateData.failedAt = new Date();
          updateData.failureReason = responseMessage || "Payment failed";
        }

        // Try to find payment record by transactionId first, then by orderId
        let updatedPayment = await PaymentDetails.findOneAndUpdate(
          { transactionId: transactionId },
          updateData,
          { new: true }
        );

        // If not found by transactionId, try by orderId
        if (!updatedPayment) {
          updatedPayment = await PaymentDetails.findOneAndUpdate(
            { orderId: merchantOrderId },
            updateData,
            { new: true }
          );
        }

        if (updatedPayment) {
          console.log(`✅ Payment status updated in database for transaction: ${transactionId}`);
          console.log(`📋 Updated Payment Record:`, {
            id: updatedPayment._id,
            orderId: updatedPayment.orderId,
            status: updatedPayment.status,
            amount: updatedPayment.amount,
            userId: updatedPayment.userId
          });

          // Create order if payment is successful
          if (status === "COMPLETED") {
            console.log(`🎉 Payment completed for transaction: ${transactionId}`);
            console.log(`🛒 Ready to create order for user: ${updatedPayment.userId}`);

            // Return success with order creation flag
            return {
              success: true,
              data: {
                ...callbackResult.data,
                shouldCreateOrder: true,
                paymentRecord: {
                  id: updatedPayment._id,
                  userId: updatedPayment.userId,
                  cartId: updatedPayment.cartId,
                  orderId: updatedPayment.orderId,
                  amount: updatedPayment.amount
                }
              },
            };
          } else {
            console.log(`❌ Payment failed for transaction: ${transactionId}`);
            return {
              success: true,
              data: {
                ...callbackResult.data,
                shouldCreateOrder: false,
                paymentRecord: {
                  id: updatedPayment._id,
                  userId: updatedPayment.userId,
                  cartId: updatedPayment.cartId,
                  orderId: updatedPayment.orderId,
                  amount: updatedPayment.amount
                }
              },
            };
          }
        } else {
          console.warn(`⚠️ Payment record not found for transaction: ${transactionId} or orderId: ${merchantOrderId}`);
          return {
            success: true,
            data: {
              ...callbackResult.data,
              shouldCreateOrder: false,
              warning: "Payment record not found in database"
            },
          };
        }
      } catch (dbError) {
        console.error("❌ Database update error:", dbError);
        return {
          success: true,
          data: {
            ...callbackResult.data,
            shouldCreateOrder: false,
            warning: "Database update failed"
          },
        };
      }
    } else {
      console.error("❌ PhonePe webhook processing failed:", callbackResult.message);
      return {
        success: false,
        message: callbackResult.message,
      };
    }
  } catch (error) {
    console.error("❌ PhonePe webhook error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Razorpay Webhook Handler
const handleRazorpayWebhook = async (webhookData) => {
  try {
    // Razorpay webhook handling logic
    return {
      success: true,
      data: { status: "processed" },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Stripe Webhook Handler
const handleStripeWebhook = async (webhookData) => {
  try {
    // Stripe webhook handling logic
    return {
      success: true,
      data: { status: "processed" },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// PayPal Webhook Handler
const handlePayPalWebhook = async (webhookData) => {
  try {
    // PayPal webhook handling logic
    return {
      success: true,
      data: { status: "processed" },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Mock verification functions for other payment gateways
const verifyRazorpayPayment = async (paymentReferenceId) => {
  return { success: true, data: { status: "completed" } };
};

const verifyStripePayment = async (paymentReferenceId) => {
  return { success: true, data: { status: "completed" } };
};

const verifyPayPalPayment = async (paymentReferenceId) => {
  return { success: true, data: { status: "completed" } };
};

// Get Payment Methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: "phonepe",
        name: "PhonePe",
        description: "Pay with PhonePe UPI, Cards, Wallets",
        icon: "https://example.com/phonepe-icon.png",
        enabled: true,
        supportedCurrencies: ["INR"],
        minAmount: 1,
        maxAmount: 100000,
      },
      {
        id: "razorpay",
        name: "Razorpay",
        description: "Pay with Cards, UPI, Net Banking",
        icon: "https://example.com/razorpay-icon.png",
        enabled: true,
        supportedCurrencies: ["INR"],
        minAmount: 1,
        maxAmount: 100000,
      },
      {
        id: "stripe",
        name: "Stripe",
        description: "Pay with International Cards",
        icon: "https://example.com/stripe-icon.png",
        enabled: true,
        supportedCurrencies: ["USD", "EUR", "INR"],
        minAmount: 0.5,
        maxAmount: 10000,
      },
      {
        id: "paypal",
        name: "PayPal",
        description: "Pay with PayPal Account",
        icon: "https://example.com/paypal-icon.png",
        enabled: true,
        supportedCurrencies: ["USD", "EUR", "GBP"],
        minAmount: 1,
        maxAmount: 10000,
      },
      {
        id: "cod",
        name: "Cash on Delivery",
        description: "Pay when your order is delivered",
        icon: "https://example.com/cod-icon.png",
        enabled: true,
        supportedCurrencies: ["INR"],
        minAmount: 1,
        maxAmount: 5000,
      },
    ];

    return res.status(200).json({
      success: true,
      message: "Payment methods retrieved successfully",
      data: {
        paymentMethods,
        defaultCurrency: "INR",
        supportedCurrencies: ["INR", "USD", "EUR", "GBP"],
      },
    });
  } catch (error) {
    console.error("Error getting payment methods:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving payment methods",
      error: error.message,
    });
  }
};

// Get Payment Status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentReferenceId } = req.params;

    if (!paymentReferenceId) {
      return res.status(400).json({
        success: false,
        message: "paymentReferenceId is required",
      });
    }

    // In a real implementation, you would query your payment database
    // For now, returning a mock response
    return res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully",
      data: {
        paymentReferenceId,
        status: "completed",
        amount: 1000,
        currency: "INR",
        paymentMethod: "phonepe",
        transactionId: "TXN123456789",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving payment status",
      error: error.message,
    });
  }
};
