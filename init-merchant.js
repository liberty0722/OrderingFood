// 初始化商家账户的脚本
// 在微信开发者工具的控制台中运行
const db = wx.cloud.database()

// 初始化商家账户
async function initMerchantAccount() {
  try {
    // 检查是否已存在商家账户
    const checkRes = await db.collection('merchants').get()
    
    if (checkRes.data.length > 0) {
      console.log('商家账户已存在:', checkRes.data)
      return checkRes.data
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
    
    console.log('商家账户创建成功:', addRes)
    console.log('商家登录信息:')
    console.log('- 账户名: 默认商家')
    console.log('- 密码: 123456')
    
    return addRes
  } catch (err) {
    console.error('初始化商家账户失败:', err)
  }
}

// 运行初始化
initMerchantAccount()