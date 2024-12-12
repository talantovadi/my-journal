const sequelize = require("../db");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING },
  profile_image: { type: DataTypes.STRING, defaultValue: "default.jpg" },
});

const Post = sequelize.define("post", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false }, // ID пользователя
  status: { type: DataTypes.STRING, defaultValue: "draft" }, // Например, draft или published
  img: { type: DataTypes.STRING, allowNull: false },
});

module.exports = {
  User,
  Post,
};
