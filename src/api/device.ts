// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取打印机完整信息 一次性获取打印机基本信息、状态信息和AMS信息 GET /device/${param0}/complete */
export async function getCompleteInfo(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCompleteInfoParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseDeviceCompleteVO>(
    `/device/${param0}/complete`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 切换主打印腔灯 通过 MQTT 命令切换设备的主打印腔灯 POST /device/${param0}/light/chamber */
export async function switchChamberLight(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.switchChamberLightParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseString>(`/device/${param0}/light/chamber`, {
    method: "POST",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 切换主打印腔灯2 通过MQTT命令切换设备的主打印腔灯2 POST /device/${param0}/light/chamber2 */
export async function switchChamberLight2(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.switchChamberLight2Params,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseString>(`/device/${param0}/light/chamber2`, {
    method: "POST",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新 AMS 温湿度实体ID PUT /device/ams/entity */
export async function updateAmsEntities(
  body: API.AmsEntityUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/device/ams/entity", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 绑定槽位和耗材 POST /device/bind */
export async function bindSlotSpool(
  body: API.AmsBindRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/device/bind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取所有设备配置 GET /device/device */
export async function listDeviceConfigs(options?: { [key: string]: any }) {
  return request<API.BaseResponseListConfigItemVO>("/device/device", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新设备配置 PUT /device/device */
export async function updateDeviceSettings(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/device/device", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 调试获取 Home Assistant 实体状态 根据实体 ID 调试查询 Home Assistant 状态，用于配置实体 ID 时测试连通性 GET /device/home-assistant/entity */
export async function getHomeAssistantEntityState(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getHomeAssistantEntityStateParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseHomeAssistantEntityStateVO>(
    "/device/home-assistant/entity",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 获取所有打印机 GET /device/list */
export async function listPrinters(options?: { [key: string]: any }) {
  return request<API.BaseResponseListDeviceSimpleVO>("/device/list", {
    method: "GET",
    ...(options || {}),
  });
}

/** 根据打印机获取功率信息 根据打印机 ID 查询已绑定的功耗实体状态 GET /device/power/printer */
export async function getPrinterPower(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPrinterPowerParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseHomeAssistantEntityStateVO>(
    "/device/power/printer",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 获取远程配置 URL 返回 colorUrl, filamentsUrl, spoolUrl GET /device/remote-config */
export async function getRemoteConfigUrls(options?: { [key: string]: any }) {
  return request<API.BaseResponseMapStringString>("/device/remote-config", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新远程配置 URL PUT /device/remote-config */
export async function updateRemoteConfigUrls(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/device/remote-config", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取设备统一流信息 按设备能力返回 HLS 或 MJPEG 播放地址 GET /device/stream */
export async function getStreamInfo(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getStreamInfoParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseDeviceStreamVO>("/device/stream", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取设备流内容 统一流内容入口，当前用于 MJPEG 输出 GET /device/stream/content */
export async function getStreamContent(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getStreamContentParams,
  options?: { [key: string]: any }
) {
  return request<API.StreamingResponseBody>("/device/stream/content", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 断开设备统一流 支持 auto/hls/mjpeg/all，默认 auto POST /device/stream/disconnect/${param0} */
export async function disconnectStream(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.disconnectStreamParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(
    `/device/stream/disconnect/${param0}`,
    {
      method: "POST",
      params: {
        // type has a default value: auto
        type: "auto",
        ...queryParams,
      },
      ...(options || {}),
    }
  );
}
