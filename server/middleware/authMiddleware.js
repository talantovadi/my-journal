const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (req.method === "OPTIONS") {
    next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; // Bearer token

    if (!token) {
      return res
        .status(401)
        .json({ message: "Не авторизован. Токен отсутсвует" });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ message: "Ваш токен истек. Пожалуйста, обновите его." });
        }

        return res.status(401).json({
          message: "Недействительный токен. Авторизация отклонена.",
        });
      }

      req.user = decoded;

      next();
    });
  } catch (e) {
    res.status(401).json({ message: "Не авторизован" });
  }
};
