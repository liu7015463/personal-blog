# docker 部署mysql8.0
OS：Ubuntu24.04
docker：
```bash showLineNumbers
snap list | grep docker
docker             28.1.1+1         3265   latest/stable  canonical**  -
```

---

```bash showLineNumbers
#!/bin/bash
# MySQL 8.0 容器化部署脚本 (完整版)
# 支持 Snap 安装的 Docker 环境
# 功能：部署、自动备份、手工备份、数据还原
set -e

# 配置变量
MYSQL_DIR="$HOME/container/mysql8_0"
BACKUP_DIR="$HOME/backup/mysql8_0"
SNAP_DOCKER_SOCK="/var/snap/docker/common/run/docker.sock"
STANDARD_DOCKER_SOCK="/var/run/docker.sock"

# 检查并修复 Docker 权限
check_docker_access() {
    # 检查用户是否可以直接访问 Docker
    if docker info &>/dev/null; then
        echo "Docker 访问权限正常"
        return 0
    fi
    
    echo "检测到 Docker 访问权限问题，尝试自动修复..."
    
    # 确定 Docker socket 路径
    if [[ -S "$SNAP_DOCKER_SOCK" ]]; then
        docker_sock="$SNAP_DOCKER_SOCK"
        echo "检测到 Snap Docker socket: $docker_sock"
    elif [[ -S "$STANDARD_DOCKER_SOCK" ]]; then
        docker_sock="$STANDARD_DOCKER_SOCK"
        echo "检测到标准 Docker socket: $docker_sock"
    else
        echo "错误: 未找到 Docker socket"
        exit 1
    fi
    
    # 获取 Docker socket 的组信息
    docker_group=$(stat -c '%G' "$docker_sock")
    
    # 如果是 root 组，创建 docker 组
    if [[ "$docker_group" == "root" ]]; then
        echo "创建 docker 用户组..."
        sudo groupadd --force docker
        echo "更新 Docker socket 权限..."
        sudo chown root:docker "$docker_sock"
        sudo chmod 660 "$docker_sock"
        docker_group="docker"
    fi
    
    # 添加用户到组
    if ! groups $USER | grep -q "\b$docker_group\b"; then
        echo "将用户 $USER 添加到 $docker_group 组..."
        sudo usermod -aG $docker_group $USER
        
        # 在当前会话中激活新组
        exec sudo -u $USER -i bash -c "
            echo '组权限已更新，继续执行部署脚本...'
            $0
        "
        exit 0
    else
        echo "用户已在 $docker_group 组中，但权限未生效"
        echo "请尝试重新登录后再次运行此脚本"
        exit 1
    fi
}

# 初始化目录结构
init_directories() {
    echo "创建目录结构..."
    mkdir -p "$MYSQL_DIR"/{config,data,logs}
    mkdir -p "$BACKUP_DIR"/{daily,manual}
}

# 生成 docker-compose 文件
generate_docker_compose() {
    echo "生成 docker-compose.yml..."
    cat > "$MYSQL_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: "\${MYSQL_ROOT_PASSWORD}"
      MYSQL_DATABASE: "\${MYSQL_DATABASE}"
    volumes:
      - mysql_data:/var/lib/mysql
      - mysql_logs:/var/log/mysql
      - mysql_config:/etc/mysql/conf.d
    ports:
      - "3306:3306"

volumes:
  mysql_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: "\${HOME}/container/mysql8_0/data"
  mysql_logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: "\${HOME}/container/mysql8_0/logs"
  mysql_config:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: "\${HOME}/container/mysql8_0/config"
EOF
}

# 配置环境变量
setup_environment() {
    echo "配置 MySQL 环境变量..."
    read -p "输入 MySQL root 密码: " root_pass
    read -p "输入初始数据库名 (留空跳过): " db_name
    
    # 创建环境变量文件
    cat > "$MYSQL_DIR/.env" << EOF
MYSQL_ROOT_PASSWORD=$root_pass
MYSQL_DATABASE=$db_name
HOME=$HOME
EOF
}

# 生成备份脚本
generate_backup_scripts() {
    echo "生成备份脚本..."
    
    # 手工备份脚本
    cat > "$MYSQL_DIR/mysql_manual_backup.sh" << 'EOF'
#!/bin/bash
# MySQL 手工备份脚本
set -e

MYSQL_DIR="$(dirname "$0")"
BACKUP_DIR="$HOME/backup/mysql8_0"
CONTAINER_NAME="mysql8"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
BACKUP_PATH="$BACKUP_DIR/manual/$TIMESTAMP"
mkdir -p "$BACKUP_PATH/data"
mkdir -p "$BACKUP_PATH/config"

# 加载环境变量
source "$MYSQL_DIR/.env"

echo "[$(date '+%F %T')] 开始手工备份..."
echo "备份保存到: $BACKUP_PATH"

# 备份数据库
docker exec $CONTAINER_NAME mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases | gzip > "$BACKUP_PATH/data/full_backup.sql.gz"

# 备份配置文件
cp -a "$MYSQL_DIR/config/"* "$BACKUP_PATH/config/"

# 保留最多30个手工备份
cd "$BACKUP_DIR/manual"
backup_count=$(ls -1 | wc -l)
if [ $backup_count -gt 30 ]; then
    oldest_backup=$(ls -1t | tail -1)
    echo "删除最旧备份: $oldest_backup"
    rm -rf "$oldest_backup"
fi

echo "[$(date '+%F %T')] 备份完成!"
echo "备份大小: $(du -sh "$BACKUP_PATH" | cut -f1)"
EOF

    # 每日备份脚本
    cat > "$MYSQL_DIR/mysql_daily_backup.sh" << 'EOF'
#!/bin/bash
# MySQL 每日备份脚本
set -e

MYSQL_DIR="$(dirname "$0")"
BACKUP_DIR="$HOME/backup/mysql8_0"
CONTAINER_NAME="mysql8"
TIMESTAMP=$(date +%Y%m%d)

# 创建备份目录
BACKUP_PATH="$BACKUP_DIR/daily/$TIMESTAMP"
mkdir -p "$BACKUP_PATH/data"
mkdir -p "$BACKUP_PATH/config"

# 加载环境变量
source "$MYSQL_DIR/.env"

echo "[$(date '+%F %T')] 开始每日备份..."
echo "备份保存到: $BACKUP_PATH"

# 备份数据库
docker exec $CONTAINER_NAME mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases | gzip > "$BACKUP_PATH/data/full_backup.sql.gz"

# 备份配置文件
cp -a "$MYSQL_DIR/config/"* "$BACKUP_PATH/config/"

# 删除超过30天的备份
find "$BACKUP_DIR/daily" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "[$(date '+%F %T')] 每日备份完成!"
echo "备份大小: $(du -sh "$BACKUP_PATH" | cut -f1)"
EOF

    # 设置执行权限
    chmod +x "$MYSQL_DIR/mysql_manual_backup.sh"
    chmod +x "$MYSQL_DIR/mysql_daily_backup.sh"
}

# 生成还原脚本
generate_restore_script() {
    echo "生成还原脚本..."
    
    cat > "$MYSQL_DIR/mysql_restore.sh" << 'EOF'
#!/bin/bash
# MySQL 还原脚本
set -e

MYSQL_DIR="$(dirname "$0")"
BACKUP_DIR="$HOME/backup/mysql8_0"
CONTAINER_NAME="mysql8"

# 先执行手工备份当前状态
echo "===== 开始还原前备份当前状态 ====="
"$MYSQL_DIR/mysql_manual_backup.sh"

# 显示可用备份
echo ""
echo "===== 可用备份列表 ====="
echo "【每日备份】"
find "$BACKUP_DIR/daily" -maxdepth 1 -type d -name "20*" | sort -r | head -10
echo ""
echo "【手工备份】"
find "$BACKUP_DIR/manual" -maxdepth 1 -type d -name "20*" | sort -r | head -10
echo ""

read -p "输入要恢复的备份完整路径: " restore_path

# 验证备份存在
if [[ ! -d "$restore_path" || ! -f "$restore_path/data/full_backup.sql.gz" ]]; then
  echo "错误: 备份文件不存在或不完整"
  exit 1
fi

# 加载环境变量
source "$MYSQL_DIR/.env"

# 停止容器
echo "停止 MySQL 容器..."
cd "$MYSQL_DIR"
docker compose stop mysql

# 还原数据
echo "还原数据..."
# 先清空数据目录
find "$MYSQL_DIR/data" -mindepth 1 -delete
# 导入备份数据
gzip -dc "$restore_path/data/full_backup.sql.gz" | docker run -i --rm \
  -v "$MYSQL_DIR/data":/var/lib/mysql \
  mysql:8.0 \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD"

# 还原配置
echo "还原配置..."
rm -rf "$MYSQL_DIR/config"/*
cp -a "$restore_path/config/"* "$MYSQL_DIR/config/"

# 启动容器
docker compose up -d

echo "===== 还原完成! ====="
echo "恢复备份: $restore_path"
echo "MySQL 容器已启动"
EOF

    chmod +x "$MYSQL_DIR/mysql_restore.sh"
}

# 配置 systemd timer
setup_systemd_timer() {
    echo "配置 systemd timer 每日备份..."
    mkdir -p "$HOME/.config/systemd/user"
    
    # 创建 service 文件
    cat > "$HOME/.config/systemd/user/mysql-daily-backup.service" << EOF
[Unit]
Description=MySQL Daily Backup Service

[Service]
Type=oneshot
ExecStart=$MYSQL_DIR/mysql_daily_backup.sh
Environment="HOME=$HOME"

[Install]
WantedBy=multi-user.target
EOF

    # 创建 timer 文件
    cat > "$HOME/.config/systemd/user/mysql-daily-backup.timer" << EOF
[Unit]
Description=Run MySQL daily backup at 2 AM

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # 启用并启动定时器
    systemctl --user daemon-reload
    systemctl --user enable --now mysql-daily-backup.timer
    
    # 确保用户服务在未登录时运行
    sudo loginctl enable-linger $USER
    
    echo "每日备份定时器已配置: 每天凌晨 2 点运行"
}

# 启动 MySQL 容器
start_mysql_container() {
    echo "启动 MySQL 容器..."
    cd "$MYSQL_DIR"
    docker compose up -d
    
    # 等待容器启动
    echo "等待 MySQL 启动..."
    sleep 10
    
    # 检查容器状态
    if docker ps | grep -q mysql8; then
        echo "MySQL 容器已成功启动"
    else
        echo "警告: MySQL 容器可能启动失败"
        docker compose logs
    fi
}

# 显示部署摘要
show_summary() {
    echo ""
    echo "==================== 部署完成 ===================="
    echo "MySQL 容器名称: mysql8"
    echo "部署目录: $MYSQL_DIR"
    echo "  数据: $MYSQL_DIR/data"
    echo "  日志: $MYSQL_DIR/logs"
    echo "  配置: $MYSQL_DIR/config"
    echo ""
    echo "备份目录: $BACKUP_DIR"
    echo "  每日备份: $BACKUP_DIR/daily/YYYYMMDD"
    echo "  手工备份: $BACKUP_DIR/manual/YYYYMMDD_HHMMSS"
    echo ""
    echo "管理脚本:"
    echo "  手工备份: $MYSQL_DIR/mysql_manual_backup.sh"
    echo "  数据还原: $MYSQL_DIR/mysql_restore.sh"
    echo ""
    echo "定时备份: systemd 用户定时器 (每天凌晨 2 点)"
    echo "查看定时器状态: systemctl --user list-timers"
    echo ""
    echo "连接信息:"
    echo "  Host: 127.0.0.1"
    echo "  Port: 3306"
    echo "  User: root"
    echo "  Password: $(grep MYSQL_ROOT_PASSWORD "$MYSQL_DIR/.env" | cut -d= -f2)"
    echo ""
    echo "容器管理:"
    echo "  cd $MYSQL_DIR"
    echo "  docker compose logs -f  # 查看日志"
    echo "  docker compose stop    # 停止容器"
    echo "  docker compose start   # 启动容器"
    echo "================================================="
}

# 主执行流程
main() {
    echo "===== MySQL 8.0 容器化部署 ====="
    check_docker_access
    init_directories
    generate_docker_compose
    setup_environment
    generate_backup_scripts
    generate_restore_script
    setup_systemd_timer
    start_mysql_container
    show_summary
}

# 执行主函数
main
```

### 使用说明

#### 1. 保存脚本
```bash showLineNumbers
vim deploy_mysql.sh
# 粘贴上述脚本内容
chmod +x deploy_mysql.sh
```

#### 2. 运行部署
```bash showLineNumbers
./deploy_mysql.sh
```
脚本会提示输入 MySQL root 密码和初始数据库名（可选）

#### 3. 管理命令

| 功能 | 命令 |
|------|------|
| **手工备份** | `$HOME/container/mysql8_0/mysql_manual_backup.sh` |
| **数据还原** | `$HOME/container/mysql8_0/mysql_restore.sh` |
| **查看定时器** | `systemctl --user list-timers` |
| **容器管理** | `cd $HOME/container/mysql8_0 && docker compose ...` |

#### 4. 验证部署

```bash showLineNumbers
# 检查容器状态
docker ps

# 测试数据库连接
docker exec -it mysql8 mysql -uroot -p
# 输入部署时设置的密码

# 检查备份
ls -l $HOME/backup/mysql8_0/manual
```

### 功能说明

1. **自动修复 Docker 权限**：
   - 自动检测 Snap 或标准 Docker 安装
   - 创建 docker 组并添加当前用户
   - 无需手动操作即可修复权限问题

2. **完整目录结构**：
   ```text showLineNumbers
   $HOME/container/mysql8_0/
   ├── config/     # MySQL 配置文件
   ├── data/       # 数据库数据
   ├── logs/       # MySQL 日志
   ├── docker-compose.yml
   ├── .env
   ├── mysql_manual_backup.sh
   ├── mysql_daily_backup.sh
   └── mysql_restore.sh
   ```

3. **备份系统**：
   - **每日备份**：凌晨 2 点自动运行，保留 30 天
     - 路径：`$HOME/backup/mysql8_0/daily/YYYYMMDD`
   - **手工备份**：精确到秒的时间戳
     - 路径：`$HOME/backup/mysql8_0/manual/YYYYMMDD_HHMMSS`
     - 最多保留 30 个手工备份
   - **还原前自动备份**：执行还原时会先创建手工备份

4. **数据还原功能**：
   - 交互式选择备份日期
   - 自动停止容器 → 还原数据 → 还原配置 → 启动容器
   - 支持所有备份类型（每日和手工）

5. **systemd 定时器**：
   - 用户级定时任务，无需 root 权限
   - 自动启用 linger，确保注销后仍能运行
   - 管理命令：`systemctl --user list-timers`

6. **针对 Snap Docker 优化**：
   - 正确处理 `/var/snap/docker/common/run/docker.sock`
   - 自动检测 Snap 安装环境
   - 使用正确的权限设置

### 备份还原流程示例

#### 手工备份
```bash showLineNumbers
$HOME/container/mysql8_0/mysql_manual_backup.sh

# 输出示例：
[2024-07-16 16:30:45] 开始手工备份...
备份保存到: /home/user/backup/mysql8_0/manual/20240716_163045
[2024-07-16 16:30:48] 备份完成!
备份大小: 12M
```

#### 数据还原
```bash showLineNumbers
$HOME/container/mysql8_0/mysql_restore.sh

# 输出示例：
===== 开始还原前备份当前状态 =====
[2024-07-16 16:32:10] 开始手工备份...
...
===== 可用备份列表 =====
【每日备份】
/home/user/backup/mysql8_0/daily/20240715
/home/user/backup/mysql8_0/daily/20240714

【手工备份】
/home/user/backup/mysql8_0/manual/20240716_163045
/home/user/backup/mysql8_0/manual/20240716_163210

输入要恢复的备份完整路径: /home/user/backup/mysql8_0/manual/20240716_163045
...
===== 还原完成! =====
恢复备份: /home/user/backup/mysql8_0/manual/20240716_163045
MySQL 容器已启动
```

![image-20250716121630117](https://images.liuyi.site/image-20250716121630117.png)

![image-20250716123041329](https://images.liuyi.site/image-20250716123041329.png)
