require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectDB, getDatabaseInfo } = require("./src/config/database");

const categoryRoutes = require("./src/routes/categoryRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const subcategoryRoutes = require("./src/routes/subcategoryRoutes.js");
const cartRoutes = require("./src/routes/cartRoutes.js");
const orderRoutes = require("./src/routes/orderRoutes.js");
const paymentRoutes = require("./src/routes/paymentRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");
const authRoutes = require("./src/routes/authRoutes.js");
const shippingRoutes = require("./src/routes/shippingRoutes.js");
const designerRoutes = require("./src/routes/designerRoutes.js");
const bannerRoutes = require("./src/routes/bannerRoutes.js");
const filterRoutes = require("./src/routes/filterRoutes.js");
const contentVideoRoutes = require("./src/routes/contentVideoRoutes.js");
const videoRoutes = require("./src/routes/videoRoutes.js");
const coupons = require("./src/routes/couponRoutes.js");
const wishlist = require("./src/routes/wishlistRoutes.js");
const notifications = require("./src/routes/notificationroutes.js");
const states = require("./src/routes/stateRoutes.js");
const queryRoutes = require("./src/routes/queryRoutes.js");
const Blogs = require("./src/routes/blogsRoutes.js");
const stylistRoutes = require("./src/routes/stylistRoutes.js");
const stylistApplicationRoutes = require("./src/routes/stylistApplicationRoutes.js");
const stylistBookingRoutes = require("./src/routes/stylistBookingRoutes.js");
const stylistCalendarRoutes = require("./src/routes/stylistCalendarRoutes.js");
const stylistBannerRoutes = require("./src/routes/stylistBannerRoutes.js");

const app = express();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://indigorhapsody.com",
    "https://www.indigorhapsody.com",
    "https://test.irtest.in",
    "https://www.test.irtest.in",
    "https://salesdashboard.indigorhapsody.com",
    "https://www.salesdashboard.indigorhapsody.com",
    "https://designerdashboard.irtest.in",
    "https://designerdashboard.irtest.in",
    "https://admindashboard.irtest.in",
    "https://www.admindashboard.irtest.in",
    "https://admin.indigorhapsody.com",
    "http://localhost:5173",
    "https://www.admin.indigorhapsody.com"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
}

connectDB();

app.use(express.json());

// Raw body parser for Razorpay webhook (must be before stylist-booking routes)
// This allows proper signature verification for webhooks
app.use('/stylist-booking/razorpay-webhook', express.raw({ type: 'application/json' }));

app.use("/products", productRoutes);
app.use("/queries", queryRoutes);
app.use("/category", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/shipping", shippingRoutes);
app.use("/designer", designerRoutes);
app.use("/banner", bannerRoutes);
app.use("/filter", filterRoutes);
app.use("/video", videoRoutes);
app.use("/content-video", contentVideoRoutes);
app.use("/coupon", coupons);
app.use("/wishlist", wishlist);
app.use("/notification", notifications);
app.use("/states", states);
app.use("/blogs", Blogs);
app.use("/stylist", stylistRoutes);
app.use("/stylist-application", stylistApplicationRoutes);
app.use("/stylist-booking", stylistBookingRoutes);
app.use("/stylist-calendar", stylistCalendarRoutes);
app.use("/stylist-banner", stylistBannerRoutes);

app.get("/health", (req, res) => {
  const dbInfo = getDatabaseInfo();
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: {
      status: dbInfo.states[dbInfo.readyState],
      host: dbInfo.host,
      name: dbInfo.name
    },
    uptime: process.uptime()
  });
});

app.get("/database/status", (req, res) => {
  const dbInfo = getDatabaseInfo();
  res.json(dbInfo);
});

app.listen(PORT, () => {
  console.log(`🚀 IndigoRhapsody Server Started`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Database Status: http://localhost:${PORT}/database/status`);

  if (NODE_ENV === "development") {
    console.log(`🛠️  Development mode - Enhanced logging enabled`);
  } else {
    console.log(`🏭 Production mode - Optimized for performance`);
  }
});
