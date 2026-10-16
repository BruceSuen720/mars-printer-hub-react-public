// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 激活 VIP POST /user/activate-vip */
export async function activateVip(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.activateVipParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString>("/user/activate-vip", {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 封禁用户（管理员） PUT /user/admin/ban */
export async function adminBanUser(
  body: API.AdminBanUserDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/admin/ban", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取用户列表（管理员） GET /user/admin/list */
export async function listUsers(options?: { [key: string]: any }) {
  return request<API.BaseResponseListUserListItemVO>("/user/admin/list", {
    method: "GET",
    ...(options || {}),
  });
}

/** 重置用户密码（管理员） PUT /user/admin/reset-password */
export async function adminResetPassword(
  body: API.AdminResetPasswordDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/admin/reset-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 解封用户（管理员） PUT /user/admin/unban */
export async function adminUnbanUser(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.adminUnbanUserParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/admin/unban", {
    method: "PUT",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新当前用户拓竹区域 PUT /user/bambu-region */
export async function updateCurrentUserBambuRegion(
  body: API.UserBambuRegionUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserBambuRegionVO>("/user/bambu-region", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改密码 PUT /user/change-password */
export async function changePassword(
  body: API.UserChangePasswordDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean>("/user/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前登录用户 GET /user/current */
export async function getCurrentUser(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserVO>("/user/current", {
    method: "GET",
    ...(options || {}),
  });
}

/** 用户登录 POST /user/login */
export async function userLogin(
  body: API.UserLoginDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString>("/user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 用户退出 POST /user/logout */
export async function logout(options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean>("/user/logout", {
    method: "POST",
    ...(options || {}),
  });
}

/** 删除当前用户 Passkey DELETE /user/passkey/${param0} */
export async function deletePasskey(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deletePasskeyParams,
  options?: { [key: string]: any }
) {
  const { credentialId: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean>(`/user/passkey/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取当前用户 Passkey 列表 GET /user/passkey/list */
export async function listPasskeys(options?: { [key: string]: any }) {
  return request<API.BaseResponseListUserPasskeyCredentialVO>(
    "/user/passkey/list",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 开始 Passkey 登录 POST /user/passkey/login/options */
export async function startPasskeyLogin(
  body: API.UserPasskeyLoginStartDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePasskeyAssertionStartVO>(
    "/user/passkey/login/options",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 完成 Passkey 登录 POST /user/passkey/login/verify */
export async function finishPasskeyLogin(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.finishPasskeyLoginParams,
  body: API.UserPasskeyLoginFinishDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString>("/user/passkey/login/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    params: {
      ...params,
    },
    data: body,
    ...(options || {}),
  });
}

/** 开始注册 Passkey POST /user/passkey/register/options */
export async function startPasskeyRegistration(
  body: API.UserPasskeyRegisterStartDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePasskeyRegistrationStartVO>(
    "/user/passkey/register/options",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 完成注册 Passkey POST /user/passkey/register/verify */
export async function finishPasskeyRegistration(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.finishPasskeyRegistrationParams,
  body: API.UserPasskeyRegisterFinishDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePasskeyRegisterResultVO>(
    "/user/passkey/register/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        ...params,
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** 用户注册 POST /user/register */
export async function register(
  body: API.UserRegisterDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserVO>("/user/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 初始化管理员账号 POST /user/setup-admin */
export async function setupAdmin(
  body: API.UserRegisterDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString>("/user/setup-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 检查系统是否已初始化 GET /user/system-initialized */
export async function checkSystemInitialized(options?: { [key: string]: any }) {
  return request<API.BaseResponseBoolean>("/user/system-initialized", {
    method: "GET",
    ...(options || {}),
  });
}

/** 更新用户信息 PUT /user/update */
export async function updateUserInfo(
  body: API.UserUpdateDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserVO>("/user/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
