declare namespace API {
  type activateVipParams = {
    code: string;
  };

  type AdminBanUserDTO = {
    userId: number;
    reason?: string;
  };

  type AdminResetPasswordDTO = {
    userId: number;
    newPassword: string;
    confirmPassword: string;
  };

  type adminUnbanUserParams = {
    userId: number;
  };

  type Airduct = {
    parts?: AirductPart[];
    state?: number;
  };

  type AirductPart = {
    id?: number;
    state?: number;
  };

  type AliyunMarketAppCodeSaveDTO = {
    appCode?: string;
  };

  type AliyunMarketAppCodeVO = {
    appCode?: string;
  };

  type AliyunMarketExpressQueryResponseDTO = {
    msg?: string;
    success?: boolean;
    code?: number;
    data?: DataBody;
  };

  type AmsBindRequest = {
    amsId: number;
    slotNo: number;
    spoolId: number;
    syncUpdateDevice?: boolean;
    trayInfoIdx?: string;
  };

  type AmsDetailMappingDTO = {
    ams?: number;
    sourceColor?: string;
    targetColor?: string;
    filamentId?: string;
    filamentType?: string;
    targetFilamentType?: string;
    weight?: number;
  };

  type AmsEntityUpdateDTO = {
    amsId: number;
    temperatureEntityId?: string;
    humidityEntityId?: string;
  };

  type AmsInstance = {
    id?: string;
    humidity?: string;
    humidity_raw?: number;
    temp?: string;
    tray?: AmsTray[];
    dry_setting?: DrySetting;
    dry_time?: number;
    info?: Record<string, any>;
  };

  type AmsSlotsVO = {
    id?: number;
    amsId?: number;
    trayInfoIdx?: string;
    slotNo?: number;
    trayType?: string;
    trayColor?: string;
    spoolId?: number;
    spool?: SpoolVO;
  };

  type AmsStatus = {
    ams?: AmsInstance[];
    tray_now?: number;
    tray_tar?: string;
    power_on_flag?: boolean;
  };

  type AmsTray = {
    emptyTray?: boolean;
    id?: string;
    remain?: number;
    tray_info_idx?: string;
    tray_type?: string;
    tray_color?: string;
    nozzle_temp_max?: string;
    nozzle_temp_min?: string;
    state?: number;
  };

  type AmsVO = {
    id?: number;
    amsNo?: number;
    amsName?: string;
    trayNow?: number;
    slots?: AmsSlotsVO[];
    humidity?: string;
    humidityEntityId?: string;
    temperature?: string;
    temperatureEntityId?: string;
    drySetting?: DrySetting;
    dryTime?: number;
  };

  type BambuDeviceDTO = {
    name?: string;
    online?: boolean;
    dev_id?: string;
    print_status?: string;
    dev_model_name?: string;
    dev_product_name?: string;
    dev_access_code?: string;
    nozzle_diameter?: number;
    dev_structure?: string;
  };

  type BambuLoginDTO = {
    email: string;
    password: string;
  };

  type BambuLoginWithCodeDTO = {
    account: string;
    code: string;
  };

  type BambuMqttMessage = {
    secondaryAuxFanSpeedPercentage?: number;
    coolingFanSpeedPercentage?: number;
    auxFanSpeedPercentage?: number;
    chamberFanSpeedPercentage?: number;
    empty?: boolean;
    mc_percent?: number;
    layer_num?: number;
    total_layer_num?: number;
    mc_remaining_time?: number;
    gcode_state?: string;
    vt_tray?: AmsTray;
    vir_slot?: AmsTray[];
    ams?: AmsStatus;
    net?: NetworkInfo;
    lights_report?: LightInfo[];
    cooling_fan_speed?: number;
    big_fan1_speed?: number;
    big_fan2_speed?: number;
    device?: DeviceStatus;
    bed_temper?: number;
    nozzle_temper?: number;
    nozzle_target_temper?: number;
    hms?: HmsError[];
  };

  type BambuSmsSendDTO = {
    account?: string;
  };

  type BambuTaskDTO = {
    id?: number;
    designId?: number;
    designTitle?: string;
    instanceId?: number;
    modelId?: string;
    title?: string;
    cover?: string;
    status?: number;
    feedbackStatus?: number;
    startTime?: string;
    endTime?: string;
    weight?: number;
    length?: number;
    costTime?: number;
    profileId?: number;
    plateIndex?: number;
    plateName?: string;
    deviceId?: string;
    amsDetailMapping?: AmsDetailMappingDTO[];
    mode?: string;
    isPublicProfile?: boolean;
    isPrintable?: boolean;
    deviceModel?: string;
    deviceName?: string;
    bedType?: string;
  };

  type BambuTaskListResponseDTO = {
    total?: number;
    hits?: BambuTaskDTO[];
  };

  type BaseResponseAliyunMarketAppCodeVO = {
    code?: number;
    data?: AliyunMarketAppCodeVO;
    message?: string;
  };

  type BaseResponseAliyunMarketExpressQueryResponseDTO = {
    code?: number;
    data?: AliyunMarketExpressQueryResponseDTO;
    message?: string;
  };

  type BaseResponseAmsStatus = {
    code?: number;
    data?: AmsStatus;
    message?: string;
  };

  type BaseResponseBambuDeviceDTO = {
    code?: number;
    data?: BambuDeviceDTO;
    message?: string;
  };

  type BaseResponseBambuTaskDTO = {
    code?: number;
    data?: BambuTaskDTO;
    message?: string;
  };

  type BaseResponseBambuTaskListResponseDTO = {
    code?: number;
    data?: BambuTaskListResponseDTO;
    message?: string;
  };

  type BaseResponseBoolean = {
    code?: number;
    data?: boolean;
    message?: string;
  };

  type BaseResponseDeviceCompleteVO = {
    code?: number;
    data?: DeviceCompleteVO;
    message?: string;
  };

  type BaseResponseDeviceStatusCache = {
    code?: number;
    data?: DeviceStatusCache;
    message?: string;
  };

  type BaseResponseDeviceStreamVO = {
    code?: number;
    data?: DeviceStreamVO;
    message?: string;
  };

  type BaseResponseDouble = {
    code?: number;
    data?: number;
    message?: string;
  };

  type BaseResponseHomeAssistantConfigVO = {
    code?: number;
    data?: HomeAssistantConfigVO;
    message?: string;
  };

  type BaseResponseHomeAssistantEntityStateVO = {
    code?: number;
    data?: HomeAssistantEntityStateVO;
    message?: string;
  };

  type BaseResponseHomeVO = {
    code?: number;
    data?: HomeVO;
    message?: string;
  };

  type BaseResponseIPageOrderVO = {
    code?: number;
    data?: IPageOrderVO;
    message?: string;
  };

  type BaseResponseIPageSpoolUsedRecordVO = {
    code?: number;
    data?: IPageSpoolUsedRecordVO;
    message?: string;
  };

  type BaseResponseIPageSpoolVO = {
    code?: number;
    data?: IPageSpoolVO;
    message?: string;
  };

  type BaseResponseListBambuDeviceDTO = {
    code?: number;
    data?: BambuDeviceDTO[];
    message?: string;
  };

  type BaseResponseListConfigItemVO = {
    code?: number;
    data?: ConfigItemVO[];
    message?: string;
  };

  type BaseResponseListDeviceSimpleVO = {
    code?: number;
    data?: DeviceSimpleVO[];
    message?: string;
  };

  type BaseResponseListMapStringObject = {
    code?: number;
    data?: Record<string, any>[];
    message?: string;
  };

  type BaseResponseListNotificationConfigDTO = {
    code?: number;
    data?: NotificationConfigDTO[];
    message?: string;
  };

  type BaseResponseListOrderQuoteDraftDTO = {
    code?: number;
    data?: OrderQuoteDraftDTO[];
    message?: string;
  };

  type BaseResponseListOrderVO = {
    code?: number;
    data?: OrderVO[];
    message?: string;
  };

  type BaseResponseListPrinterOverviewVO = {
    code?: number;
    data?: PrinterOverviewVO[];
    message?: string;
  };

  type BaseResponseListSpoolUsedRecordVO = {
    code?: number;
    data?: SpoolUsedRecordVO[];
    message?: string;
  };

  type BaseResponseListSpoolUsedSnapshots = {
    code?: number;
    data?: SpoolUsedSnapshots[];
    message?: string;
  };

  type BaseResponseListSpoolVO = {
    code?: number;
    data?: SpoolVO[];
    message?: string;
  };

  type BaseResponseListUserListItemVO = {
    code?: number;
    data?: UserListItemVO[];
    message?: string;
  };

  type BaseResponseListUserPasskeyCredentialVO = {
    code?: number;
    data?: UserPasskeyCredentialVO[];
    message?: string;
  };

  type BaseResponseMapStringObject = {
    code?: number;
    data?: Record<string, any>;
    message?: string;
  };

  type BaseResponseMapStringString = {
    code?: number;
    data?: Record<string, any>;
    message?: string;
  };

  type BaseResponseNotificationResult = {
    code?: number;
    data?: NotificationResult;
    message?: string;
  };

  type BaseResponseOpenDeviceInfoVO = {
    code?: number;
    data?: OpenDeviceInfoVO;
    message?: string;
  };

  type BaseResponseOpenRegistrationConfigVO = {
    code?: number;
    data?: OpenRegistrationConfigVO;
    message?: string;
  };

  type BaseResponseOrderSummaryDTO = {
    code?: number;
    data?: OrderSummaryDTO;
    message?: string;
  };

  type BaseResponseOrderVO = {
    code?: number;
    data?: OrderVO;
    message?: string;
  };

  type BaseResponsePagePrinterVO = {
    code?: number;
    data?: PagePrinterVO;
    message?: string;
  };

  type BaseResponsePasskeyAssertionStartVO = {
    code?: number;
    data?: PasskeyAssertionStartVO;
    message?: string;
  };

  type BaseResponsePasskeyConfigVO = {
    code?: number;
    data?: PasskeyConfigVO;
    message?: string;
  };

  type BaseResponsePasskeyRegisterResultVO = {
    code?: number;
    data?: PasskeyRegisterResultVO;
    message?: string;
  };

  type BaseResponsePasskeyRegistrationStartVO = {
    code?: number;
    data?: PasskeyRegistrationStartVO;
    message?: string;
  };

  type BaseResponsePrinterVO = {
    code?: number;
    data?: PrinterVO;
    message?: string;
  };

  type BaseResponsePublicAccessUrlVO = {
    code?: number;
    data?: PublicAccessUrlVO;
    message?: string;
  };

  type BaseResponseSpoolQueryOptionsVO = {
    code?: number;
    data?: SpoolQueryOptionsVO;
    message?: string;
  };

  type BaseResponseSpoolSummaryVO = {
    code?: number;
    data?: SpoolSummaryVO;
    message?: string;
  };

  type BaseResponseSpoolUsedRecordVO = {
    code?: number;
    data?: SpoolUsedRecordVO;
    message?: string;
  };

  type BaseResponseSpoolVO = {
    code?: number;
    data?: SpoolVO;
    message?: string;
  };

  type BaseResponseString = {
    code?: number;
    data?: string;
    message?: string;
  };

  type BaseResponseUserApiKeyCreateVO = {
    code?: number;
    data?: UserApiKeyCreateVO;
    message?: string;
  };

  type BaseResponseUserApiKeyVO = {
    code?: number;
    data?: UserApiKeyVO;
    message?: string;
  };

  type BaseResponseUserBambuRegionVO = {
    code?: number;
    data?: UserBambuRegionVO;
    message?: string;
  };

  type BaseResponseUserConfigDTO = {
    code?: number;
    data?: UserConfigDTO;
    message?: string;
  };

  type BaseResponseUserVO = {
    code?: number;
    data?: UserVO;
    message?: string;
  };

  type BaseResponseVoid = {
    code?: number;
    data?: Record<string, any>;
    message?: string;
  };

  type clearDeviceCacheParams = {
    /** 设备ID */
    deviceId: string;
  };

  type ConfigItemVO = {
    key?: string;
    name?: string;
    enabled?: boolean;
  };

  type bambuMqttConnectParams = {
    /** 设备ID */
    deviceId: string;
  };

  type Consumable = {
    material?: number;
    weight?: number;
    price?: number;
  };

  type Ctc = {
    info?: CtcInfo;
    state?: number;
  };

  type CtcInfo = {
    temp?: number;
  };

  type DailyInboundStats = {
    date?: string;
    count?: number;
    amount?: number;
  };

  type DataBody = {
    orderNo?: string;
    info?: ExpressInfo[];
  };

  type deleteDraftParams = {
    /** 草稿 ID */
    id: string;
  };

  type deleteOrderParams = {
    /** 订单 ID */
    id: number;
  };

  type deletePasskeyParams = {
    credentialId: number;
  };

  type deleteSpoolParams = {
    /** 耗材ID */
    id: number;
  };

  type deleteSpoolUsedRecordParams = {
    /** 耗材使用记录ID */
    id: number;
  };

  type DeviceCompleteVO = {
    status?: PrinterStatusVO;
    amsList?: AmsVO[];
    mqttConnectStatus?: number;
    power?: HomeAssistantEntityStateVO;
    chamberLight?: string;
    chamberLight2?: string;
    workLight?: string;
    fans?: FanStatusVO;
    bedTemp?: number;
    chamberTemp?: number;
    nozzleTemp?: number;
    activeNozzle?: string;
    targetNozzleTemp?: number;
    leftNozzleTemp?: number;
    leftTargetNozzleTemp?: number;
    rightNozzleTemp?: number;
    rightTargetNozzleTemp?: number;
    hmsErrors?: HmsErrorVO[];
    layerNum?: number;
    totalLayerNum?: number;
    lastUpdateTime?: number;
  };

  type DeviceSimpleVO = {
    id?: number;
    name?: string;
    model?: string;
    deviceId?: string;
    sort?: number;
  };

  type DeviceStatus = {
    extruder?: Extruder;
    ctc?: Ctc;
    airduct?: Airduct;
  };

  type DeviceStatusCache = {
    deviceId?: string;
    message?: BambuMqttMessage;
    timestamp?: string;
  };

  type DeviceStreamVO = {
    streamType?: string;
    url?: string;
    fps?: number;
    latencyHint?: string;
  };

  type disconnectStreamParams = {
    /** 设备 ID */
    deviceId: string;
    /** 断流类型：auto/hls/mjpeg/all */
    type?: string;
  };

  type DrySetting = {
    dryDuration?: number;
    dryFilament?: string;
    dryTemperature?: number;
  };

  type ExpressInfo = {
    cpCode?: string;
    theLastTime?: string;
    mailNo?: string;
    theLastMessage?: string;
    cpMobile?: string;
    logisticsCompanyName?: string;
    cpUrl?: string;
    takeTime?: string;
    logisticsStatusDesc?: string;
    logisticsStatus?: string;
    logisticsStatusText?: string;
    logisticsTraceDetailList?: LogisticsTraceDetail[];
  };

  type Extruder = {
    info?: ExtruderInfo[];
    state?: number;
  };

  type ExtruderInfo = {
    id?: number;
    snow?: number;
    temp?: number;
  };

  type FanStatusVO = {
    coolingFanSpeedPercentage?: number;
    auxFanSpeedPercentage?: number;
    chamberFanSpeedPercentage?: number;
    secondaryAuxFanSpeedPercentage?: number;
  };

  type FinalQuote = {
    logistics?: number;
    design?: number;
    other?: number;
  };

  type finishPasskeyLoginParams = {
    requestId: string;
  };

  type finishPasskeyRegistrationParams = {
    requestId: string;
  };

  type getAllAvailableSpoolsWithIdParams = {
    /** 需要保留的耗材ID（即使已用完也返回） */
    spoolId: number;
  };

  type getAmsStatusParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getCompleteInfoParams = {
    /** 设备 ID */
    deviceId: number;
  };

  type getDeviceAccessCodeParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getDeviceInfoParams = {
    deviceId: string;
  };

  type getDeviceParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getDeviceStatusParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getHomeAssistantEntityStateParams = {
    /** Home Assistant 实体 ID */
    entityId: string;
  };

  type getLatestDeviceStatusParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getLatestParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getOrderParams = {
    /** 订单 ID */
    id: number;
  };

  type getOrderPrintDurationParams = {
    /** 订单 ID */
    id: number;
  };

  type getPrinterParams = {
    /** 打印机 ID */
    id: number;
  };

  type getPrinterPowerParams = {
    /** 打印机 ID */
    printerId: number;
  };

  type getPrintProgressParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getPrintStatusParams = {
    /** 设备ID */
    deviceId: string;
  };

  type getSpoolParams = {
    /** 耗材ID */
    id: number;
  };

  type getSpoolSummaryParams = {
    /** 是否排除已用完的耗材 */
    excludeFinished?: boolean;
    /** 品牌，单个值，精准匹配 */
    brand?: string;
    /** 材料类型，单个值，精准匹配 */
    materialType?: string;
  };

  type getSpoolUsedRecordParams = {
    /** 耗材使用记录ID */
    id: number;
  };

  type getStreamContentParams = {
    /** 设备 ID */
    deviceId: string;
  };

  type getStreamInfoParams = {
    deviceId: string;
  };

  type getTaskListParams = {
    /** 偏移量，从第几条开始 */
    offset?: number;
    /** 每页数量 */
    limit?: number;
    /** 开始时间戳（秒），0表示不限制 */
    startTime?: number;
    /** 结束时间戳（秒），0表示不限制 */
    endTime?: number;
    /** 状态列表 */
    statusList?: string;
    /** 搜索关键字 */
    query?: string;
  };

  type handleTaskParams = {
    /** 设备 ID */
    deviceId: string;
  };

  type HmsError = {
    attr?: number;
    code?: number;
  };

  type HmsErrorVO = {
    code?: string;
    message?: string;
    severity?: string;
    module?: string;
  };

  type HomeAssistantConfigSaveDTO = {
    baseUrl: string;
    apiKey?: string;
    scaleEntityId?: string;
  };

  type HomeAssistantConfigVO = {
    baseUrl?: string;
    apiKey?: string;
    scaleEntityId?: string;
  };

  type HomeAssistantEntityStateVO = {
    entityId?: string;
    state?: string;
    unit?: string;
  };

  type HomeVO = {
    weeklyUsedTime?: number;
    successfulPrints?: number;
    totalUsedSpoolsWeight?: number;
    printers?: PrinterHomeSummaryVO[];
    recentlyAdded?: SpoolHomeSummaryVO[];
    lowStock?: SpoolHomeSummaryVO[];
    last10UsedRecords?: SpoolUsedRecordHomeSummaryVO[];
  };

  type IPageOrderVO = {
    pages?: number;
    total?: number;
    current?: number;
    records?: OrderVO[];
    size?: number;
  };

  type IPageSpoolUsedRecordVO = {
    pages?: number;
    total?: number;
    current?: number;
    records?: SpoolUsedRecordVO[];
    size?: number;
  };

  type IPageSpoolVO = {
    pages?: number;
    total?: number;
    current?: number;
    records?: SpoolVO[];
    size?: number;
  };

  type isDeviceOnlineParams = {
    /** 设备ID */
    deviceId: string;
  };

  type JsonNode = true;

  type LicenseActivateReq = {
    /** 加密的 License 字符串 */
    license: string;
  };

  type LightInfo = {
    node?: string;
    mode?: string;
  };

  type listOrdersParams = {
    current: number;
    size: number;
    orderName?: string;
    customerName?: string;
    customerSource?: string;
    status?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type listPagePrintersParams = {
    current: number;
    size: number;
    name?: string;
    deviceId?: string;
    model?: string;
    ipAddress?: string;
  };

  type listSpoolsParams = {
    current: number;
    size: number;
    id?: number;
    name?: string;
    keyword?: string;
    materialType?: string[];
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    appearance?: number[];
    status?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type listSpoolUsedRecordByOrderIdParams = {
    /** 耗材 ID */
    orderId: number;
  };

  type listSpoolUsedRecordBySpoolIdParams = {
    /** 耗材ID */
    spoolId: number;
  };

  type listSpoolUsedRecordPageParams = {
    current: number;
    size: number;
    title?: string;
    spoolId?: number;
    deviceId?: string;
    status?: number;
    orderId?: number;
    isBindOrder?: number;
  };

  type listSpoolUsedSnapshotParams = {
    /** 记录id */
    recordId: number;
  };

  type LogisticsTraceDetail = {
    areaCode?: string;
    areaName?: string;
    subLogisticsStatus?: string;
    time?: number;
    timeDesc?: string;
    logisticsStatus?: string;
    logisticsStatusText?: string;
    subLogisticsStatusText?: string;
    desc?: string;
  };

  type NetworkInfo = {
    conf?: number;
    info?: NetworkInterface[];
  };

  type NetworkInterface = {
    ip?: number;
    mask?: number;
  };

  type NotificationConfigDTO = {
    channel?: string;
    name?: string;
    enabled?: boolean;
    sort?: number;
    config?: Record<string, any>;
  };

  type NotificationResult = {
    success?: boolean;
    messageId?: string;
    channel?: string;
    errorMessage?: string;
    sendTime?: string;
    responseData?: Record<string, any>;
  };

  type OpenDeviceInfoVO = {
    name?: string;
    deviceId?: string;
    model?: string;
    printStatus?: string;
    printProgress?: number;
    taskImage?: string;
    remainingTime?: number;
    chamberLight?: string;
    chamberLight2?: string;
    workLight?: string;
    fans?: FanStatusVO;
    bedTemp?: number;
    chamberTemp?: number;
    nozzleTemp?: number;
    activeNozzle?: string;
    targetNozzleTemp?: number;
    leftNozzleTemp?: number;
    leftTargetNozzleTemp?: number;
    rightNozzleTemp?: number;
    rightTargetNozzleTemp?: number;
    layerNum?: number;
    totalLayerNum?: number;
    trayType?: string;
    hmsErrors?: HmsErrorVO[];
  };

  type OpenRegistrationConfigSaveDTO = {
    enabled: boolean;
  };

  type OpenRegistrationConfigVO = {
    enabled?: boolean;
  };

  type OrderAssetsUpdateDTO = {
    id: number;
    images?: string[];
    models?: string[];
  };

  type OrderBindRecordsDTO = {
    orderId?: number;
    recordIds?: number[];
  };

  type OrderCreateDTO = {
    id?: number;
    orderName: string;
    customerName: string;
    customerSource?: string;
    totalIncome: number;
    electricityCost?: number;
    logisticsCost?: number;
    designCost?: number;
    laborCost?: number;
    otherCost?: number;
    remark?: string;
  };

  type OrderItem = {
    column?: string;
    asc?: boolean;
  };

  type OrderOtherCostUpdateDTO = {
    id?: number;
    electricityCost?: number;
    logisticsCost?: number;
    designCost?: number;
    laborCost?: number;
    otherCost?: number;
  };

  type OrderQuantityAdjustDTO = {
    orderId: number;
    operation: "INBOUND" | "OUTBOUND";
    quantity: number;
    unitPrice?: number;
  };

  type OrderQuoteDraftDTO = {
    id?: number;
    timestamp?: number;
    orderName?: string;
    customerName?: string;
    printDuration?: number;
    power?: number;
    electricityPrice?: number;
    laborHourlyRate?: number;
    consumables?: Consumable[];
    finalQuote?: FinalQuote;
    totalIncome?: number;
  };

  type OrderStatusUpdateDTO = {
    status?: number;
  };

  type OrderSummaryDTO = {
    totalIncome?: number;
    totalCost?: number;
    totalProfit?: number;
  };

  type OrderTrackingNumberUpdateDTO = {
    id: number;
    trackingNumber?: string;
  };

  type OrderUnbindRecordDTO = {
    orderId?: number;
    recordId?: number;
  };

  type OrderUpdateDTO = {
    id?: number;
    orderName?: string;
    customerName?: string;
    customerSource?: string;
    otherCost?: number;
    totalIncome?: number;
    remark?: string;
  };

  type OrderVO = {
    id?: number;
    userId?: number;
    orderName?: string;
    customerName?: string;
    customerSource?: string;
    status?: number;
    startTime?: string;
    endTime?: string;
    materialCost?: number;
    electricityCost?: number;
    logisticsCost?: number;
    trackingNumber?: string;
    designCost?: number;
    laborCost?: number;
    otherCost?: number;
    totalIncome?: number;
    quantity?: number;
    profit?: number;
    remark?: string;
    images?: string[];
    models?: string[];
    createTime?: string;
  };

  type PagePrinterVO = {
    records?: PrinterVO[];
    total?: number;
    size?: number;
    current?: number;
    orders?: OrderItem[];
    optimizeCountSql?: PagePrinterVO;
    searchCount?: PagePrinterVO;
    optimizeJoinOfCountSql?: boolean;
    maxLimit?: number;
    countId?: string;
    pages?: number;
  };

  type PasskeyAssertionStartVO = {
    requestId?: string;
    options?: JsonNode;
  };

  type PasskeyConfigSaveDTO = {
    rpId: string;
    origins: string[];
  };

  type PasskeyConfigVO = {
    rpId?: string;
    origins?: string[];
  };

  type PasskeyRegisterResultVO = {
    credentialId?: number;
    nickname?: string;
  };

  type PasskeyRegistrationStartVO = {
    requestId?: string;
    options?: JsonNode;
  };

  type PriceRangeDistribution = {
    priceRange?: string;
    count?: number;
    minPrice?: number;
    maxPrice?: number;
  };

  type PrinterChamberTempEntityUpdateDTO = {
    printerId: number;
    chamberTempEntityId?: string;
  };

  type PrinterCustomCameraRtspUrlUpdateDTO = {
    printerId: number;
    customCameraRtspUrl?: string;
  };

  type PrinterHomeSummaryVO = {
    id?: number;
    name?: string;
    model?: string;
    deviceId?: string;
    status?: string;
    mcPercent?: number;
    remainingTime?: number;
    sort?: number;
  };

  type PrinterLocationUpdateDTO = {
    printerId: number;
    location?: string;
  };

  type PrinterOverviewVO = {
    id?: number;
    name?: string;
    model?: string;
    deviceId?: string;
    status?: string;
    location?: string;
    mcPercent?: number;
    remainingTime?: number;
    coverUrl?: string;
  };

  type PrinterPowerEntityUpdateDTO = {
    printerId: number;
    powerEntityId?: string;
  };

  type PrinterRefreshDTO = {
    printerId: number;
  };

  type PrinterSortUpdateDTO = {
    id?: number;
    sort?: number;
  };

  type PrinterStatusVO = {
    name?: string;
    deviceId?: string;
    model?: string;
    printStatus?: string;
    printProgress?: number;
    taskImage?: string;
    remainingTime?: number;
  };

  type PrinterUnbindDTO = {
    printerId: number;
  };

  type PrinterVO = {
    id?: number;
    userId?: number;
    name?: string;
    deviceId?: string;
    model?: string;
    accessCode?: string;
    ipAddress?: string;
    location?: string;
    powerEntityId?: string;
    chamberTempEntityId?: string;
    customCameraRtspUrl?: string;
    createTime?: string;
    updateTime?: string;
  };

  type PublicAccessUrlSaveDTO = {
    publicAccessUrl?: string;
  };

  type PublicAccessUrlVO = {
    publicAccessUrl?: string;
  };

  type queryLogisticsParams = {
    number: string;
    type?: string;
    mobile?: string;
  };

  type readLogContentParams = {
    /** 日志文件名 */
    filename: string;
    /** 读取行数，默认500行 */
    lines?: number;
    /** 关键字过滤 */
    keyword?: string;
    /** 日志级别过滤 (ERROR, WARN, INFO, DEBUG) */
    level?: string;
  };

  type refreshParams = {
    /** 设备ID */
    deviceId: string;
  };

  type setEnabledParams = {
    channel: string;
    enabled: boolean;
  };

  type SpoolCheckDTO = {
    /** 耗材ID */
    spoolId: number;
    /** 使用重量(克) */
    usedWeight: number;
  };

  type SpoolCreateDTO = {
    name: string;
    materialType: string;
    color?: string;
    brand?: string;
    netWeight: number;
    spoolWeight: number;
    usedWeight?: number;
    price?: number;
    appearance?: number;
    remark?: string;
    num: number;
  };

  type SpoolHomeSummaryVO = {
    id?: number;
    name?: string;
    materialType?: string;
    color?: string;
    brand?: string;
    appearance?: number;
    remainingWeight?: number;
    remainingPercentage?: number;
    createTime?: string;
  };

  type SpoolQueryOptionsVO = {
    materialTypes?: string[];
    brand?: string[];
    appearance?: number[];
  };

  type SpoolSummaryVO = {
    totalCount?: number;
    totalPrice?: number;
    totalNetWeight?: number;
    totalUsedWeight?: number;
    totalRemainingWeight?: number;
    totalCost?: number;
    totalElectricityCost?: number;
    totalDepreciationCost?: number;
    materialTypeDistribution?: Record<string, any>;
    brandDistribution?: Record<string, any>;
    colorDistribution?: Record<string, any>;
    appearanceDistribution?: Record<string, any>;
    usageStatusDistribution?: UsageStatusDistribution;
    priceRangeDistribution?: PriceRangeDistribution[];
    recent30DaysInboundStats?: DailyInboundStats[];
  };

  type SpoolUpdateDTO = {
    id: number;
    name?: string;
    materialType?: string;
    color?: string;
    brand?: string;
    netWeight?: number;
    spoolWeight?: number;
    usedWeight?: number;
    price?: number;
    firstUsedTime?: string;
    lastUsedTime?: string;
    appearance?: number;
    remark?: string;
  };

  type SpoolUsedRecordHomeSummaryVO = {
    id?: number;
    spoolId?: number;
    spoolName?: string;
    title?: string;
    coverUrl?: string;
    status?: number;
    statusText?: string;
    actualWeight?: number;
    cost?: number;
    electricityCost?: number;
    depreciationCost?: number;
    createTime?: string;
  };

  type SpoolUsedRecordVO = {
    id?: number;
    userId?: number;
    taskId?: number;
    spoolId?: number;
    spoolVO?: SpoolVO;
    title?: string;
    coverUrl?: string;
    status?: number;
    statusText?: string;
    printProgress?: number;
    taskWeight?: number;
    actualWeight?: number;
    cost?: number;
    electricityCost?: number;
    depreciationCost?: number;
    startTime?: string;
    endTime?: string;
    deviceName?: string;
    orderId?: number;
    createTime?: string;
  };

  type SpoolUsedSnapshots = {
    id?: number;
    recordId?: number;
    percent?: number;
    imageUrl?: string;
    createTime?: string;
  };

  type SpoolUseDTO = {
    /** 耗材ID */
    spoolId: number;
    /** 使用重量(克) */
    usedWeight: number;
  };

  type SpoolVO = {
    id?: number;
    name?: string;
    materialType?: string;
    color?: string;
    brand?: string;
    netWeight?: number;
    spoolWeight?: number;
    usedWeight?: number;
    price?: number;
    remark?: string;
    appearance?: number;
    remainingWeight?: number;
    remainingPercentage?: number;
    firstUsedTime?: string;
    lastUsedTime?: string;
    userId?: number;
    createTime?: string;
    updateTime?: string;
  };

  type SseEmitter = {
    timeout?: number;
  };

  type StreamingResponseBody = true;

  type switchChamberLight2Params = {
    /** 设备 ID */
    deviceId: string;
  };

  type switchChamberLightParams = {
    /** 设备 ID */
    deviceId: string;
  };

  type testConfigParams = {
    channel: string;
  };

  type transferSpoolUsedRecordParams = {
    /** 耗材使用记录ID */
    id: number;
    /** 新耗材ID */
    newSpoolId: number;
  };

  type updateConfigParams = {
    channel: string;
  };

  type updateStatusParams = {
    id: number;
  };

  type UsageStatusDistribution = {
    unused?: number;
    inUse?: number;
    finished?: number;
  };

  type UserApiKeyCreateDTO = {
    name: string;
  };

  type UserApiKeyCreateVO = {
    id?: number;
    name?: string;
    keyPrefix?: string;
    status?: number;
    lastUsedTime?: string;
    lastUsedIp?: string;
    createTime?: string;
    updateTime?: string;
    apiKey?: string;
  };

  type UserApiKeyUpdateDTO = {
    name: string;
  };

  type UserApiKeyVO = {
    id?: number;
    name?: string;
    keyPrefix?: string;
    status?: number;
    lastUsedTime?: string;
    lastUsedIp?: string;
    createTime?: string;
    updateTime?: string;
  };

  type UserBambuRegionUpdateDTO = {
    bambuRegion: "CHINA" | "OTHER";
  };

  type UserBambuRegionVO = {
    bambuRegion?: "CHINA" | "OTHER";
  };

  type UserChangePasswordDTO = {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  };

  type UserConfigDTO = {
    powerWatt?: number;
    electricityPricePerKwh?: number;
    depreciationPerHour?: number;
    laborCostPerHour?: number;
    pageSize?: number;
    spoolDefaultStatus?: string;
    spoolRecordDefaultStatus?: string;
    orderDefaultStatus?: string;
    desktopTheme?: string;
    mobileTheme?: string;
    font?: string;
    desktopLayout?: string;
    webBackgroundUrl?: string;
    mobileBackgroundUrl?: string;
    cornerStyle?: string;
  };

  type UserListItemVO = {
    id?: number;
    username?: string;
    nickname?: string;
    createTime?: string;
    lastLoginTime?: string;
    isBanned?: boolean;
    banTime?: string;
    banReason?: string;
  };

  type UserLoginDTO = {
    username: string;
    password: string;
  };

  type UserPasskeyCredentialVO = {
    id?: number;
    credentialId?: string;
    nickname?: string;
    attachment?: string;
    transports?: string;
    lastUsedTime?: string;
    createTime?: string;
  };

  type UserPasskeyLoginFinishDTO = {
    credential: string;
  };

  type UserPasskeyLoginStartDTO = {
    username?: string;
  };

  type UserPasskeyRegisterFinishDTO = {
    credential: string;
    nickname?: string;
  };

  type UserPasskeyRegisterStartDTO = {
    nickname?: string;
  };

  type UserRegisterDTO = {
    username: string;
    password: string;
    nickname?: string;
    bambuRegion?: "CHINA" | "OTHER";
  };

  type UserUpdateDTO = {
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };

  type UserVO = {
    id?: number;
    username?: string;
    nickname?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    role?: string;
    createTime?: string;
    bambuUsername?: string;
    bambuRegion?: "CHINA" | "OTHER";
    bambuTokenExpireTime?: string;
    vipExpireTime?: string;
    lastLoginTime?: string;
    isBanned?: boolean;
    banReason?: string;
    banTime?: string;
    isIntranet?: boolean;
    isVip?: boolean;
  };
}
