require("dotenv").config();

const express = require("express");
const sequelize = require("./db");
const models = require("./models/models");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const router = require("./routes/index");
const errorHandler = require("./middleware/ErrorHandlingMiddleware");
const path = require("path");
const postRouter = require("./routes/postRouter");

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "static")));
// app.use(fileUpload({ debug: true }));
app.use(
  fileUpload({
    createParentPath: true, // Создает директорию, если она отсутствует
    limits: { fileSize: 50 * 1024 * 1024 }, // Устанавливаем ограничение на размер файла (например, 50MB)
  })
);
app.use("/api", router);
app.use("/posts", postRouter);

//Обработка ошибок, последний Middlewear
app.use(errorHandler);

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.log(e);
  }
};
start();
