// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 更新指定渠道配置 PUT /notification/config/${param0} */
export async function updateConfig(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateConfigParams,
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  const { channel: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/notification/config/${param0}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 设置渠道启用状态 PATCH /notification/config/${param0}/status */
export async function setEnabled(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.setEnabledParams,
  options?: { [key: string]: any }
) {
  const { channel: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(
    `/notification/config/${param0}/status`,
    {
      method: "PATCH",
      params: {
        ...queryParams,
      },
      ...(options || {}),
    }
  );
}

/** 测试配置 POST /notification/config/${param0}/test */
export async function testConfig(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.testConfigParams,
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  const { channel: param0, ...queryParams } = params;
  return request<API.BaseResponseNotificationResult>(
    `/notification/config/${param0}/test`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 获取所有通知配置 GET /notification/config/list */
export async function listConfigs(options?: { [key: string]: any }) {
  return request<API.BaseResponseListNotificationConfigDTO>(
    "/notification/config/list",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 更新渠道排序 PUT /notification/config/sort */
export async function updateSort(
  body: string[],
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/notification/config/sort", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取所有通知模板配置 GET /notification/config/templates */
export async function listTemplateConfigs(options?: { [key: string]: any }) {
  return request<API.BaseResponseListConfigItemVO>(
    "/notification/config/templates",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 更新通知模板开关设置 PUT /notification/config/templates */
export async function updateTemplateSettings(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/notification/config/templates", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
