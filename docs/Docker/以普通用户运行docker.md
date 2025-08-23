# 以普通用户运行docker 
OS：Ubuntu24.04
docker：
```bash showLineNumbers
snap list | grep docker
docker             28.1.1+1         3265   latest/stable  canonical**  -
```

# 操作
## 1、检查是否有docker组
```bash showLineNumbers
grep docker /etc/group
```
如果查询没有该组，则需要手工增加docker组
```
sudo groupadd docker
```

## 2、检查docker.sock
```bash showLineNumbers
ls -l /var/run/docker.sock
srw-rw---- 1 root root 0  7月  1 00:35 /var/run/docker.sock
```
如果结果显示属组是root，则执行以下命令
```bash showLineNumbers
sudo chown root:docker /var/run/docker.sock
sudo chmod 660 /var/run/docker.sock
```

## 3、给当前用户增加docker属组
```bash showLineNumbers
sudo usermod -aG docker $USER
```

> 执行完后打开新的终端使修改生效

## 4、检查是否生效
执行`docker ps`看是否可以执行
