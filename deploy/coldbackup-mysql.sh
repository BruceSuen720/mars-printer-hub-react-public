#!/bin/sh
# mysql 数据目录的文件级冷备（tar.gz），作为 mysqldump 之外的第二道保险。
#
# 用法:
#   deploy/coldbackup-mysql.sh
#
# 建议加到 crontab 每周执行一次:
#   0 4 * * 0 /vol1/1000/docker/mars-printer-hub/deploy/coldbackup-mysql.sh
set -eu

APP_DIR="${APP_DIR:-/vol1/1000/docker/mars-printer-hub}"
DATA_DIR="${DATA_DIR:-$APP_DIR/mysql}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-mars-printer-mysql}"
KEEP="${KEEP:-4}"

if [ ! -d "$DATA_DIR" ]; then
  echo "数据目录不存在：$DATA_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/mysql-data-$ts.tar.gz"
tmp="$out.tmp"

# 停库再做文件级备份，保证 InnoDB 数据文件一致。
# mysqldump 备份是主力，这个是补充，短暂停机可以接受。
echo "停止 $MYSQL_CONTAINER 以获得一致的冷备..."
docker stop "$MYSQL_CONTAINER" >/dev/null

restore_container() {
  echo "启动 $MYSQL_CONTAINER ..."
  docker start "$MYSQL_CONTAINER" >/dev/null
}

# 无论成功失败都要把容器拉起来
trap restore_container EXIT INT TERM

tar -czf "$tmp" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
restore_container
trap - EXIT INT TERM

if ! gzip -t "$tmp" 2>/dev/null; then
  rm -f "$tmp"
  echo "冷备校验失败：gzip 结构损坏" >&2
  exit 1
fi
sz="$(wc -c < "$tmp")"
if [ "$sz" -lt 100 ]; then
  rm -f "$tmp"
  echo "冷备异常：文件仅 $sz 字节" >&2
  exit 1
fi

mv "$tmp" "$out"
chmod 600 "$out"
echo "$(date -Iseconds) 冷备完成 $out ($sz 字节)"

# 只保留最近 KEEP 份
ls -1t "$BACKUP_DIR"/mysql-data-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "已清理旧冷备 $(basename "$old")"
done
