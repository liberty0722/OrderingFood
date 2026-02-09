// pages/mine/mine.js
var app = getApp();

Page({
  data: {
    orders: [],
    loading: false,
    isLoggedIn: false,
    userInfo: null,
    userRole: '',
    // 订单实时监听器
    watcher: null
  },

  onShow: function () {
    this._updateUserInfo();
    this.loadOrders();
    this.startWatching();
  },

  onHide: function () {
    this.stopWatching();
  },

  onUnload: function () {
    this.stopWatching();
  },

  // 更新用户信息
  _updateUserInfo: function () {
    // 从本地存储读取用户信息（确保最新）
    var userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    var userRole = app.globalData.userRole || wx.getStorageSync('userRole');
    var isLoggedIn = app.globalData.isLoggedIn || wx.getStorageSync('isLoggedIn');
    
    console.log('更新用户信息:', { userInfo, userRole, isLoggedIn });
    
    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo,
      userRole: userRole
    });
  },

  // 从云数据库加载当前用户的订单（实现用户隔离）
  loadOrders: function () {
    var that = this;
    that.setData({ loading: true });

    // 如果未登录，不加载订单
    if (!app.globalData.isLoggedIn) {
      that.setData({
        orders: [],
        loading: false
      });
      return;
    }

    var db = app.getDB();

    // 根据角色加载订单
    if (app.globalData.userRole === 'merchant') {
      // 商家查看所有订单
      db.collection('orders')
        .orderBy('createTime', 'desc')
        .limit(50)
        .get({
          success: function (res) {
            that.setData({
              orders: res.data,
              loading: false
            });
          },
          fail: function (err) {
            console.error('获取订单失败', err);
            that.setData({ loading: false });
            that.setData({
              orders: app.globalData.orders
            });
          }
        });
    } else {
      // 顾客只能查看自己的订单（使用_openid过滤实现用户隔离）
      var openid = app.globalData.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        console.warn('未找到用户openid，无法加载订单');
        that.setData({ loading: false });
        wx.showToast({
          title: '用户信息不完整，请重新登录',
          icon: 'none'
        });
        return;
      }
      
      console.log('加载用户订单，openid:', openid);
      
      db.collection('orders')
        .where({
          _openid: openid
        })
        .orderBy('createTime', 'desc')
        .limit(20)
        .get({
          success: function (res) {
            console.log('用户订单加载成功，数量:', res.data.length);
            
            // 处理订单数据，确保格式正确
            var orders = res.data || [];
            
            // 为每个订单添加必要的格式化信息
            orders.forEach(function(order) {
              // 确保订单状态存在
              if (!order.status) {
                order.status = '待制作';
              }
              
              // 格式化时间
              if (!order.createTimeStr && order.createTime) {
                var date = new Date(order.createTime);
                order.createTimeStr = date.getFullYear() + '-' + 
                  _padZero(date.getMonth() + 1) + '-' + 
                  _padZero(date.getDate()) + ' ' + 
                  _padZero(date.getHours()) + ':' + 
                  _padZero(date.getMinutes()) + ':' + 
                  _padZero(date.getSeconds());
              }
              
              // 确保items数组存在
              if (!order.items) {
                order.items = [];
              }
              
              // 确保总价存在
              if (!order.totalPrice) {
                order.totalPrice = 0;
                if (order.items && order.items.length > 0) {
                  order.items.forEach(function(item) {
                    order.totalPrice += (item.price || 0) * (item.count || 0);
                  });
                }
              }
            });
            
            that.setData({
              orders: orders,
              loading: false
            });
          },
          fail: function (err) {
            console.error('获取订单失败', err);
            that.setData({ loading: false });
            
            // 显示详细的错误信息
            var errorMsg = '获取订单失败';
            if (err.errMsg) {
              if (err.errMsg.includes('PERMISSION')) {
                errorMsg = '数据库权限问题，请联系管理员';
              } else if (err.errMsg.includes('INDEX')) {
                errorMsg = '数据库索引问题，请稍后重试';
              }
            }
            
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
          }
        });
      
      // 辅助函数：补零
      function _padZero(n) {
        return n < 10 ? '0' + n : '' + n;
      }
    }
  },

  // 手动刷新订单
  onRefresh: function () {
    this.loadOrders();
    wx.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1000
    });
  },

  // 开始实时监听订单变化
  startWatching: function () {
    var that = this;

    // 如果已有监听器，先关闭
    this.stopWatching();

    // 如果未登录，不监听
    if (!app.globalData.isLoggedIn || app.globalData.userRole === 'merchant') {
      return;
    }

    var openid = app.globalData.openid || wx.getStorageSync('openid');
    if (!openid) {
      console.warn('未找到用户openid，无法监听订单');
      return;
    }

    var db = app.getDB();
    this.data.watcher = db.collection('orders')
      .where({
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .watch({
        onChange: function (snapshot) {
          console.log('用户订单数据变化', snapshot);
          
          var orders = snapshot.docs || [];
          
          // 处理订单数据格式
          orders.forEach(function(order) {
            // 确保订单状态存在
            if (!order.status) {
              order.status = '待制作';
            }
            
            // 格式化时间
            if (!order.createTimeStr && order.createTime) {
              var date = new Date(order.createTime);
              order.createTimeStr = date.getFullYear() + '-' + 
                _padZero(date.getMonth() + 1) + '-' + 
                _padZero(date.getDate()) + ' ' + 
                _padZero(date.getHours()) + ':' + 
                _padZero(date.getMinutes()) + ':' + 
                _padZero(date.getSeconds());
            }
            
            // 确保items数组存在
            if (!order.items) {
              order.items = [];
            }
          });
          
          if (snapshot.type === 'init') {
            // 初始化数据
            that.setData({
              orders: orders
            });
          } else {
            // 数据变化（新增、修改、删除）
            that.setData({
              orders: orders
            });
          }
        },
        onError: function (err) {
          console.error('监听用户订单失败', err);
          // 监听失败后降级为普通查询
          that.stopWatching();
        }
      });
    
    // 辅助函数：补零
    function _padZero(n) {
      return n < 10 ? '0' + n : '' + n;
    }
  },

  // 停止监听
  stopWatching: function () {
    if (this.data.watcher) {
      this.data.watcher.close();
      this.data.watcher = null;
    }
  },

  // 查看订单详情
  onOrderTap: function (e) {
    var orderId = e.currentTarget.dataset.id;
    var orders = this.data.orders;
    var order = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i]._id === orderId) {
        order = orders[i];
        break;
      }
    }
    if (!order) return;

    var items = '';
    for (var j = 0; j < order.items.length; j++) {
      items += order.items[j].name + ' x' + order.items[j].count;
      if (j < order.items.length - 1) {
        items += '、';
      }
    }

    wx.showModal({
      title: '订单详情',
      content: '桌号：' + order.tableNo + '\n商品：' + items + '\n合计：¥' + order.totalPrice + '\n状态：' + order.status + '\n备注：' + (order.remark || '无') + '\n下单时间：' + order.createTimeStr,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 登录
  onLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login?role=customer'
    });
  },

  // 商家登录
  onMerchantLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login?role=merchant'
    });
  },

  // 退出登录
  onLogout: function () {
    var that = this;
    app.logout(function () {
      that.setData({
        isLoggedIn: false,
        userInfo: null,
        userRole: '',
        orders: []
      });
    });
  },

  // 去点餐
  onGoOrder: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 进入商家端
  onGoMerchant: function () {
    // 检查是否是商家
    if (app.checkMerchant()) {
      wx.navigateTo({
        url: '/pages/merchant/merchant'
      });
    }
  }
});

