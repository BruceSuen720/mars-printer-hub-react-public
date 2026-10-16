// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取阿里云市场 AppCode 配置状态 GET /sys/config/aliyun-market-app-code */
export async function getAliyunMarketAppCodeInfo(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseAliyunMarketAppCodeVO>(
    "/sys/config/aliyun-market-app-code",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 保存阿里云市场 AppCode PUT /sys/config/aliyun-market-app-code */
export async function saveAliyunMarketAppCode(
  body: API.AliyunMarketAppCodeSaveDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>(
    "/sys/config/aliyun-market-app-code",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 获取 Home Assistant 配置状态 GET /sys/config/home-assistant */
export async function getHomeAssistantConfigInfo(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseHomeAssistantConfigVO>(
    "/sys/config/home-assistant",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 保存 Home Assistant 配置 PUT /sys/config/home-assistant */
export async function saveHomeAssistantConfig(
  body: API.HomeAssistantConfigSaveDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/sys/config/home-assistant", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取开放自由注册配置 GET /sys/config/open-registration */
export async function getOpenRegistrationConfigInfo(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseOpenRegistrationConfigVO>(
    "/sys/config/open-registration",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 保存开放自由注册配置 PUT /sys/config/open-registration */
export async function saveOpenRegistrationConfig(
  body: API.OpenRegistrationConfigSaveDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/sys/config/open-registration", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取 Passkey 配置 GET /sys/config/passkey */
export async function getPasskeyConfigInfo(options?: { [key: string]: any }) {
  return request<API.BaseResponsePasskeyConfigVO>("/sys/config/passkey", {
    method: "GET",
    ...(options || {}),
  });
}

/** 保存 Passkey 配置 PUT /sys/config/passkey */
export async function savePasskeyConfig(
  body: API.PasskeyConfigSaveDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/sys/config/passkey", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取公网访问 URL GET /sys/config/public-access-url */
export async function getPublicAccessUrlInfo(options?: { [key: string]: any }) {
  return request<API.BaseResponsePublicAccessUrlVO>(
    "/sys/config/public-access-url",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 保存公网访问 URL PUT /sys/config/public-access-url */
export async function savePublicAccessUrl(
  body: API.PublicAccessUrlSaveDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/sys/config/public-access-url", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
