// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action } = event

  console.log('初始化数据请求:', action)

  try {
    // 初始化商家账户
    if (action === 'initMerchant') {
      // 检查是否已存在商家账户
      const merchantRes = await db.collection('merchants').limit(1).get()

      if (merchantRes.data.length === 0) {
        // 创建默认商家账户（密码：admin123）
        await db.collection('merchants').add({
          data: {
            merchantName: '默认商家',
            password: 'admin123',
            description: '商家管理后台',
            createTime: db.serverDate(),
            lastLoginTime: null
          }
        })
        return {
          success: true,
          message: '商家账户初始化成功，默认密码：admin123'
        }
      } else {
        return {
          success: true,
          message: '商家账户已存在'
        }
      }
    }

    return {
      success: false,
      message: '无效的操作'
    }
  } catch (err) {
    console.error('初始化失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
