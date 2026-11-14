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
RUN echo "os-refresh 2026-11-14.180500" && apk upgrade --no-cache
# Fonts for burned-in captions.
#
# Deliberately NOT `apk add ffmpeg`: Alpine builds ffmpeg against libass, which
# pulls harfbuzz, which pulls glib. The image scanner blocks every image that
# contains glib (ALPINE-CVE-2021-27219 lists 2.66.6-r0 as the fix, which is older
# than the shipped 2.88.1-r1, so the finding can never be repaired by upgrading).
# A static ffmpeg instead bundles libass, freetype, fontconfig, x264 and its other
# libraries inside one binary: the image ships no glib at all, the scanner has
# nothing to reject, and ASS subtitle burning plus reframing keep working exactly
# as before. Override FFMPEG_URL to pin a different static build.
ARG FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz
RUN apk add --no-cache fontconfig ttf-dejavu xz \
 && mkdir -p /opt/ffmpeg \
 && wget -q -O /tmp/ffmpeg.tar.xz "$FFMPEG_URL" \
 && tar -xJf /tmp/ffmpeg.tar.xz -C /opt/ffmpeg --strip-components=1 \
 && rm -f /tmp/ffmpeg.tar.xz \
 && ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg \
 && ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe \
 && ffmpeg -hide_banner -version | head -1
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# IMPORTANT: your server MUST listen on 0.0.0.0 and process.env.PORT.
RUN mkdir -p /app /home/appjet && chown -R 10001:10001 /app /home/appjet
ENV HOME=/home/appjet
USER 10001:10001
CMD ["npm", "start"]
