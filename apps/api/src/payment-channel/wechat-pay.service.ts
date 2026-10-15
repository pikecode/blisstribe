// 渠道能力从业务模块统一出口；商城与服务订单分别维护自己的资金状态。
export {
  WechatPayService,
  type WechatPayNotifyHeaders,
} from '../shop/payment/wechat-pay.service'
