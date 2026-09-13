# VOBB Server Dockerfile (root-level for Dokploy)
FROM node:20-alpine

# Install required libraries for Prisma + tsx
RUN apk add --no-cache libssl3 openssl3

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx src/index.ts"]
