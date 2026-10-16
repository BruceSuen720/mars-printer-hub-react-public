// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取耗材使用记录详情 GET /record/${param0} */
export async function getSpoolUsedRecord(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSpoolUsedRecordParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseSpoolUsedRecordVO>(`/record/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 耗材使用记录删除 DELETE /record/delete/${param0} */
export async function deleteSpoolUsedRecord(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteSpoolUsedRecordParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/record/delete/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 根据订单 ID获取耗材使用记录 GET /record/list/by-order/${param0} */
export async function listSpoolUsedRecordByOrderId(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listSpoolUsedRecordByOrderIdParams,
  options?: { [key: string]: any }
) {
  const { orderId: param0, ...queryParams } = params;
  return request<API.BaseResponseListSpoolUsedRecordVO>(
    `/record/list/by-order/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 获取耗材使用记录 GET /record/list/by-spool/${param0} */
export async function listSpoolUsedRecordBySpoolId(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listSpoolUsedRecordBySpoolIdParams,
  options?: { [key: string]: any }
) {
  const { spoolId: param0, ...queryParams } = params;
  return request<API.BaseResponseListSpoolUsedRecordVO>(
    `/record/list/by-spool/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 分页获取耗材使用记录 GET /record/list/page */
export async function listSpoolUsedRecordPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listSpoolUsedRecordPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseIPageSpoolUsedRecordVO>("/record/list/page", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取耗材使用记录快照列表 GET /record/list/snapshot/${param0} */
export async function listSpoolUsedSnapshot(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listSpoolUsedSnapshotParams,
  options?: { [key: string]: any }
) {
  const { recordId: param0, ...queryParams } = params;
  return request<API.BaseResponseListSpoolUsedSnapshots>(
    `/record/list/snapshot/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 耗材使用记录转移 PUT /record/transfer/${param0}/${param1} */
export async function transferSpoolUsedRecord(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.transferSpoolUsedRecordParams,
  options?: { [key: string]: any }
) {
  const { id: param0, newSpoolId: param1, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(
    `/record/transfer/${param0}/${param1}`,
    {
      method: "PUT",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}
