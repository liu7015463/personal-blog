# 在 Ubuntu 24 上使用 Docker Compose 部署  
  
这是一个用于代理到端口3000应用的nginx docker配置。  
  
## 目录结构  
  
```  
/home/liuyi/container/nginx/  
├── docker-compose.yml    # Docker Compose配置  
├── setup.sh             # 初始化脚本  
├── conf/               # nginx配置目录 (挂载到 /etc/nginx)│   ├── nginx.conf       # 主配置文件  
│   └── conf.d/          # 站点配置目录  
│       └── site.conf    # 站点配置文件  
├── logs/                # nginx日志目录 (挂载到 /var/log/nginx)├── html/                # 静态文件目录 (挂载到 /usr/share/nginx/html)│   └── index.html       # 默认页面  
└── certs/               # SSL证书目录 (挂载到 /etc/nginx/certs)    ├── liuyi.site.crt   # SSL证书  

```  

**==docker-compose.yml==**
```yaml showLineNumbers
  
services:  
  nginx:  
    image: nginx:alpine  
    container_name: nginx-proxy  
    restart: unless-stopped  
    ports:  
      - "80:80"  
      - "443:443"  
    volumes:  
      - ./conf:/etc/nginx  
      - ./logs:/var/log/nginx  
      - ./html:/usr/share/nginx/html  
      - ./certs:/etc/nginx/certs  
    networks:  
      - nginx-network  
  
networks:  
  nginx-network:  
    driver: bridge
```

**==setup.sh==**
```bash showLineNumbers
#!/bin/bash  
  
# Setup script for nginx docker container  
# This script should be run from /home/liuyi/container/nginx directory  
  
set -e  
  
# Colors for output  
RED='\033[0;31m'  
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'  
NC='\033[0m' # No Color  
  
log_info() {  
    echo -e "${GREEN}[INFO]${NC} $1"  
}  
  
log_warn() {  
    echo -e "${YELLOW}[WARN]${NC} $1"  
}  
  
log_error() {  
    echo -e "${RED}[ERROR]${NC} $1"  
}  
  
# Check if we're in the correct directory  
if [[ ! "$(pwd)" == "/home/liuyi/container/nginx" ]]; then  
    log_error "This script must be run from /home/liuyi/container/nginx directory"  
    log_info "Current directory: $(pwd)"  
    log_info "Please cd to /home/liuyi/container/nginx and run this script again"  
    exit 1  
fi  
  
log_info "Setting up nginx docker environment..."  
  
# Create necessary directories  
log_info "Creating directory structure..."  
mkdir -p logs html certs conf  
  
# Extract nginx configuration from temporary container  
log_info "Extracting nginx configuration from temporary container..."  
  
# Create temporary nginx container  
log_info "Creating temporary nginx container..."  
docker run --name temp-nginx -d nginx:alpine > /dev/null  
  
# Copy nginx configuration from container  
log_info "Copying nginx configuration files..."  
docker cp -r temp-nginx:/etc/nginx/* ./conf  
  
# Remove temporary container  
log_info "Cleaning up temporary container..."  
docker stop temp-nginx > /dev/null  
docker rm temp-nginx > /dev/null  
  
# Set proper permissions  
log_info "Setting directory permissions..."  
chmod 755 conf logs html certs  
chmod 755 conf/conf.d  
  
# Remove default.conf if it exists  
if [ -f "conf/conf.d/default.conf" ]; then  
    log_info "Removing default.conf..."  
    mv conf/conf.d/default.conf conf/conf.d/default.conf.backup  
fi  
  
cp ../certs/* ./certs/  
  
# Create our custom site.conf  
log_info "Creating custom site.conf..."  
cat > conf/conf.d/site.conf << 'EOF'  
# HTTP server for IP and domain access (for testing)  
server {  
    listen 80;    server_name _ liuyi.site www.liuyi.site;  # Accept both IP and domain  
    # Redirect www to non-www for domain access    if ($host = "www.liuyi.site") {        return 301 http://liuyi.site$request_uri;    }  
    # Optional: Comment out these lines to allow HTTP domain access for testing    # if ($host = "liuyi.site") {    #     return 301 https://$host$request_uri;    # }  
    # Proxy to app container on port 3000    location / {        proxy_pass http://172.17.0.1:3000;        proxy_set_header Host $host;        proxy_set_header X-Real-IP $remote_addr;        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;        proxy_set_header X-Forwarded-Proto $scheme;  
        # WebSocket support (if needed)        proxy_http_version 1.1;        proxy_set_header Upgrade $http_upgrade;        proxy_set_header Connection "upgrade";  
        # Timeout settings        proxy_connect_timeout 60s;        proxy_send_timeout 60s;        proxy_read_timeout 60s;    }  
    # Health check endpoint    location /nginx-health {        access_log off;        return 200 "healthy\n";        add_header Content-Type text/plain;    }}  
  
# HTTPS server for www domain (primary certificate)  
server {  
    listen 443 ssl http2;    server_name www.liuyi.site;  
    # SSL certificate configuration    ssl_certificate /etc/nginx/certs/liuyi.site.pem;    ssl_certificate_key /etc/nginx/certs/liuyi.site.key;  
    # SSL configuration    ssl_protocols TLSv1.2 TLSv1.3;    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;    ssl_prefer_server_ciphers off;    ssl_session_cache shared:SSL:10m;    ssl_session_timeout 10m;    ssl_session_tickets off;  
    # Security headers    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;    add_header X-Frame-Options "SAMEORIGIN" always;    add_header X-Content-Type-Options "nosniff" always;    add_header X-XSS-Protection "1; mode=block" always;    add_header Referrer-Policy "strict-origin-when-cross-origin" always;  
    # This server block handles www.liuyi.site directly    # No redirect needed since certificate matches www.liuyi.site  
    # Proxy to app container on port 3000    location / {        proxy_pass http://172.17.0.1:3000;        proxy_set_header Host $host;        proxy_set_header X-Real-IP $remote_addr;        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;        proxy_set_header X-Forwarded-Proto $scheme;        proxy_set_header X-Forwarded-Host $host;        proxy_set_header X-Forwarded-Server $host;  
        # WebSocket support (if needed)        proxy_http_version 1.1;        proxy_set_header Upgrade $http_upgrade;        proxy_set_header Connection "upgrade";  
        # Timeout settings        proxy_connect_timeout 60s;        proxy_send_timeout 60s;        proxy_read_timeout 60s;  
        # Buffer settings        proxy_buffering on;        proxy_buffer_size 128k;        proxy_buffers 4 256k;        proxy_busy_buffers_size 256k;    }  
    # Health check endpoint    location /nginx-health {        access_log off;        return 200 "healthy\n";        add_header Content-Type text/plain;    }}  
  
# HTTPS server for non-www domain (redirect to www)  
server {  
    listen 443 ssl http2;    server_name liuyi.site;  
    # Use the same SSL certificate (even though CN doesn't match)    ssl_certificate /etc/nginx/certs/liuyi.site.crt;    ssl_certificate_key /etc/nginx/certs/liuyi.site.key;  
    # SSL configuration    ssl_protocols TLSv1.2 TLSv1.3;    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;    ssl_prefer_server_ciphers off;    ssl_session_cache shared:SSL:10m;    ssl_session_timeout 10m;    ssl_session_tickets off;  
    # Redirect non-www to www (since certificate is for www.liuyi.site)    return 301 https://www.liuyi.site$request_uri;}  
EOF  
  
# Check if SSL certificates already exist  
if [ -f "certs/liuyi.site.crt" ] && [ -f "certs/liuyi.site.key" ]; then  
    log_info "SSL certificates already exist, skipping certificate generation..."  
    log_info "If you want to use your own certificates, please replace:"  
    log_info "  - certs/liuyi.site.crt (certificate file)"  
    log_info "  - certs/liuyi.site.key (private key file)"  
else  
    log_info "Generating placeholder self-signed SSL certificate for liuyi.site..."  
    log_warn "Please replace with your actual SSL certificates before production use!"  
fi  
  
# Create default index.html if it doesn't exist  
if [ ! -f "html/index.html" ]; then  
    log_info "Creating default index.html..."  
    cat > html/index.html << 'EOF'  
<!DOCTYPE html>  
<html lang="en">  
<head>  
    <meta charset="UTF-8">    <meta name="viewport" content="width=device-width, initial-scale=1.0">    <title>Nginx Proxy - liuyi.site</title>    <style>        body {            font-family: Arial, sans-serif;            max-width: 800px;            margin: 50px auto;            padding: 20px;            background-color: #f5f5f5;        }        .container {            background: white;            padding: 30px;            border-radius: 8px;            box-shadow: 0 2px 10px rgba(0,0,0,0.1);        }        h1 {            color: #333;            text-align: center;        }        .status {            background: #e8f5e8;            border: 1px solid #4caf50;            padding: 15px;            border-radius: 4px;            margin: 20px 0;        }        .info {            background: #e3f2fd;            border: 1px solid #2196f3;            padding: 15px;            border-radius: 4px;            margin: 20px 0;        }        code {            background: #f4f4f4;            padding: 2px 6px;            border-radius: 3px;            font-family: monospace;        }    </style></head>  
<body>  
    <div class="container">        <h1>🚀 Nginx Proxy Server</h1>  
        <div class="status">            <strong>✅ Status:</strong> Nginx is running successfully!        </div>  
        <div class="info">            <h3>Configuration Info:</h3>            <ul>                <li><strong>Domain:</strong> liuyi.site</li>                <li><strong>Proxy Target:</strong> localhost:3000</li>                <li><strong>HTTP:</strong> IP access only</li>                <li><strong>HTTPS:</strong> Domain access (auto redirect)</li>            </ul>        </div>  
        <div class="info">            <h3>Access Methods:</h3>            <ul>                <li><code>http://YOUR_SERVER_IP</code> - HTTP access via IP</li>                <li><code>https://liuyi.site</code> - HTTPS access via domain</li>                <li><code>http://liuyi.site</code> - Redirects to HTTPS</li>            </ul>        </div>  
        <p style="text-align: center; color: #666; margin-top: 30px;">            This page will be replaced by your application running on port 3000        </p>    </div></body>  
</html>  
EOF  
fi  
  
# Display setup summary  
log_info "Setup completed successfully!"  
echo  
echo "Directory structure:"  
echo "├── docker-compose.yml"  
echo "├── setup.sh"  
echo "├── conf/"  
echo "│   ├── nginx.conf"  
echo "│   ├── mime.types"  
echo "│   └── conf.d/"  
echo "│       └── site.conf"  
echo "├── logs/ (empty, will be populated by nginx)"  
echo "├── html/"  
echo "│   └── index.html"  
echo "└── certs/"  
echo "    ├── liuyi.site.crt"  
echo "    └── liuyi.site.key"  
echo  
echo "Next steps:"  
echo "1. Make sure your app container is running on port 3000"  
echo "2. Start nginx: docker compose up -d"  
echo "3. Check logs: docker compose logs -f"  
echo "4. Test HTTP access: curl http://YOUR_SERVER_IP"  
echo "5. Test HTTPS access: curl -k https://liuyi.site (add to /etc/hosts if needed)"echo  
log_warn "IMPORTANT: Replace the placeholder SSL certificates with your actual certificates!"  
echo "Copy your SSL certificates to:"  
echo "  - certs/liuyi.site.crt (your certificate file)"  
echo "  - certs/liuyi.site.key (your private key file)"  
echo  
echo "After replacing certificates, restart nginx:"  
echo "docker compose restart"
```
## 快速开始  
  
### 1. 创建目录并进入  
```bash showLineNumbers
mkdir -p /home/liuyi/container/nginx
cd /home/liuyi/container/nginx
```  
  
### 2. 复制文件  
将所有配置文件复制到此目录。  
  
### 3. 运行初始化脚本  
```bash showLineNumbers
chmod +x setup.sh
./setup.sh  
```  
  
**注意**: 初始化脚本会创建一个临时nginx容器来提取默认配置文件，然后自动删除该临时容器。  
  
### 4. 启动nginx容器  
```bash showLineNumbers
docker compose up -d
```  
  
### 5. 检查状态  
```bash showLineNumbers
docker compose ps
docker compose logs -f
```  
  
  
## 访问方式  
  
### HTTP访问（通过IP）  
- `http://YOUR_SERVER_IP` - 直接访问，代理到3000端口  
  
  
### 配置文件获取  
- setup.sh脚本会创建一个临时的nginx:alpine容器  
- 从临时容器中复制完整的nginx配置文件到本地  
- 删除临时容器，保留配置文件  
- 添加自定义的site.conf配置  
  

## 常用命令  
  
```bash showLineNumbers
# 启动服务  
docker compose up -d  
  
# 停止服务  
docker compose down  
  
# 查看日志  
docker compose logs -f  
  
# 重启nginx  
docker compose restart  
  
# 重新加载nginx配置  
docker compose exec nginx nginx -s reload  
  
# 测试nginx配置  
docker compose exec nginx nginx -t  
```
  