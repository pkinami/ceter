FROM node:22-bookworm-slim
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends libreoffice-writer fontconfig poppler-utils ca-certificates && rm -rf /var/lib/apt/lists/*
# Ceter must mount licensed copies of the exact Word-master fonts here. Do not
# replace them with metrically similar fonts; health checks deliberately fail.
RUN mkdir -p /usr/local/share/fonts/ceter
COPY server.mjs /app/server.mjs
USER nobody
ENV PORT=8080
EXPOSE 8080
CMD ["node", "/app/server.mjs"]
