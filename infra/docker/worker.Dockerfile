FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY apps/worker/requirements.txt ./apps/worker/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r apps/worker/requirements.txt
COPY packages ./packages
COPY apps/worker ./apps/worker
CMD ["node", "apps/worker/src/worker.mjs"]
