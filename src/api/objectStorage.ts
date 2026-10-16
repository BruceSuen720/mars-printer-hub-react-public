// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 上传文件 上传文件到对象存储，返回文件访问URL POST /storage/upload */
export async function uploadFile(body: {}, options?: { [key: string]: any }) {
  return request<API.BaseResponseString>('/storage/upload', {
    method: 'POST',
    data: body,
    ...(options || {}),
  });
}
