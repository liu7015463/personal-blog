# 项目运行指南

本项目是基于 [Docusaurus](https://docusaurus.io/) 构建的现代静态网站生成器项目，提供三种运行方式：本地开发、Docker 容器运行和 Docker Compose 编排运行。

## 方式一：使用 pnpm 本地运行

### 环境要求
- Node.js >= 18.0
- pnpm

### 运行步骤

1. 安装依赖：
```bash
pnpm install
```

2. 构建项目：
```bash
pnpm build
```

3. 启动服务：
```bash
pnpm run server
```

4. 访问应用：
- 默认地址：http://localhost:3000

### 开发模式
```bash
# 开发模式（支持热重载）
pnpm start
```

## 方式二：使用 Docker 运行

### 环境要求
- Docker

### 运行步骤

1. 构建镜像：
```bash
docker build -t ray-blog .
```

2. 运行容器：
```bash
docker run -d -p 3100:3100 --name ray-blog ray-blog
```

3. 访问应用：
- 地址：http://localhost:3100

### 管理命令
```bash
# 查看容器状态
docker ps

# 查看日志
docker logs -f ray-blog

# 停止容器
docker stop ray-blog

# 删除容器
docker rm ray-blog
```

## 方式三：使用 Docker Compose 运行（推荐）

### 环境要求
- Docker
- Docker Compose

### 运行步骤

1. 启动服务：
```bash
docker-compose up -d
```

2. 访问应用：
- 地址：http://localhost:3100

### 管理命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f website

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build
```

## Docker 配置说明

### 文件说明
- `Dockerfile`: Docker 镜像构建配置（多阶段构建）
- `docker-compose.yml`: Docker Compose 服务编排配置
- `.dockerignore`: Docker 构建时忽略的文件和目录

### 端口配置
- pnpm 本地运行：3000
- Docker/Docker Compose：3100

### 环境变量
- `NODE_ENV=production`: 生产环境配置

### 特性
- 多阶段构建优化镜像大小
- 健康检查监控服务状态
- 资源限制防止过度使用
- 非 root 用户运行提高安全性

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :3100  # Docker 端口
   lsof -i :3000  # pnpm 端口
   ```

2. **Docker 构建失败**
   ```bash
   # 清理 Docker 缓存
   docker system prune -a
   # 重新构建
   docker-compose build --no-cache
   ```

3. **pnpm 依赖安装失败**
   ```bash
   # 清理缓存
   pnpm store prune
   # 重新安装
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```
