const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

router.get(
  "/total-count",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getTotalUserCount
);
router.get(
  "/new-users-month",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getNewUsersByCurrentMonth
);
router.get(
  "/user-count-by-state",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getUserCountByState
);
router.get(
  "/most-users-state",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getStateWithMostUsers
);
router.get(
  "/role-user",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getAllUsersWithRoleUser
);

router.post("/check-user-exists", userController.checkUserExists);

router.get(
  "/getUser",
  authMiddleware,
  roleMiddleware(["Admin"]),
  userController.getUsers
);

router.get("/:userId", userController.getUserById);
router.post("/createUser", userController.createUser);
router.put(
  "/:userId/profile",
  authMiddleware,
  userController.updateUserProfile
);
router.put("/:userId", userController.updateUserAddress);
router.get("/user/:userId/addresses", userController.getUserAddresses);

router.post("/request-otp", userController.requestOtp);

router.post("/user-designer", userController.createUserAndDesigner);
router.post("/login", userController.loginDesigner);
router.post("/adminLogin", userController.loginAdmin);
module.exports = router;
