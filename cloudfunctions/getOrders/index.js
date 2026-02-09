// 获取商家订单的云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 检查用户身份，确保是商家
    const userInfo = await db.collection('users').where({
      _openid: wxContext.OPENID,
      role: 'merchant'
    }).get()
    
    if (userInfo.data.length === 0) {
      return {
        success: false,
        error: '权限不足，仅商家可查看订单'
      }
    }
    
    // 获取所有订单数据
    const result = await db.collection('orders')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get()
    
    return {
      success: true,
      data: result.data
    }
  } catch (err) {
    console.error('获取订单失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}