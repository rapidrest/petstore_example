FROM node:lts-trixie-slim AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml tsconfig.json next.config.ts ./
COPY .yarn/releases ./.yarn/releases
COPY ./scripts /app/scripts
COPY ./src /app/src
COPY ./app /app/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN echo "Building as $NODE_ENV"
RUN apt update && apt upgrade -y
RUN corepack enable
RUN yarn install --immutable
RUN yarn dbuild

FROM node:lts-trixie-slim AS runner
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the built Next.js output and the full node_modules.
# We intentionally avoid standalone output here: Next.js's static file tracer
# (@vercel/nft) cannot follow the dynamic subpath requires used throughout
# @rapidrest/service-core and nconf's dependency trees, causing runtime
# MODULE_NOT_FOUND errors. Copying node_modules in full is the correct
# trade-off for a backend-only API container.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN apt update && apt upgrade -f && apt install curl -y

EXPOSE 3000
EXPOSE 9229

HEALTHCHECK --interval=10s --timeout=60s --start-period=15s --retries=3 CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "node_modules/.bin/next", "start"]
