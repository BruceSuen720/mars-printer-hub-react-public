// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取当前用户 API Key GET /user/api-key/current */
export async function getCurrentUserApiKey(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserApiKeyVO>("/user/api-key/current", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新当前用户 API Key PUT /user/api-key/current */
export async function updateCurrentUserApiKey(
  body: API.UserApiKeyUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/api-key/current", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 创建当前用户 API Key POST /user/api-key/current */
export async function createCurrentUserApiKey(
  body: API.UserApiKeyCreateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserApiKeyCreateVO>("/user/api-key/current", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 禁用当前用户 API Key PUT /user/api-key/current/disable */
export async function disableCurrentUserApiKey(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseBoolean>("/user/api-key/current/disable", {
    method: "PUT",
    ...(options || {}),
  });
}

/** 启用当前用户 API Key PUT /user/api-key/current/enable */
export async function enableCurrentUserApiKey(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseBoolean>("/user/api-key/current/enable", {
    method: "PUT",
    ...(options || {}),
  });
}

/** 重置当前用户 API Key PUT /user/api-key/current/reset */
export async function resetCurrentUserApiKey(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserApiKeyCreateVO>(
    "/user/api-key/current/reset",
    {
      method: "PUT",
      ...(options || {}),
    }
  );
}
