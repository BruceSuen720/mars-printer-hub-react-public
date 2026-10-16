// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取订单 GET /order/${param0} */
export async function getOrder(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getOrderParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseOrderVO>(`/order/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取订单打印时长 GET /order/${param0}/print-duration */
export async function getOrderPrintDuration(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getOrderPrintDurationParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseDouble>(`/order/${param0}/print-duration`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新订单状态 POST /order/${param0}/status */
export async function updateStatus(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateStatusParams,
  body: API.OrderStatusUpdateDTO,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseOrderVO>(`/order/${param0}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 创建订单 POST /order/add */
export async function addOrder(
  body: API.OrderCreateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 订单绑定打印记录 POST /order/bind */
export async function bindRecords(
  body: API.OrderBindRecordsDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/order/bind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除订单 DELETE /order/delete/${param0} */
export async function deleteOrder(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteOrderParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/order/delete/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 删除草稿 DELETE /order/draft/${param0} */
export async function deleteDraft(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteDraftParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/order/draft/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 新增 / 保存草稿 POST /order/draft/add */
export async function addDraft(
  body: API.OrderQuoteDraftDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/order/draft/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取草稿列表 GET /order/draft/list */
export async function listDraft(options?: { [key: string]: any }) {
  return request<API.BaseResponseListOrderQuoteDraftDTO>("/order/draft/list", {
    method: "GET",
    ...(options || {}),
  });
}

/** 分页获取订单列表 GET /order/list/page */
export async function listOrders(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listOrdersParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseIPageOrderVO>("/order/list/page", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取所有订单列表（进行中） GET /order/list/processing */
export async function getAllProcessingOrders(options?: { [key: string]: any }) {
  return request<API.BaseResponseListOrderVO>("/order/list/processing", {
    method: "GET",
    ...(options || {}),
  });
}

/** 查询物流信息 GET /order/logistics */
export async function queryLogistics(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.queryLogisticsParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseAliyunMarketExpressQueryResponseDTO>(
    "/order/logistics",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 获取订单汇总信息 GET /order/summary */
export async function getOrderSummary(options?: { [key: string]: any }) {
  return request<API.BaseResponseOrderSummaryDTO>("/order/summary", {
    method: "GET",
    ...(options || {}),
  });
}

/** 订单解绑打印记录 POST /order/unbind */
export async function unbindRecord(
  body: API.OrderUnbindRecordDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/order/unbind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新订单 PUT /order/update */
export async function updateOrder(
  body: API.OrderUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新订单图片和模型资源 PUT /order/update/assets */
export async function updateOrderAssets(
  body: API.OrderAssetsUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/update/assets", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新订单其他成本 PUT /order/update/other-cost */
export async function updateOrderOtherCost(
  body: API.OrderOtherCostUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/update/other-cost", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 调整订单数量 PUT /order/update/quantity */
export async function adjustQuantity(
  body: API.OrderQuantityAdjustDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/update/quantity", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新订单物流单号 PUT /order/update/tracking-number */
export async function updateTrackingNumber(
  body: API.OrderTrackingNumberUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseOrderVO>("/order/update/tracking-number", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
