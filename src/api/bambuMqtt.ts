// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 连接指定设备 使用云服务信息连接指定的打印机设备 POST /bambu/mqtt/connect/${param0} */
export async function connect(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.bambuMqttConnectParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseString>(`/bambu/mqtt/connect/${param0}`, {
    method: "POST",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 强制刷新 发送refresh命令强制刷新设备状态 POST /bambu/mqtt/refresh/${param0} */
export async function refresh(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.refreshParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseString>(`/bambu/mqtt/refresh/${param0}`, {
    method: "POST",
    params: { ...queryParams },
    ...(options || {}),
  });
}
