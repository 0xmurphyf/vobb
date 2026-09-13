FROM node:20-alpine

RUN apk add --no-cache libssl3 openssl3

WORKDIR /app

# Copy package files
COPY server/package.json ./
COPY server/package-lock.json* ./

# Install dependencies
RUN npm install --production=false

# Copy prisma schema and generate client
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "if echo \"$DATABASE_URL\" | grep -q '?'; then export DATABASE_URL=\"${DATABASE_URL}&schema=public&sslmode=disable\"; else export DATABASE_URL=\"${DATABASE_URL}?schema=public&sslmode=disable\"; fi && npx prisma db push --accept-data-loss && npx tsx src/index.ts"]
