// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取打印机详细信息 GET /printer/${param0} */
export async function getPrinter(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPrinterParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponsePrinterVO>(`/printer/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新打印机仓温实体 ID PUT /printer/chamber-temp-entity */
export async function updatePrinterChamberTempEntity(
  body: API.PrinterChamberTempEntityUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/chamber-temp-entity", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新打印机自定义摄像头 RTSP 路径 PUT /printer/custom-camera-rtsp-url */
export async function updatePrinterCustomCameraRtspUrl(
  body: API.PrinterCustomCameraRtspUrlUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/custom-camera-rtsp-url", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 分页获取打印机列表 GET /printer/list/page */
export async function listPagePrinters(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listPagePrintersParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePagePrinterVO>("/printer/list/page", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新打印机位置 PUT /printer/location */
export async function updatePrinterLocation(
  body: API.PrinterLocationUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/location", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取打印机概览列表（带实时状态） GET /printer/overview */
export async function getOverview(options?: { [key: string]: any }) {
  return request<API.BaseResponseListPrinterOverviewVO>("/printer/overview", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新打印机功耗实体 ID PUT /printer/power-entity */
export async function updatePrinterPowerEntity(
  body: API.PrinterPowerEntityUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/power-entity", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 刷新打印机 POST /printer/refresh */
export async function refreshPrinters(
  body: API.PrinterRefreshDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 批量更新打印机排序 POST /printer/sort */
export async function updatePrinterSort(
  body: API.PrinterSortUpdateDTO[],
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/sort", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 从拓竹 API 同步所有打印机 POST /printer/sync */
export async function syncPrinters(options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean>("/printer/sync", {
    method: "POST",
    ...(options || {}),
  });
}

/** 解绑打印机 POST /printer/unbind */
export async function unbindPrinters(
  body: API.PrinterUnbindDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/printer/unbind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
