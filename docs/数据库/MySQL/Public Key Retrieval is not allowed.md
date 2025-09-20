远程连接Mysql时报错`Public Key Retrieval is not allowed`（不允许公钥检索）

解决方法：
在连接字符串中添加参数：
`jdbc:mysql://localhost:3306/mydb?allowPublicKeyRetrieval=true&useSSL=false`