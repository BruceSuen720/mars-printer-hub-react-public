// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 健康检查 GET /health/check */
export async function check(options?: { [key: string]: any }) {
  return request<string>("/health/check", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取日志文件列表 GET /health/logs */
export async function listLogFiles(options?: { [key: string]: any }) {
  return request<API.BaseResponseListMapStringObject>("/health/logs", {
    method: "GET",
    ...(options || {}),
  });
}

/** 读取日志文件内容 GET /health/logs/content */
export async function readLogContent(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.readLogContentParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseMapStringObject>("/health/logs/content", {
    method: "GET",
    params: {
      // lines has a default value: 500
      lines: "500",

      ...params,
    },
    ...(options || {}),
  });
}

/** 获取版本信息 GET /health/version */
export async function version(options?: { [key: string]: any }) {
  return request<string>("/health/version", {
    method: "GET",
    ...(options || {}),
  });
}
