#!/bin/sh
# 备份 mars_printer_hub 数据库。
#
# 用法:
#   deploy/backup-mysql.sh                # 备份并保留最近 14 份
#   KEEP=30 deploy/backup-mysql.sh        # 保留最近 30 份
#   BACKUP_DIR=/path deploy/backup-mysql.sh
#
# 建议加到 crontab 每天执行一次:
#   30 3 * * * /vol1/1000/docker/mars-printer-hub/deploy/backup-mysql.sh
set -eu

APP_DIR="${APP_DIR:-/vol1/1000/docker/mars-printer-hub}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-mars-printer-mysql}"
DB_NAME="${DB_NAME:-mars_printer_hub}"
KEEP="${KEEP:-14}"

mkdir -p "$BACKUP_DIR"

# 密码从容器环境变量读取，不在脚本或磁盘上留明文
pw="$(docker inspect "$MYSQL_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed -n 's/^MYSQL_ROOT_PASSWORD=//p' | head -n1)"
if [ -z "$pw" ]; then
  echo "无法从 $MYSQL_CONTAINER 读取 MYSQL_ROOT_PASSWORD" >&2
  exit 1
fi

ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/$DB_NAME-$ts.sql.gz"
tmp="$out.tmp"

# --single-transaction 保证 InnoDB 一致性快照且不锁表
docker exec "$MYSQL_CONTAINER" mysqldump -uroot -p"$pw" \
  --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 "$DB_NAME" 2>/dev/null | gzip -9 > "$tmp"

# 校验：gzip 结构完整且内容非空，避免留下坏备份
if ! gzip -t "$tmp" 2>/dev/null; then
  rm -f "$tmp"
  echo "备份校验失败：gzip 结构损坏" >&2
  exit 1
fi
sz="$(wc -c < "$tmp")"
if [ "$sz" -lt 200 ]; then
  rm -f "$tmp"
  echo "备份异常：文件仅 $sz 字节" >&2
  exit 1
fi

mv "$tmp" "$out"
chmod 600 "$out"
echo "$(date -Iseconds) 备份完成 $out ($sz 字节)"

# 清理超出保留份数的旧备份；同时按天数兜底，避免长期堆积
max_age_days="${MAX_AGE_DAYS:-30}"
ls -1t "$BACKUP_DIR"/"$DB_NAME"-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "已清理旧备份 $(basename "$old")"
done

find "$BACKUP_DIR" -name "$DB_NAME-*.sql.gz" -type f -mtime "+$max_age_days" -print 2>/dev/null | while read -r old; do
  rm -f "$old"
  echo "已清理过期备份 $(basename "$old")"
done
