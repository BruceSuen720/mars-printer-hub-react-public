// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取当前用户配置 GET /user/config/current */
export async function getCurrentUserConfig(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserConfigDTO>("/user/config/current", {
    method: "GET",
    ...(options || {}),
  });
}

/** 保存当前用户配置 PUT /user/config/current */
export async function saveCurrentUserConfig(
  body: API.UserConfigDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/config/current", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
