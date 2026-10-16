// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 提交激活码 POST /license/activate */
export async function activate(
  body: API.LicenseActivateReq,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseVoid>("/license/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前机器码 GET /license/machine-code */
export async function getMachineCode(options?: { [key: string]: any }) {
  return request<API.BaseResponseString>("/license/machine-code", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取激活状态 GET /license/status */
export async function getStatus(options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean>("/license/status", {
    method: "GET",
    ...(options || {}),
  });
}
