// 使用云函数初始化商家账户
// 复制以下代码到微信开发者工具控制台运行
async function initMerchantAccount() {
  try {
    console.log('正在初始化商家账户...')
    
    const res = await wx.cloud.callFunction({
      name: 'initMerchant',
      data: {
        action: 'initMerchant'
      }
    })
    
    console.log('云函数返回:', res)
    
    if (res.result.success) {
      console.log('✅ 商家账户初始化成功!')
      console.log('📋 登录信息:')
      console.log('- 密码: 123456')
      console.log('💡 现在可以去登录页面测试商家登录了')
    } else {
      console.error('❌ 初始化失败:', res.result.error)
    }
  } catch (err) {
    console.error('❌ 调用云函数失败:', err)
  }
}

// 运行初始化
initMerchantAccount()