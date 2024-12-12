# Используем базовый образ Node.js
FROM node:16

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файлы package.json и package-lock.json из папки server
COPY ./server/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта из папки server
COPY ./server ./

# Указываем порт для запуска приложения
EXPOSE 5000

# Команда для запуска приложения
CMD ["npm", "run", "dev"]

