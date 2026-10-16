// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 获取首页汇总信息 GET /home/summary */
export async function getHomeSummary(options?: { [key: string]: any }) {
  return request<API.BaseResponseHomeVO>("/home/summary", {
    method: "GET",
    ...(options || {}),
  });
}
