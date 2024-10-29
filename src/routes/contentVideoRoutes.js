const express = require("express");
const router = express.Router();
const videoController = require("../controllers/contentVideosController");

router.post("/videos", videoController.createVideo);
router.get("/videos", videoController.getAllVideos);
router.get("/videos/user/:userId", videoController.getVideosByUser);
router.get("/videos/:videoId", videoController.getVideoById);
router.delete("/videos/:videoId", videoController.deleteVideo);
router.post("/videos/:videoId/like", videoController.toggleLikeVideo);

module.exports = router;
