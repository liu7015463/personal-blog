
```sql
-- 1. 创建数据库
DROP DATABASE IF EXISTS tank_cloud;
CREATE DATABASE IF NOT EXISTS tank_cloud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 创建用户
CREATE USER 'tank_db'@'%' IDENTIFIED BY '123456&Qw';

-- 3. 授予用户对 tank_cloud 数据库的全部权限
GRANT ALL PRIVILEGES ON tank_cloud.* TO 'tank_db'@'%';

-- 4. 刷新权限使设置生效
FLUSH PRIVILEGES;
```