// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取开放接口设备信息 GET /open/device/${param0} */
export async function getDeviceInfo(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getDeviceInfoParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseOpenDeviceInfoVO>(`/open/device/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 开放接口健康检查 GET /open/ping */
export async function ping(options?: { [key: string]: any }) {
  return request<API.BaseResponseString>("/open/ping", {
    method: "GET",
    ...(options || {}),
  });
}

/** 获取当前 Open API 调用身份 GET /open/whoami */
export async function whoami(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringObject>("/open/whoami", {
    method: "GET",
    ...(options || {}),
  });
}
