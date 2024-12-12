const uuid = require("uuid"); //генерирует рандомные айдишники кот-ые не будут повторятся
const path = require("path");
const fs = require("fs");
const { Post } = require("../models/models");
const ApiError = require("../error/ApiError");

class PostController {
  // CREATE
  async create(req, res, next) {
    try {
      console.log("Тело запроса:", req.body);
      console.log("Файлы запроса:", req.files);

      const { title, description, user_id, status} = req.body;

      if (!title) {
        return next(ApiError.badRequest("Поле title обязательно"));
      }

      if (!req.files || !req.files.img) {
        return next(ApiError.badRequest("Файл изображения не найден"));
      }

      const files = Array.isArray(req.files.img)
        ? req.files.img
        : [req.files.img];
      const fileNames = [];

      for (const file of files) {
        const fileName = uuid.v4() + path.extname(file.name);
        console.log("Сохраняем файл:", fileName);

        try {
          file.mv(path.resolve(__dirname, "..", "static", fileName));
          fileNames.push(fileName);
        } catch (err) {
          console.error("Ошибка при сохранении файла:", err.message);
          return next(ApiError.internal("Ошибка при сохранении файла"));
        }
      }

      console.log("Список файлов для сохранения:", fileNames);

      const existingPost = await Post.findOne({ where: { title } });
      if (existingPost) {
        return next(
          ApiError.badRequest("Пост с такой темой уже существует")
        );
      }

      const post = await Post.create({
        title,
        description,
        user_id,
        status,
        img: JSON.stringify(fileNames), // Преобразуем массив имен файлов в строку JSON
      });

      console.log("Устройство создано:", post);

      // Обработка и добавление информации

      const fullPost = await Post.findOne({
        where: { id: post.id },
      });

      console.log("Полный объект поста:", fullPost);
      return res.json(fullPost);
    } catch (e) {
      console.error("Ошибка при создании поста:", e.message);
      next(ApiError.badRequest(`Ошибка создания поста: ${e.message}`));
    }
  }

  // GET ALL
  async getAll(req, res, next) {
    try {
      const posts = await Post.findAll({
      });

      return res.json(posts);
    } catch (e) {
      console.error("Ошибка при получении поста:", e.message);
      next(ApiError.internal("Ошибка при получении постов"));
    }
  }

  //GET ONE
  async getOne(req, res, next) {
    try {
      const { id } = req.params; // из postRouter

      const post = await Post.findOne({
        where: { id },
      });

      if (!post) {
        return next(ApiError.badRequest("Post not found")); // Если устройство не найдено
      }

      const images = post.img ? JSON.parse(post.img) : []; // Преобразуем поле img из строки JSON в массив
      post.dataValues.images = images; // Добавляем массив изображений в данные поста

      return res.json(post);
    } catch (e) {
      next(ApiError.internal("Error fetching post"));
    }
  }

  //DELETE
  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10); // Преобразуем id в число

      if (isNaN(id)) {
        return next(ApiError.badRequest("Неверный формат ID"));
      }

      const post = await Post.findOne({ where: { id } });

      if (!post) {
        return next(ApiError.badRequest("Пост не найден"));
      }

      // Удаляем файлы изображений из файловой системы
      const images = JSON.parse(post.img || "[]");
      images.forEach((image) => {
        const filePath = path.resolve(__dirname, "..", "static", image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      await Post.destroy({ where: { id } });

      return res.json({ message: `Post with id ${id} deleted successfully` });
    } catch (e) {
      next(ApiError.internal("Error deleting post"));
    }
  }

  //UPDATE
  async update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10); // Преобразуем id в число

      if (isNaN(id)) {
        return next(ApiError.badRequest("Invalid ID format"));
      }

      let { title, description, status } = req.body;

      // Если передано изображение
      let fileName;
      if (req.files && req.files.img) {
        const { img } = req.files;
        fileName = uuid.v4() + ".jpg";
        img.mv(path.resolve(__dirname, "..", "static", fileName));
      }

      // Обновляем запись в таблице `Post`
      const [updatedRowsCount] = await Post.update(
        {
          title,
          img: fileName,
          description,
          status
        },
        { where: { id } }
      );

      if (updatedRowsCount === 0) {
        return next(
          ApiError.badRequest("Post not found or nothing to update")
        );
      }

      const updatedPost = await Post.findOne({
        where: { id },
      });

      return res.json({
        message: `Post with id ${id} updated successfully`,
        updatedPost,
      });
    } catch (e) {
      next(ApiError.internal("Error updating post"));
    }
  }

  //ADD IMAGES
  async addImages(req, res, next) {
    try {
      const { id } = req.params; // Получаем ID устройства
      const files = req.files ? req.files.img : null; // Проверяем наличие файлов

      if (!files) {
        return next(ApiError.badRequest("Изображения не предоставлены"));
      }

      // Проверяем, существует ли устройство
      const post = await Post.findOne({ where: { id } });

      if (!post) {
        return next(ApiError.badRequest("Пост не найден"));
      }

      // Проверяем и обрабатываем содержимое поля `img`
      let existingImages = [];
      try {
        existingImages = post.img ? JSON.parse(post.img) : [];
      } catch (error) {
        console.error("Ошибка парсинга JSON в img:", error.message);
        existingImages = post.img ? [post.img] : [];
      }

      const newImages = [];

      // Если files массив (несколько изображений)
      if (Array.isArray(files)) {
        for (const file of files) {
          const fileName = uuid.v4() + path.extname(file.name);
          try {
            file.mv(path.resolve(__dirname, "..", "static", fileName));
            newImages.push(fileName);
          } catch (err) {
            console.error("Ошибка при сохранении файла:", err.message);
            return next(ApiError.internal("Ошибка при сохранении файла"));
          }
        }
      } else {
        // Если files одно изображение
        const fileName = uuid.v4() + path.extname(files.name);
        try {
          files.mv(path.resolve(__dirname, "..", "static", fileName));
          newImages.push(fileName);
        } catch (err) {
          console.error("Ошибка при сохранении файла:", err.message);
          return next(ApiError.internal("Ошибка при сохранении файла"));
        }
      }

      // Обновляем массив изображений
      const updatedImages = [...existingImages, ...newImages];
      post.img = JSON.stringify(updatedImages); // Сохраняем как JSON
      await post.save(); // Сохраняем изменения в базе данных

      return res.json({
        message: "Изображения успешно добавлены",
        images: updatedImages,
      });
    } catch (e) {
      console.error("Ошибка при добавлении изображений:", e.message);
      next(ApiError.internal("Ошибка при добавлении изображений"));
    }
  }

  // DELETE IMAGE
  async deleteImage(req, res, next) {
    try {
      const { id } = req.params;
      const { imageName } = req.body;

      const post = await Post.findOne({ where: { id } });

      if (!post) {
        return next(ApiError.badRequest("Устройство не найдено"));
      }

      const images = JSON.parse(post.img || "[]");
      const imageIndex = images.indexOf(imageName);

      if (imageIndex === -1) {
        return next(ApiError.badRequest("Изображение не найдено"));
      }

      images.splice(imageIndex, 1);
      post.img = JSON.stringify(images);
      await post.save();

      const filePath = path.resolve(__dirname, "..", "static", imageName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({ message: "Изображение успешно удалено", images });
    } catch (e) {
      next(ApiError.internal("Ошибка при удалении изображения"));
    }
  }

  // GET POST WITH THUMBNAILS
  async getPostWithThumbnails(req, res, next) {
    try {
      const { id } = req.params;

      const post = await Post.findOne({
        where: { id },
      });

      if (!post) {
        return next(ApiError.badRequest("Пост не найден"));
      }

      let images = [];
      try {
        // Проверяем, является ли поле JSON или строкой
        images = post.img ? JSON.parse(post.img) : [];
      } catch (err) {
        console.error("Ошибка парсинга JSON в img:", err.message);
        // Если img — строка, преобразуем её в массив
        images = [post.img];
      }

      const thumbnails = images.map((img) => ({
        original: `/static/${img}`,
        thumbnail: `/static/${img}`,
      }));

      return res.json({ post, thumbnails });
    } catch (e) {
      console.error(
        "Ошибка при получении устройства с миниатюрами:",
        e.message
      );
      next(ApiError.internal("Ошибка при получении устройства"));
    }
  }
}

module.exports = new PostController();
