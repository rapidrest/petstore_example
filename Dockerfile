# Use an official Python runtime as a parent image
FROM node:lts-alpine AS builder

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY package.json yarn.lock .yarnrc.yml tsconfig.json RELEASE_NOTES.rst ./
COPY .yarn/releases ./.yarn/releases
COPY ./src /app/src

ARG NODE_ENV=production
ENV NODE_ENV ${NODE_ENV}
RUN echo Building as $NODE_ENV
# Install any needed packages specified in requirements.txt
RUN apk update && apk upgrade -f
# Per https://github.com/nodejs/docker-node#nodealpine
RUN apk add --no-cache gcompat
RUN npm install --global nodemon
RUN corepack enable

# If production build project
RUN --mount=type=secret,id=YARN_TOKEN if [ "$NODE_ENV" = "production" ]; then NPM_TOKEN=$(cat /run/secrets/YARN_TOKEN) yarn install; fi
RUN --mount=type=secret,id=YARN_TOKEN if [ "$NODE_ENV" = "production" ]; then NPM_TOKEN=$(cat /run/secrets/YARN_TOKEN) yarn cibuild; fi

# Uncomment to Update package.json to include live scripting libraries
RUN --mount=type=secret,id=YARN_TOKEN if [ "$NODE_ENV" = "production" ]; then NPM_TOKEN=$(cat /run/secrets/YARN_TOKEN) yarn remove ts-node typescript; NPM_TOKEN=$(cat /run/secrets/YARN_TOKEN) yarn add ts-node typescript; fi

FROM node:lts-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/tsconfig.json /app/RELEASE_NOTES.rst ./
COPY --from=builder /app/.yarn/releases ./.yarn/releases
COPY --from=builder /app/dis[t] ./dist
COPY --from=builder /app/src ./src
# Add curl for health check
RUN apk update && apk upgrade -f && apk add curl
# Per https://github.com/nodejs/docker-node#nodealpine
RUN apk add --no-cache gcompat
RUN npm install --global nodemon
RUN corepack enable

ARG NODE_ENV=production
ENV NODE_ENV ${NODE_ENV}
RUN echo Running as $NODE_ENV

RUN --mount=type=secret,id=YARN_TOKEN if [ "$NODE_ENV" = "production" ]; then NPM_TOKEN=$(cat /run/secrets/YARN_TOKEN) yarn workspaces focus --all --production; fi

# Make port 3000 available to the world outside this container
EXPOSE 3000
# Make port 9229 available to the world for debugging
EXPOSE 9229

# Define environment variable
ENV PORT 3000

# Set a healthcheck to ensure the service is always alive
HEALTHCHECK --interval=10s --timeout=60s --start-period=15s --retries=3 CMD curl -f http://localhost:3000/ || exit 1

# Run app.js when the container launches
CMD ["node", "dist/server.js"]