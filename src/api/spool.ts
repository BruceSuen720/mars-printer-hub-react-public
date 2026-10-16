// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取耗材 GET /spool/${param0} */
export async function getSpool(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSpoolParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseSpoolVO>(`/spool/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 创建耗材 POST /spool/add */
export async function addSpool(
  body: API.SpoolCreateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSpoolVO>("/spool/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 校准耗材 POST /spool/calibrate */
export async function calibrateSpool(
  body: API.SpoolCheckDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSpoolVO>("/spool/calibrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 读取校准重量 读取系统配置中的 Home Assistant 电子秤实体当前状态，用于耗材校准 GET /spool/calibrate/weight */
export async function getCalibrateWeight(options?: { [key: string]: any }) {
  return request<API.BaseResponseHomeAssistantEntityStateVO>(
    "/spool/calibrate/weight",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 删除耗材 DELETE /spool/delete/${param0} */
export async function deleteSpool(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteSpoolParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/spool/delete/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取所有耗材列表 GET /spool/list/all */
export async function getAllSpools(options?: { [key: string]: any }) {
  return request<API.BaseResponseListSpoolVO>("/spool/list/all", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取所有耗材列表（可用的） GET /spool/list/available */
export async function getAllAvailableSpools(options?: { [key: string]: any }) {
  return request<API.BaseResponseListSpoolVO>("/spool/list/available", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取所有耗材列表（可用的，包含指定耗材） GET /spool/list/available/with-id */
export async function getAllAvailableSpoolsWithId(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAllAvailableSpoolsWithIdParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseListSpoolVO>("/spool/list/available/with-id", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取所有耗材列表（已绑定） GET /spool/list/bound */
export async function listSpoolsBound(options?: { [key: string]: any }) {
  return request<API.BaseResponseListSpoolVO>("/spool/list/bound", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取最近新增的5条耗材 GET /spool/list/latest5 */
export async function listLatest5Spools(options?: { [key: string]: any }) {
  return request<API.BaseResponseListSpoolVO>("/spool/list/latest5", {
    method: "GET",
    ...(options || {}),
  });
}

/** 分页获取耗材列表 GET /spool/list/page */
export async function listSpools(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listSpoolsParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseIPageSpoolVO>("/spool/list/page", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取搜索栏下拉选项 GET /spool/options */
export async function getOptions(options?: { [key: string]: any }) {
  return request<API.BaseResponseSpoolQueryOptionsVO>("/spool/options", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取耗材汇总信息 GET /spool/summary */
export async function getSpoolSummary(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSpoolSummaryParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSpoolSummaryVO>("/spool/summary", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新耗材 PUT /spool/update */
export async function updateSpool(
  body: API.SpoolUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSpoolVO>("/spool/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 使用耗材 POST /spool/use */
export async function useSpool(
  body: API.SpoolUseDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSpoolVO>("/spool/use", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
