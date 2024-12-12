const Router = require("express");
const router = new Router();
const postController = require("../controllers/postController");
const checkRole = require("../middleware/checkRoleMiddleware");


router.post("/", postController.create);
router.get("/", postController.getAll);
router.get("/:id", postController.getOne);
router.delete("/:id", postController.delete);
router.put("/:id", postController.update);

router.post("/:id/images", postController.addImages);
router.get("/:id/thumbnails", postController.getPostWithThumbnails);
router.delete("/:id/images", postController.deleteImage);


module.exports = router;
