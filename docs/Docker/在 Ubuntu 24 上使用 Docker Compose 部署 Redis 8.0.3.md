
# 在 Ubuntu 24 服务器上使用 Docker Compose 部署 Redis 8.0.3

## 1. 创建项目目录和 Docker Compose 文件

```bash showLineNumbers
# 创建目录结构
mkdir -p $HOME/container/redis/{data,conf}

# 进入项目目录
cd $HOME/container/redis
```

## 2. 创建 Docker Compose 文件

创建 `docker-compose.yml` 文件：

```bash showLineNumbers
vim docker-compose.yml
```

添加以下内容：

```yaml showLineNumbers

services:
  redis:
    image: redis:8.0.3
    container_name: redis-server
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - ./data:/data
      - ./conf/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    environment:
      - TZ=Asia/Shanghai
    networks:
      - redis-net

networks:
  redis-net:
    driver: bridge
```

## 3. 创建 Redis 配置文件

创建自定义配置文件：

```bash showLineNumbers
vim conf/redis.conf
```

添加以下基本配置：

```conf showLineNumbers
# 基本设置
bind 0.0.0.0
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# 持久化
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# 安全设置 替换为强密码
requirepass "your_strong_password_here"  

# 内存管理
maxmemory 1gb
maxmemory-policy allkeys-lru

# 日志
loglevel notice
logfile ""

# 高级设置
# 根据CPU核心数调整
io-threads 2
io-threads-do-reads yes
```

## 4. 部署 Redis 容器

```bash showLineNumbers
# 启动容器
docker compose up -d

# 查看容器状态
docker compose ps
```

## 5. 验证 Redis 部署

```bash showLineNumbers
# 连接到 Redis 容器
docker compose exec redis redis-cli

# 在 Redis CLI 中验证
AUTH your_strong_password_here
INFO server
PING
```

## 6. 管理 Redis 容器

### 常用命令：
```bash showLineNumbers
# 启动/停止/重启
docker compose start
docker compose stop
docker compose restart

# 查看日志
docker compose logs -f

# 更新容器（当有新版本时）
docker compose pull
docker compose up -d --force-recreate

# 删除容器（保留数据）
docker compose down
```


## 7. 性能监控

### 内置监控：
```bash showLineNumbers
docker compose exec redis redis-cli --user default --pass your_password INFO

# 监控关键指标
docker compose exec redis redis-cli --user default --pass your_password INFO memory
docker compose exec redis redis-cli --user default --pass your_password INFO stats
```


## 8. 故障排除

### 常见问题解决：
1. **连接问题**：
   ```bash showLineNumbers
   # 测试端口连通性
   nc -zv localhost 6379
   
   # 检查防火墙
   sudo ufw status
   ```

2. **权限问题**：
   ```bash showLineNumbers
   # 检查数据目录权限
   sudo chown -R 1000:1000 $HOME/container/redis/data
   ```

3. **配置错误**：
   ```bash showLineNumbers
   # 检查配置语法
   docker compose exec redis redis-server --test /usr/local/etc/redis/redis.conf
   ```

4. **内存不足**：
   ```bash showLineNumbers
   # 查看内存使用
   docker stats redis-server
   
   # 在 redis.conf 中调整
   maxmemory 2gb  # 增加内存限制
   ```

![image-20250716141147955](https://images.liuyi.site/image-20250716141147955.png)

![[附件/Pasted image 20250716141219.png]]