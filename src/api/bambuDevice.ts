// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取设备详情 根据设备ID获取特定设备的详细信息 GET /bambu/devices/${param0} */
export async function getDevice(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getDeviceParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseBambuDeviceDTO>(`/bambu/devices/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取设备访问码 根据设备ID获取设备的访问码，用于本地MQTT连接 GET /bambu/devices/${param0}/access-code */
export async function getDeviceAccessCode(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getDeviceAccessCodeParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseMapStringString>(
    `/bambu/devices/${param0}/access-code`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取AMS状态 获取指定设备的AMS状态信息 GET /bambu/devices/${param0}/ams/status */
export async function getAmsStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAmsStatusParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseAmsStatus>(
    `/bambu/devices/${param0}/ams/status`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 清除设备缓存 清除指定设备的缓存数据 DELETE /bambu/devices/${param0}/cache */
export async function clearDeviceCache(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.clearDeviceCacheParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseString>(`/bambu/devices/${param0}/cache`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 检查设备在线状态 检查指定设备是否在线 GET /bambu/devices/${param0}/online */
export async function isDeviceOnline(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.isDeviceOnlineParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseMapStringObject>(
    `/bambu/devices/${param0}/online`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取打印进度 获取指定设备的打印进度信息 GET /bambu/devices/${param0}/print/progress */
export async function getPrintProgress(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPrintProgressParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseMapStringObject>(
    `/bambu/devices/${param0}/print/progress`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取打印状态详情 获取指定设备的详细打印状态 GET /bambu/devices/${param0}/print/status */
export async function getPrintStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPrintStatusParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseMapStringObject>(
    `/bambu/devices/${param0}/print/status`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取设备当前状态 获取指定设备的当前状态信息 GET /bambu/devices/${param0}/status */
export async function getDeviceStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getDeviceStatusParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseDeviceStatusCache>(
    `/bambu/devices/${param0}/status`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取设备最新状态 获取指定设备的最新状态信息 GET /bambu/devices/${param0}/status/latest */
export async function getLatestDeviceStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getLatestDeviceStatusParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseDeviceStatusCache>(
    `/bambu/devices/${param0}/status/latest`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取设备列表 获取当前用户的所有拓竹打印机设备 GET /bambu/devices/list */
export async function getDevices(options?: { [key: string]: any }) {
  return request<API.BaseResponseListBambuDeviceDTO>("/bambu/devices/list", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取在线设备 获取当前在线的拓竹打印机设备 GET /bambu/devices/online */
export async function getOnlineDevices(options?: { [key: string]: any }) {
  return request<API.BaseResponseListBambuDeviceDTO>("/bambu/devices/online", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取打印中设备 获取正在打印的拓竹打印机设备 GET /bambu/devices/printing */
export async function getPrintingDevices(options?: { [key: string]: any }) {
  return request<API.BaseResponseListBambuDeviceDTO>(
    "/bambu/devices/printing",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}
