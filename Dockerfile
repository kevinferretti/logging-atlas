FROM node:22-bookworm-slim

WORKDIR /app

# openssl is required by Prisma's query engine on Debian.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# DATABASE_URL is only needed at runtime; a dummy keeps `prisma generate` /
# `next build` happy in the image (pages are dynamic, so the build never
# connects to the database). The real value comes from the env file at runtime.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# entrypoint runs `prisma db push`, seeds on first boot, then starts Next.js.
CMD ["sh", "deploy/ovh/entrypoint.sh"]
