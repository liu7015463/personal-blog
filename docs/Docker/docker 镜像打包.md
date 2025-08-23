# docker 镜像打包

```dockerfile showLineNumbers
# Dockerfile for Docusaurus site
FROM node:22.17-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port 3000
EXPOSE 3000

# Start the serve command to serve built files on port 3000
CMD ["pnpm", "run", "serve", "--port", "3000", "--host", "0.0.0.0"]
```

本地镜像打包
`docker save -o /Users/liuyi/Downloads/liuyi-site-images.tar liuyi-site:latest`

将tar包上传到服务器上，导入镜像
`docker load -i liuyi-site-images.tar`

```bash showLineNumbers
docker image ls
docker run -d -p 3000:3000 --name liuyi-site liuyi-site
```

![image-20250716190949626](https://images.liuyi.site/image-20250716190949626.png)

![image-20250716191026357](https://images.liuyi.site/image-20250716191026357.png)