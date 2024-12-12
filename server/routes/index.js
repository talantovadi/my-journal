const Router = require("express");
const router = new Router();
const postRouter = require("./postRouter");
const userRouter = require("./userRouter");

router.use("/user", userRouter);
router.use("/post", postRouter);

module.exports = router;
