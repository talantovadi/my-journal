FROM node:16

WORKDIR /app

# Копируем package.json и package-lock.json
COPY ./server/package*.json ./

# Устанавливаем зависимости (пересобираем bcrypt для текущей архитектуры)
RUN npm install --build-from-source

COPY ./server ./ 

EXPOSE 5000

CMD ["npm", "run", "dev"]


