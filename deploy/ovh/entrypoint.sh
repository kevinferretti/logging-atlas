#!/bin/sh
# Container entrypoint: bring the SQLite schema up to date on the mounted
# volume, seed the demo account on first boot only, then start Next.js.
set -e

echo "[entrypoint] applying schema (prisma db push)…"
npx prisma db push --skip-generate

NEED_SEED=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(n=>{process.stdout.write(n>0?'no':'yes');process.exit(0)}).catch(()=>{process.stdout.write('no');process.exit(0)})")
if [ "$NEED_SEED" = "yes" ]; then
  echo "[entrypoint] empty database — seeding demo account…"
  npm run db:seed
else
  echo "[entrypoint] existing data found — skipping seed."
fi

echo "[entrypoint] starting Next.js on port ${PORT:-3000}…"
exec npm run start
