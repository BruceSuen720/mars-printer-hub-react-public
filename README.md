# Mars Printer Hub Web

Mars Printer Hub 的 React 前端，用于管理 3D 打印机、AMS 槽位、耗材、打印记录和订单。

## 本地开发

要求 Node.js 20+，并在 `http://localhost:8123` 启动后端服务。

```bash
npm install
npm run dev
```

开发服务器默认监听 `5173` 端口，并将 `/api` 代理到 `http://localhost:8123`。

## 常用命令

```bash
npm run dev       # 启动开发服务器
npm run lint      # 运行 ESLint
npm run build     # TypeScript 检查并生成生产产物
npm run preview   # 本地预览生产产物
npm run openapi   # 从本地后端重新生成 API 客户端
```

提交前至少运行：

```bash
npm run lint
npm run build
```

## 配置

构建时 API 地址可通过 `VITE_API_BASE_URL` 配置；未设置时使用同源请求。

Docker 容器启动时会将 `ENABLE_*` 环境变量写入 `/config.js`。当前功能开关包括：

- `ENABLE_DEVICE_OVERVIEW`
- `ENABLE_USER_MANAGE`
- `ENABLE_DEPRECIATION`
- `ENABLE_CUSTOM_BACKGROUND`
- `ENABLE_HOME_ASSISTANT`
- `ENABLE_PASSKEY_LOGIN`
- `ENABLE_ORDER_QUANTITY_ADJUST`

示例：

```bash
docker run -e ENABLE_DEVICE_OVERVIEW=true -p 8080:80 <image>
```

生产环境需要提供 Nginx 配置，将前端路由回退到 `index.html`，并将 `/api` 转发到后端。

## API 客户端

`src/api/` 由 `@umijs/openapi` 生成，不应手动修改；`src/api/objectStorage.ts` 是生成过程保留的例外。重新生成前应确保后端 OpenAPI 地址可访问：

```text
http://localhost:8123/api/v3/api-docs/default
```

生成后的兼容修补由 `openapi.config.js` 自动完成。

## 主要目录

```text
src/api/         OpenAPI 客户端
src/components/  业务组件与 shadcn UI
src/hooks/       共享 Hook
src/layouts/     应用布局与鉴权入口
src/router/      路由配置
src/stores/      Zustand 状态
src/views/       业务页面
```

更多界面约定见 `DESIGN.md`，协作和代码约定见 `AGENTS.md`。
