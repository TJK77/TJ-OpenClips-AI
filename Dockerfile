FROM node:26-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# The build needs dev dependencies; they are removed before the copy below.
RUN npm run build && npm prune --omit=dev
# Never ship the local dev store: it holds test uploads and the credential
# encryption key. The container creates a fresh data directory at startup.
RUN rm -rf /app/data /app/tests /app/legacy-oclip
FROM node:26-alpine
# The date keys the build cache so this layer installs today's OS fixes; AppJet keeps it current on deploy.
RUN echo "os-refresh 2026-11-14.173354" && apk upgrade --no-cache
# ffmpeg (with libass) cuts, reframes and burns subtitles; DejaVu fonts give the
# burned-in caption styles a real typeface on this slim image.
#
# It is opt-in because Alpine's ffmpeg pulls glib in through libass -> harfbuzz,
# and the image scanner currently rejects every image containing glib 2.88.1-r1:
# its advisory (ALPINE-CVE-2021-27219) lists 2.66.6-r0 as the fixed version, which
# is OLDER than what Alpine 3.24 ships, so the finding cannot be repaired by
# upgrading. Build with --build-arg INSTALL_FFMPEG=1 (or on a host whose scanner
# data is corrected) to get real rendering; without it the server starts normally
# and reports the video engine as unavailable instead of pretending to render.
ARG INSTALL_FFMPEG=0
RUN if [ "$INSTALL_FFMPEG" = "1" ]; then apk add --no-cache ffmpeg fontconfig ttf-dejavu; fi
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# IMPORTANT: your server MUST listen on 0.0.0.0 and process.env.PORT.
RUN mkdir -p /app /home/appjet && chown -R 10001:10001 /app /home/appjet
ENV HOME=/home/appjet
USER 10001:10001
CMD ["npm","start"]
