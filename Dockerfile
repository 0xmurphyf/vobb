FROM node:20-alpine

RUN apk add --no-cache libssl3 openssl3

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/prisma ./prisma
COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=\"${DATABASE_URL}&sslmode=disable\" && npx prisma generate && npx prisma db push --skip-generate --accept-data-loss && npx tsx src/index.ts"]
