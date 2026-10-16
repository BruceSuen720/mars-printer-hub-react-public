// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取登录状态 获取当前用户的登录状态 GET /bambu/auth/status */
export async function getAuthStatus(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringObject>("/bambu/auth/status", {
    method: "GET",
    ...(options || {}),
  });
}

/** 拓竹云登录 POST /bambu/login */
export async function bambuCloudLogin(
  body: API.BambuLoginDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseMapStringObject>("/bambu/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 拓竹云验证码登录 使用验证码完成拓竹云登录 POST /bambu/login-with-code */
export async function loginWithCode(
  body: API.BambuLoginWithCodeDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseMapStringObject>("/bambu/login-with-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 发送验证码 向指定账号发送验证码 POST /bambu/send-sms-code */
export async function sendSmsCode(
  body: API.BambuSmsSendDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseMapStringObject>("/bambu/send-sms-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户ID 获取当前用户ID GET /bambu/uid */
export async function getUid(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringObject>("/bambu/uid", {
    method: "GET",
    ...(options || {}),
  });
}

/** 解绑拓竹云账户 解绑当前用户绑定的拓竹云账户 POST /bambu/unbind */
export async function unbind(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringObject>("/bambu/unbind", {
    method: "POST",
    ...(options || {}),
  });
}
