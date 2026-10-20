# 部署（飞牛 NAS / Docker Compose）

本目录是 Mars Printer Hub 在 NAS 上的一套完整编排，包含后端、前端、MySQL、Redis，
以及耗材配置的本地缓存与同步脚本。

## 目录内容

| 文件 | 说明 |
|---|---|
| `docker-compose.yml` | 四个服务的编排：mysql / redis / backend / frontend |
| `nginx.conf` | 前端 nginx 配置，静态资源 + `/api` 反代 + 配置回退 |
| `sync-configs.sh` | 把云端耗材配置同步到本地 `../config-backup`，供断网回退 |
| `backup-mysql.sh` | 备份 `mars_printer_hub` 数据库，gzip 压缩并按份数/天数清理 |
| `.env.example` | 环境变量模板，复制为 `.env` 后填写 |

## 快速开始

```bash
cd deploy
cp .env.example .env
# 生成一个强随机的 MySQL root 密码填进去
openssl rand -hex 24

# 首次部署前，先拉好前后端源码并构建后端 jar
cd ../backend && ./mvnw -DskipTests package
cd ../frontend && npm ci && npm run build

cd ../deploy
docker compose up -d --build
```

## 端口

| 服务 | 容器内 | 宿主机默认 | 用途 |
|---|---|---|---|
| frontend | 80 | 18124 | Web 界面 |
| backend | 8123 | 18123 | REST API / SSE |

## nginx 配置要点

`nginx.conf` 里有几个 nginx 变量（`$host`、`$remote_addr`、`$proxy_add_x_forwarded_for`、
`$uri`）。**写这个文件时不要让 shell 展开它们**——用 `cat > nginx.conf <<'EOF'`（引号
包裹的 heredoc）或直接 `git pull` 部署。用普通的 `echo` / 双引号 heredoc 会把变量替换成空
字符串，导致：

```text
nginx: [emerg] invalid number of arguments in "proxy_set_header" directive
```

nginx 启动即失败，`restart: unless-stopped` 会把它无限拉起，表现为容器一直"正在重启"。

## 耗材配置缓存

前端默认从云端 `https://spool-r2.hcgl.top` 拉取耗材品牌、颜色等配置。为保证断网时仍可用，
nginx 会把 `/config-remote/*` 的请求在出错时回退到本地 `/config/*`：

```text
/config-remote/color.json        ->  云端
/config/color.json                ->  本地缓存（config-backup 目录）
```

用 `sync-configs.sh` 定期把云端内容落到 `../config-backup`：

```bash
deploy/sync-configs.sh
```

脚本只在内容变化时才更新文件，并写入 `<name>.updated` 记录同步时间。

## 数据库备份

`backup-mysql.sh` 用 `mysqldump --single-transaction` 导出 `mars_printer_hub` 并 gzip 压缩：

```bash
deploy/backup-mysql.sh
```

- 密码从容器环境变量读取，不写进脚本
- 写临时文件，gzip 校验通过且内容非空后才改名为正式备份
- 默认保留最近 14 份，另按 `MAX_AGE_DAYS`（默认 30 天）兜底清理
- 备份权限 `600`，默认输出到 `../backups/`

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `BACKUP_DIR` | `../backups` | 备份输出目录 |
| `KEEP` | `14` | 保留份数 |
| `MAX_AGE_DAYS` | `30` | 最长保留天数 |
| `DB_NAME` | `mars_printer_hub` | 库名 |
| `MYSQL_CONTAINER` | `mars-printer-mysql` | 容器名 |

## crontab 示例

```cron
# 耗材配置同步：云端 -> 本地缓存（断网时 /config/ 回退）
17 * * * * /vol1/1000/docker/mars-printer-hub/deploy/sync-configs.sh >> /vol1/1000/docker/mars-printer-hub/config-backup/sync.log 2>&1
# 数据库备份：每天 03:30，保留最近 14 份
30 3 * * * /vol1/1000/docker/mars-printer-hub/deploy/backup-mysql.sh >> /vol1/1000/docker/mars-printer-hub/backups/backup.log 2>&1
```

## 打印机接入

| 变量 | 默认 | 说明 |
|---|---|---|
| `BAMBU_INTRANET` | `true` | 局域网直连 MQTT，走 `macvlan` 独立 IP |
| `BAMBU_CLOUD_ENABLED` | `false` | Bambu 云端，需要公网可达 |
| `BAMBU_MQTT_INIT_ALL` | `false` | 启动时拉取全部打印机的 MQTT 凭据 |

局域网模式与云端模式互斥：开了 `BAMBU_INTRANET` 后，远程无法发起打印，只能在同网段
内用 Bambu Handy 直连。

## 数据目录

```
../mysql/           MySQL 数据（不要删）
../redis/           Redis AOF（不要删）
../config-backup/   耗材配置本地缓存
../backups/         数据库备份（mysql 目录的兜底）
```

首次部署后立即备份 `../mysql`，它包含账号、打印机、耗材等全部业务数据。
