#!/bin/sh
# 把本地数据库备份上传到 115 网盘（CloudFS 挂载）。
#
# 用法:
#   deploy/upload-backup-115.sh                    # 上传最新一份
#   UPLOAD_KEEP=20 deploy/upload-backup-115.sh     # 网盘上保留最近 20 份
#
# 依赖 NAS 上已挂载的 115 网盘（CloudFS）。挂载点不存在时直接跳过并告警，
# 不影响本地的备份流程。
set -eu

APP_DIR="${APP_DIR:-/vol1/1000/docker/mars-printer-hub}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
MOUNT_DIR="${NETDISK_MOUNT_DIR:-/vol1/1000/clouddrive/115-036}"
REMOTE_DIR="${NETDISK_REMOTE_DIR:-$MOUNT_DIR/save/mars-printer-backup}"
DB_NAME="${DB_NAME:-mars_printer_hub}"
UPLOAD_KEEP="${UPLOAD_KEEP:-14}"

if [ ! -d "$MOUNT_DIR" ]; then
  echo "115 网盘未挂载（$MOUNT_DIR 不存在），跳过上传" >&2
  exit 0
fi

mkdir -p "$REMOTE_DIR"

# 上传单个文件到网盘：先写临时名，校验 md5 通过后再改名，避免网盘上出现半截文件
upload_one() {
  src="$1"
  name="$(basename "$src")"
  target="$REMOTE_DIR/$name"

  if [ -f "$target" ]; then
    echo "$name 已存在于网盘，跳过上传"
    return 0
  fi

  tmp="$REMOTE_DIR/.upload-$name.part"
  cp "$src" "$tmp"

  src_sum="$(md5sum "$src" | cut -d' ' -f1)"
  dst_sum="$(md5sum "$tmp" | cut -d' ' -f1)"
  if [ "$src_sum" != "$dst_sum" ]; then
    rm -f "$tmp"
    echo "上传校验失败：$name md5 不一致，已删除临时文件" >&2
    return 1
  fi

  mv "$tmp" "$target"
  echo "$(date -Iseconds) 已上传 $name (md5 $src_sum)"
}

# 数据库逻辑备份
latest="$(ls -1t "$BACKUP_DIR"/"$DB_NAME"-*.sql.gz 2>/dev/null | head -n1 || true)"
if [ -z "$latest" ]; then
  echo "本地没有可上传的数据库备份，跳过" >&2
else
  upload_one "$latest"
fi

# 数据目录冷备
latest_cold="$(ls -1t "$BACKUP_DIR"/mysql-data-*.tar.gz 2>/dev/null | head -n1 || true)"
if [ -n "$latest_cold" ]; then
  upload_one "$latest_cold"
fi

# 清理网盘上超出保留份数的旧备份
ls -1t "$REMOTE_DIR"/"$DB_NAME"-*.sql.gz 2>/dev/null | tail -n +$((UPLOAD_KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "已清理网盘旧备份 $(basename "$old")"
done

# 冷备保留份数少一些，避免网盘被大文件占满
COLD_KEEP="${COLD_KEEP:-2}"
ls -1t "$REMOTE_DIR"/mysql-data-*.tar.gz 2>/dev/null | tail -n +$((COLD_KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "已清理网盘旧冷备 $(basename "$old")"
done
