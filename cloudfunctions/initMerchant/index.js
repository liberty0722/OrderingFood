// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event
  
  try {
    if (action === 'initMerchant') {
      // 检查是否已存在商家账户
      const checkRes = await db.collection('merchants').get()
      
      if (checkRes.data.length > 0) {
        return {
          success: true,
          message: '商家账户已存在',
          data: checkRes.data
        }
      }
      
      // 创建默认商家账户
      const addRes = await db.collection('merchants').add({
        data: {
          merchantName: '默认商家',
          password: '123456', // 默认密码
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate(),
          status: 'active'
        }
      })
      
      return {
        success: true,
        message: '商家账户创建成功',
        data: {
          merchantName: '默认商家',
          password: '123456'
        }
      }
    }
    
    return {
      success: false,
      error: '无效的操作'
    }
  } catch (err) {
    console.error('初始化商家失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}