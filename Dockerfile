# Basimage
FROM node:22

# Skapa arbetskatalog
WORKDIR /app

# Kopiera package.json och installera dependencies
COPY package*.json ./
RUN npm install

# Kopiera resten av koden
COPY . .

# Kopiera Prisma-mappen (om du använder Prisma)
COPY prisma ./prisma/

# Generera Prisma client
RUN npx prisma generate

# Exponera port (ska matcha .env)
EXPOSE 3000

# CMD för dev/production
CMD ["sh", "-c", "if [ \"$MODE\" = 'development' ]; then npm run dev; else npm start; fi"]
