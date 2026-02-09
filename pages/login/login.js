// pages/login/login.js
var app = getApp();
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Page({
  data: {
    role: '', // 当前选择的角色: customer, merchant
    password: '', // 商家密码
    customerLogin: true, // 是否显示顾客登录
    loading: false,
    avatarUrl: defaultAvatarUrl, // 用户头像
    nickName: '', // 用户昵称
    hasUserInfo: false // 是否已填写用户信息
  },

  onLoad: function (options) {
    var role = options.role || 'customer';
    console.log('登录页面加载，角色参数:', role);
    this.setData({
      role: role,
      customerLogin: role === 'customer'
    });
    console.log('设置后的角色状态:', this.data);
  },

  // 切换角色
  onSwitchRole: function (e) {
    var role = e.currentTarget.dataset.role;
    console.log('切换角色:', role);
    this.setData({
      role: role,
      customerLogin: role === 'customer',
      password: ''
    });
  },

  // 选择头像
  onChooseAvatar: function (e) {
    var that = this;
    const { avatarUrl } = e.detail;
    console.log('用户选择头像:', avatarUrl);

    // 上传头像到云存储
    that.uploadAvatar(avatarUrl);
  },

  // 上传头像到云存储
  uploadAvatar: function (filePath) {
    var that = this;
    const cloudPath = 'avatar/' + Date.now() + '.jpg';

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: function (res) {
        console.log('头像上传成功:', res.fileID);
        that.setData({
          avatarUrl: res.fileID
        });
      },
      fail: function (err) {
        console.error('头像上传失败:', err);
        wx.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      }
    });
  },

  // 输入昵称
  onNicknameInput: function (e) {
    this.setData({
      nickName: e.detail.value
    });
  },

  // 确认登录
  onCustomerLoginConfirm: function () {
    var that = this;

    if (!that.data.nickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    var userInfo = {
      avatarUrl: that.data.avatarUrl,
      nickName: that.data.nickName
    };

    that.doCustomerLogin(userInfo);
  },

  // 执行顾客登录
  doCustomerLogin: function (userInfo) {
    var that = this;
    that.setData({ loading: true });

    console.log('准备登录的用户信息:', userInfo);

    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'customerLogin',
        userInfo: userInfo
      },
      success: function (cloudRes) {
        console.log('登录成功', cloudRes);
        if (!cloudRes.result.success) {
          console.error('云函数返回失败:', cloudRes.result);
          wx.showToast({
            title: cloudRes.result.error || '登录失败',
            icon: 'none'
          });
          that.setData({ loading: false });
          return;
        }

        var userData = cloudRes.result.data;
        console.log('保存的用户数据:', userData);

        // 保存用户信息到全局和本地
        app.globalData.userInfo = userData;
        app.globalData.userRole = 'customer';
        app.globalData.isLoggedIn = true;
        app.globalData.openid = userData._openid; // 保存openid
        wx.setStorageSync('userInfo', userData);
        wx.setStorageSync('userRole', 'customer');
        wx.setStorageSync('isLoggedIn', true);
        wx.setStorageSync('openid', userData._openid); // 保存openid到本地存储

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(function () {
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }, 1500);
      },
      fail: function (err) {
        console.error('登录失败', err);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
        that.setData({ loading: false });
      }
    });
  },

  // 输入商家密码
  onPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 商家密码登录
  onMerchantLogin: function () {
    var that = this;
    var password = this.data.password;

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    that.setData({ loading: true });

    // 调用云函数验证商家密码
    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'merchantLogin',
        password: password
      },
      success: function (res) {
        console.log('商家登录成功', res);
        
        // 检查返回数据是否有效
        if (!res.result || !res.result.success || !res.result.data) {
          console.error('商家登录返回数据无效:', res.result);
          wx.showToast({
            title: '登录数据异常，请重试',
            icon: 'none'
          });
          that.setData({ loading: false });
          return;
        }
        
        var merchantData = res.result.data;
        console.log('商家数据:', merchantData);

        // 检查openid是否存在，如果不存在则使用备用方案
        var openid = null;
        if (merchantData && merchantData.openid) {
          openid = merchantData.openid;
        } else if (merchantData && merchantData._openid) {
          openid = merchantData._openid;
        } else if (res.result && res.result.openid) {
          openid = res.result.openid;
        }
        
        if (!openid) {
          // 如果仍然没有openid，使用一个默认值（仅用于商家端）
          openid = 'merchant_' + Date.now();
          console.warn('商家openid不存在，使用默认值:', openid);
        }

        // 保存商家信息到全局和本地
        app.globalData.userInfo = merchantData;
        app.globalData.userRole = 'merchant';
        app.globalData.isLoggedIn = true;
        app.globalData.openid = openid;
        wx.setStorageSync('userInfo', merchantData);
        wx.setStorageSync('userRole', 'merchant');
        wx.setStorageSync('isLoggedIn', true);
        wx.setStorageSync('openid', openid);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(function () {
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }, 1500);
      },
      fail: function (err) {
        console.error('商家登录失败', err);
        wx.showToast({
          title: '密码错误',
          icon: 'none'
        });
        that.setData({ loading: false });
      }
    });
  },

  // 跳转到注册页面
  onGoRegister: function () {
    wx.showModal({
      title: '提示',
      content: '顾客登录需要微信授权，无需单独注册',
      showCancel: false
    });
  }
});
