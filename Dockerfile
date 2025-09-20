# 多阶段构建 - 构建阶段
FROM node:22.17-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:22.17-alpine AS production

# 安装 pnpm
RUN npm install -g pnpm

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S docusaurus -u 1001

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建产物
COPY --from=builder /app/build ./build
COPY --from=builder /app/docusaurus.config.ts ./
COPY --from=builder /app/sidebars.ts ./

# 更改文件所有者
RUN chown -R docusaurus:nodejs /app

# 切换到非 root 用户
USER docusaurus

# 暴露端口
EXPOSE 3100

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100 || exit 1

# 启动命令
CMD ["pnpm", "run", "server", "--", "--port", "3100", "--host", "0.0.0.0"]
