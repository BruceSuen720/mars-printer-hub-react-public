#!/bin/sh
# 把云端耗材配置同步到本地缓存，供断网时 /config/ 回退使用。
#
# 用法:
#   deploy/sync-configs.sh                      # 同步到 ../config-backup
#   CONFIG_DIR=/somewhere deploy/sync-configs.sh # 同步到指定目录
#
# 建议加到 crontab 每 6 小时执行一次:
#   0 */6 * * * /vol1/1000/docker/mars-printer-hub/deploy/sync-configs.sh
set -eu

CONFIG_DIR="${CONFIG_DIR:-$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)/config-backup}"
BASE_URL="${CONFIG_BASE_URL:-https://spool-r2.hcgl.top}"

mkdir -p "$CONFIG_DIR"

for f in color.json filaments.json spoolConfig.json; do
  tmp="$CONFIG_DIR/.$f.tmp"
  if curl -fsSL --connect-timeout 10 --max-time 60 "$BASE_URL/$f" -o "$tmp"; then
    if [ ! -f "$CONFIG_DIR/$f" ] || ! cmp -s "$tmp" "$CONFIG_DIR/$f"; then
      mv "$tmp" "$CONFIG_DIR/$f"
      chmod 644 "$CONFIG_DIR/$f"
      date -Iseconds > "$CONFIG_DIR/$f.updated"
      echo "updated $f"
    else
      rm -f "$tmp"
      echo "unchanged $f"
    fi
  else
    rm -f "$tmp"
    echo "failed $f" >&2
  fi
done
