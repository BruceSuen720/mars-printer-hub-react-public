// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取任务列表 获取当前用户的拓竹云任务列表 GET /bambu/tasks */
export async function getTaskList(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getTaskListParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBambuTaskListResponseDTO>("/bambu/tasks", {
    method: "GET",
    params: {
      // limit has a default value: 20
      limit: "20",

      ...params,
    },
    ...(options || {}),
  });
}

/** 手动处理任务 手动记录指定设备的打印任务 POST /bambu/tasks/handle/${param0} */
export async function handleTask(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.handleTaskParams,
  body: API.BambuTaskDTO,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/bambu/tasks/handle/${param0}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 获取设备最新任务 获取指定设备的最新打印任务 GET /bambu/tasks/latest/${param0} */
export async function getLatest(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getLatestParams,
  options?: { [key: string]: any }
) {
  const { deviceId: param0, ...queryParams } = params;
  return request<API.BaseResponseBambuTaskDTO>(
    `/bambu/tasks/latest/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}
