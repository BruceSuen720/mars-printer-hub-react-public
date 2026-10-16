# 生产镜像
FROM nginx:alpine

# 复制 dist/ 到 nginx html 目录
COPY dist/ /usr/share/nginx/html
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

# nginx.conf 由用户挂载，不COPY
# 容器暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
