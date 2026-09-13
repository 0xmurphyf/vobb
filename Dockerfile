FROM node:20-alpine

RUN apk add --no-cache libssl3 openssl3

WORKDIR /app

# Copy and install
COPY server/package.json ./
RUN npm install --include=dev

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/src ./src

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=\"${DATABASE_URL}?schema=public&sslmode=disable\" && npx prisma db push --accept-data-loss && npx tsx src/index.ts"]
