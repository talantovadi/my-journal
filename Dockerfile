FROM node:20

WORKDIR /app

# Копируем package.json и package-lock.json
COPY ./server/package*.json ./

# Устанавливаем зависимости (пересобираем bcrypt для текущей архитектуры)
RUN npm install --build-from-source

# Копируем остальные файлы проекта, включая wait-for-it.sh
COPY ./server ./ 

# Копируем скрипт wait-for-it.sh и даем права на выполнение
COPY wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

EXPOSE 5000

# Запуск приложения с ожиданием запуска базы данных
CMD ["./wait-for-it.sh", "db:5432", "--", "npm", "run", "dev"]


