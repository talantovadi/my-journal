const ApiError = require("../error/ApiError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/models");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const uuid = require("uuid");

const generateJwt = (id, email) => {
  const accessToken = jwt.sign({ id, email }, process.env.SECRET_KEY, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ id, email }, process.env.SECRET_REFRESH_KEY, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

class UserController {
  // РЕГИСТРАЦИЯ
  async registration(req, res, next) {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return next(ApiError.badRequest("Некорректный email или password"));
    }
    const candidate = await User.findOne({ where: { email } }); //сущ ли пользователь с таким email
    if (candidate) {
      return next(
        ApiError.badRequest("Пользователь с таким email уже существует")
      );
    }

    const hashPassword = await bcrypt.hash(password, 5);

    const profileImage =
      req.files && req.files.profile_image
        ? uuid.v4() + path.extname(req.files.profile_image.name)
        : "default.jpg";

    if (req.files && req.files.profile_image) {
      req.files.profile_image.mv(
        path.resolve(__dirname, "..", "static", profileImage)
      );
    }

    const user = await User.create({
      username,
      email,
      password: hashPassword,
      profile_image: profileImage,
    });
    const token = generateJwt(user.id, user.email);

    return res.json({ message: "Успешно зарегистрированы", token });
  }

  // ЛОГИН
  async login(req, res, next) {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(ApiError.internal("Пользователь не найден"));
    }

    let comparePassword = bcrypt.compareSync(password, user.password);
    if (!comparePassword) {
      return next(ApiError.internal("Указан неверный пароль"));
    }

    const token = generateJwt(user.id, user.email);
    return res.json({ message: "Успешный вход в систему", token });
  }

  // CHECK
  async check(req, res, next) {
    const token = generateJwt(req.user.id, req.user.email);
    return res.json({ token });
  }

  //GET ALL
  async getAll(req, res) {
    try {
      const users = await User.findAll(); // Получаем всех пользователей из базы данных
      return res.json(users); // Возвращаем их в виде JSON
    } catch (e) {
      return res.status(500).json({ message: "Error fetching users" }); // Обработка ошибок
    }
  }

  //RESET PASSWORD: запрос на сброс
  async resetPasswordRequest(req, res, next) {
    const { email } = req.body;

    if (!email) {
      return next(ApiError.badRequest("Некорректный email"));
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return next(ApiError.badRequest("Пользователь с таким email не найден"));
    }

    // Генерация токена для сброса
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    // Ссылка для сброса
    const resetLink = `http://localhost:5000/api/user/reset-password/${resetToken}`;

    // Отправка ссылки по email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Сброс пароля",
      text: `Перейдите по ссылке для сброса пароля: ${resetLink}`,
    });

    return res.json({
      message: "Ссылка для сброса пароля отправлена на вашу почту",
    });
  }

  //RESET PASSWORD: изменение пароля
  async resetPassword(req, res, next) {
    const { token, newPassword } = req.body;

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      const user = await User.findOne({ where: { id: decoded.id } });

      if (!user) {
        return next(ApiError.badRequest("Пользователь не найден"));
      }

      const hashPassword = await bcrypt.hash(newPassword, 5);

      await user.update({ password: hashPassword });

      return res.json({ message: "Пароль успешно изменен" });
    } catch (e) {
      return next(
        ApiError.badRequest(
          "Ссылка для сброса пароля недействительна или истекла"
        )
      );
    }
  }

  //проверяет токен и возвращает успешный ответ, если токен действителен:
  async resetPasswordPage(req, res, next) {
    const { token } = req.params;

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      return res.json({ message: "Токен действителен", email: decoded.email });
    } catch (e) {
      return next(
        ApiError.badRequest(
          "Ссылка для сброса пароля недействительна или истекла"
        )
      );
    }
  }

  // REFRESH TOKEN
  async refresh(req, res, next) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(ApiError.unauthorized("Токен отсутствует"));
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.SECRET_REFRESH_KEY);

      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return next(ApiError.unauthorized("Пользователь не найден"));
      }

      const tokens = generateTokens(user.id, user.email);

      return res.json({ message: "Токен обновлен", ...tokens });
    } catch (e) {
      return next(ApiError.unauthorized("Невалидный токен"));
    }
  }

  //UPLOAD PROFILE IMAGE
  async updateProfileImage(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return next(ApiError.badRequest("Пользователь не найден"));
      }

      // Удаляем старое изображение (если не default.jpg)
      if (user.profile_image && user.profile_image !== "default.jpg") {
        const oldImagePath = path.resolve(
          __dirname,
          "../static/profile_images",
          user.profile_image
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath); // Удаляем файл
        }
      }

      // Сохраняем новое изображение
      user.profile_image = req.file.filename;
      await user.save();

      return res.json({ message: "Изображение профиля обновлено", user });
    } catch (error) {
      console.error("Ошибка обновления изображения:", error);
      return next(ApiError.internal("Непредвиденная ошибка!"));
    }
  }

  //DELETE PROFILE IMAGE
  async deleteProfileImage(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return next(ApiError.badRequest("Пользователь не найден"));
      }

      // Удаляем текущее изображение, если оно не default.jpg
      if (user.profile_image && user.profile_image !== "default.jpg") {
        const filePath = path.resolve(
          __dirname,
          "../static/profile_images",
          user.profile_image
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Устанавливаем изображение по умолчанию
      user.profile_image = "default.jpg";
      await user.save();

      return res.json({ message: "Изображение профиля удалено", user });
    } catch (error) {
      console.error("Ошибка удаления изображения:", error);
      return next(ApiError.internal("Непредвиденная ошибка!"));
    }
  }

  //GET USER PROFILE
  async getUserProfile(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return next(ApiError.badRequest("Пользователь не найден"));
      }

      return res.json(user);
    } catch (error) {
      console.error("Ошибка получения профиля:", error);
      return next(ApiError.internal("Непредвиденная ошибка!"));
    }
  }
}

module.exports = new UserController();
