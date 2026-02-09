// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, userInfo, password } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log('登录请求:', event)

  // 顾客登录
  if (action === 'customerLogin') {
    try {
      // 查询用户是否已存在
      const userRes = await db.collection('users').where({
        _openid: openid,
        role: 'customer'
      }).get()

      let userData
      if (userRes.data.length > 0) {
        // 用户已存在，更新用户信息
        await db.collection('users').doc(userRes.data[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            lastLoginTime: db.serverDate()
          }
        })
        userData = {
          _id: userRes.data[0]._id,
          _openid: userRes.data[0]._openid,
          role: userRes.data[0].role,
          createTime: userRes.data[0].createTime,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          lastLoginTime: new Date()
        }
      } else {
        // 新用户，创建用户记录
        const addRes = await db.collection('users').add({
          data: {
            _openid: openid,
            role: 'customer',
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            createTime: db.serverDate(),
            lastLoginTime: db.serverDate()
          }
        })
        userData = {
          _id: addRes._id,
          _openid: openid,
          role: 'customer',
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: new Date(),
          lastLoginTime: new Date()
        }
      }

      return {
        success: true,
        data: userData
      }
    } catch (err) {
      console.error('顾客登录失败:', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  // 商家登录
  if (action === 'merchantLogin') {
    try {
      // 查询商家账户
      const merchantRes = await db.collection('merchants').where({
        password: password
      }).get()

      if (merchantRes.data.length === 0) {
        return {
          success: false,
          error: '密码错误'
        }
      }

      const merchantData = merchantRes.data[0]

      // 更新最后登录时间
      await db.collection('merchants').doc(merchantData._id).update({
        data: {
          lastLoginTime: db.serverDate()
        }
      })

      return {
        success: true,
        data: {
          _id: merchantData._id,
          merchantName: merchantData.merchantName,
          role: 'merchant',
          openid: openid
        }
      }
    } catch (err) {
      console.error('商家登录失败:', err)
      return {
        success: false,
        error: err.message
      }
    }
  }

  return {
    success: false,
    error: '无效的操作'
  }
}
