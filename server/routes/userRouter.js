const Router = require("express");
const router = new Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/registration", userController.registration);
router.post("/login", userController.login);
router.get("/auth", authMiddleware, userController.check);
router.get("/", userController.getAll);
router.post("/reset-password-request", userController.resetPasswordRequest); // Запрос на сброс
router.get("/reset-password/:token", userController.resetPasswordPage); // Для проверки токена
router.post("/reset-password", userController.resetPassword);
router.post("/refresh", userController.refresh); //refresh token

router.put(
  "/:id/profile_image",
  upload.single("profile_image"),
  userController.updateProfileImage
);
router.delete("/:id/profile_image", userController.deleteProfileImage);
router.get("/:id/profile", userController.getUserProfile); //by id

module.exports = router;
