// app.js
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        // 请替换为你的云开发环境ID
        env: 'cloud1-8g0hz8kfbbe295f8',
        traceUser: true
      });
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }

    // 初始化购物车数据
    var cart = wx.getStorageSync('cart') || [];
    this.globalData.cart = cart;

    // 初始化用户登录状态
    this._initUserLogin();
  },

  // 初始化用户登录状态
  _initUserLogin: function () {
    var userInfo = wx.getStorageSync('userInfo');
    var userRole = wx.getStorageSync('userRole');
    var isLoggedIn = wx.getStorageSync('isLoggedIn');
    var openid = wx.getStorageSync('openid');

    if (userInfo && userRole && isLoggedIn) {
      this.globalData.userInfo = userInfo;
      this.globalData.userRole = userRole;
      this.globalData.isLoggedIn = isLoggedIn;
      this.globalData.openid = openid;
      console.log('用户已登录:', userRole, 'openid:', openid);
    }
  },

  // 检查登录状态，未登录跳转登录页
  checkLogin: function (callback) {
    if (this.globalData.isLoggedIn) {
      if (callback) callback(true);
      return true;
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: function () {
          wx.navigateTo({
            url: '/pages/login/login?role=customer'
          });
        }
      });
      if (callback) callback(false);
      return false;
    }
  },

  // 检查商家权限
  checkMerchant: function (callback) {
    if (this.globalData.isLoggedIn && this.globalData.userRole === 'merchant') {
      if (callback) callback(true);
      return true;
    } else {
      wx.showModal({
        title: '提示',
        content: '需要商家权限',
        showCancel: false
      });
      if (callback) callback(false);
      return false;
    }
  },

  // 退出登录
  logout: function (callback) {
    var that = this;
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          // 清除全局状态
          that.globalData.userInfo = null;
          that.globalData.userRole = '';
          that.globalData.isLoggedIn = false;

          // 清除本地存储
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('userRole');
          wx.removeStorageSync('isLoggedIn');

          // 清空购物车
          that.clearCart();

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          if (callback) callback();
        }
      }
    });
  },

  globalData: {
    // 用户信息
    userInfo: null,
    userRole: '', // customer, merchant
    isLoggedIn: false,
    // 购物车
    cart: [],
    // 云开发数据库引用
    db: null,
    // 菜品分类数据
    categories: [
      { id: 1, name: '热销推荐', icon: '🔥' },
      { id: 2, name: '招牌菜', icon: '⭐' },
      { id: 3, name: '凉菜', icon: '🥗' },
      { id: 4, name: '热菜', icon: '🍲' },
      { id: 5, name: '汤类', icon: '🍜' },
      { id: 6, name: '主食', icon: '🍚' },
      { id: 7, name: '饮品', icon: '🥤' },
      { id: 8, name: '甜点', icon: '🍰' }
    ],
    // 菜品列表数据
    menuList: [
      // 热销推荐
      { id: 101, categoryId: 1, name: '宫保鸡丁', price: 38, image: '', description: '经典川菜，鸡丁嫩滑，花生香脆', sales: 856 },
      { id: 102, categoryId: 1, name: '红烧肉', price: 48, image: '', description: '肥而不腻，入口即化', sales: 723 },
      { id: 103, categoryId: 1, name: '番茄牛腩', price: 58, image: '', description: '酸甜开胃，牛腩软烂', sales: 612 },
      { id: 104, categoryId: 1, name: '酸菜鱼', price: 68, image: '', description: '酸辣鲜香，鱼肉鲜嫩', sales: 534 },
      // 招牌菜
      { id: 201, categoryId: 2, name: '松鼠鳜鱼', price: 88, image: '', description: '外酥里嫩，酸甜可口', sales: 423 },
      { id: 202, categoryId: 2, name: '东坡肘子', price: 78, image: '', description: '色泽红亮，肉质酥烂', sales: 356 },
      { id: 203, categoryId: 2, name: '剁椒鱼头', price: 68, image: '', description: '鲜辣开胃，肉质鲜美', sales: 445 },
      // 凉菜
      { id: 301, categoryId: 3, name: '凉拌黄瓜', price: 12, image: '', description: '清爽可口，开胃小菜', sales: 967 },
      { id: 302, categoryId: 3, name: '皮蛋豆腐', price: 18, image: '', description: '口感嫩滑，味道鲜美', sales: 645 },
      { id: 303, categoryId: 3, name: '口水鸡', price: 32, image: '', description: '麻辣鲜香，回味无穷', sales: 534 },
      // 热菜
      { id: 401, categoryId: 4, name: '鱼香肉丝', price: 36, image: '', description: '酸甜咸辣，下饭神器', sales: 789 },
      { id: 402, categoryId: 4, name: '麻婆豆腐', price: 28, image: '', description: '麻辣鲜香，豆腐嫩滑', sales: 678 },
      { id: 403, categoryId: 4, name: '回锅肉', price: 38, image: '', description: '肥而不腻，香辣可口', sales: 567 },
      { id: 404, categoryId: 4, name: '清炒时蔬', price: 22, image: '', description: '新鲜时蔬，清淡健康', sales: 456 },
      // 汤类
      { id: 501, categoryId: 5, name: '西红柿蛋汤', price: 18, image: '', description: '酸甜可口，营养丰富', sales: 823 },
      { id: 502, categoryId: 5, name: '紫菜蛋花汤', price: 15, image: '', description: '清淡鲜美，老少皆宜', sales: 567 },
      { id: 503, categoryId: 5, name: '酸辣汤', price: 22, image: '', description: '酸辣开胃，暖身暖胃', sales: 445 },
      // 主食
      { id: 601, categoryId: 6, name: '蛋炒饭', price: 18, image: '', description: '粒粒分明，蛋香浓郁', sales: 934 },
      { id: 602, categoryId: 6, name: '扬州炒饭', price: 22, image: '', description: '配料丰富，口感极佳', sales: 756 },
      { id: 603, categoryId: 6, name: '手工水饺', price: 28, image: '', description: '皮薄馅大，汁多鲜美', sales: 623 },
      // 饮品
      { id: 701, categoryId: 7, name: '鲜榨橙汁', price: 18, image: '', description: '新鲜现榨，酸甜可口', sales: 567 },
      { id: 702, categoryId: 7, name: '柠檬水', price: 12, image: '', description: '清爽解渴，美容养颜', sales: 789 },
      { id: 703, categoryId: 7, name: '酸梅汤', price: 15, image: '', description: '酸甜解腻，消暑佳品', sales: 534 },
      // 甜点
      { id: 801, categoryId: 8, name: '芒果布丁', price: 22, image: '', description: '香甜软滑，芒果味浓', sales: 456 },
      { id: 802, categoryId: 8, name: '红豆双皮奶', price: 25, image: '', description: '奶香浓郁，红豆绵密', sales: 389 },
      { id: 803, categoryId: 8, name: '杨枝甘露', price: 28, image: '', description: '芒果椰汁，清新甜蜜', sales: 423 }
    ],
    // 本地订单列表（缓存用）
    orders: [],
    // 菜品是否已从云端加载
    menuLoaded: false
  },

  // 获取云数据库引用
  getDB: function () {
    if (!this.globalData.db) {
      this.globalData.db = wx.cloud.database();
    }
    return this.globalData.db;
  },

  // 添加商品到购物车
  addToCart: function (item) {
    var cart = this.globalData.cart;
    var found = false;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id) {
        cart[i].count += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      var newItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        count: 1,
        isCustom: item.isCustom || false
      };
      cart.push(newItem);
    }
    this.globalData.cart = cart;
    wx.setStorageSync('cart', cart);
  },

  // 从购物车减少商品
  reduceFromCart: function (itemId) {
    var cart = this.globalData.cart;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === itemId) {
        cart[i].count -= 1;
        if (cart[i].count <= 0) {
          cart.splice(i, 1);
        }
        break;
      }
    }
    this.globalData.cart = cart;
    wx.setStorageSync('cart', cart);
  },

  // 清空购物车
  clearCart: function () {
    this.globalData.cart = [];
    wx.setStorageSync('cart', []);
  },

  // 获取购物车总数量
  getCartTotalCount: function () {
    var cart = this.globalData.cart;
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].count;
    }
    return total;
  },

  // 获取购物车总价
  getCartTotalPrice: function () {
    var cart = this.globalData.cart;
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].price * cart[i].count;
    }
    return total;
  },

  // 获取某个商品在购物车中的数量
  getItemCount: function (itemId) {
    var cart = this.globalData.cart;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === itemId) {
        return cart[i].count;
      }
    }
    return 0;
  },

  // 创建订单 - 写入云数据库
  createOrder: function (cart, totalPrice, tableNo, remark, callback) {
    var that = this;
    var db = this.getDB();
    var orderData = {
      orderId: 'ORD' + Date.now(),
      items: JSON.parse(JSON.stringify(cart)),
      totalPrice: totalPrice,
      tableNo: tableNo,
      remark: remark,
      status: '待制作',
      createTime: db.serverDate(),
      createTimeStr: this._formatTime(new Date()),
      // _openid 会由云开发自动注入，实现用户隔离
      // 添加用户角色标识
      userRole: this.globalData.userRole || 'customer',
      // 如果是商家，添加商家ID
      merchantId: this.globalData.userRole === 'merchant' ? (this.globalData.userInfo && this.globalData.userInfo._id) : null,
      // 添加用户信息，方便商家查看
      userName: this.globalData.userInfo ? (this.globalData.userInfo.nickName || '匿名用户') : '匿名用户',
      userAvatar: this.globalData.userInfo ? this.globalData.userInfo.avatarUrl : ''
    };

    db.collection('orders').add({
      data: orderData,
      success: function (res) {
        console.log('订单创建成功', res);
        orderData._id = res._id;
        that.globalData.orders.unshift(orderData);
        that.clearCart();
        if (callback) {
          callback(null, orderData);
        }
      },
      fail: function (err) {
        console.error('订单创建失败', err);
        if (callback) {
          callback(err, null);
        }
      }
    });
  },

  // 格式化时间
  _formatTime: function (date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    return year + '-' + this._padZero(month) + '-' + this._padZero(day) + ' ' + this._padZero(hour) + ':' + this._padZero(minute) + ':' + this._padZero(second);
  },

  _padZero: function (n) {
    return n < 10 ? '0' + n : '' + n;
  },

  // ========== 菜品云端管理 ==========

  // 从云数据库加载菜品列表
  loadMenuFromCloud: function (callback) {
    var that = this;
    var db = this.getDB();

    db.collection('menu')
      .orderBy('categoryId', 'asc')
      .orderBy('id', 'asc')
      .limit(100)
      .get({
        success: function (res) {
          if (res.data.length > 0) {
            // 云端有菜品数据，使用云端数据
            that.globalData.menuList = res.data;
            that.globalData.menuLoaded = true;
            console.log('从云端加载菜品成功，共' + res.data.length + '道菜');
          } else {
            // 云端没有数据，将本地默认菜品上传到云端
            console.log('云端无菜品数据，开始初始化...');
            that.initCloudMenu();
          }
          if (callback) callback(null, that.globalData.menuList);
        },
        fail: function (err) {
          console.error('从云端加载菜品失败', err);
          // 降级使用本地数据
          if (callback) callback(err, that.globalData.menuList);
        }
      });
  },

  // 将本地默认菜品初始化到云端
  initCloudMenu: function () {
    var that = this;
    var db = this.getDB();
    var menuList = this.globalData.menuList;

    // 先查询云端已有数据，避免重复上传
    db.collection('menu').get({
      success: function (res) {
        var existingIds = {};
        for (var j = 0; j < res.data.length; j++) {
          existingIds[res.data[j].id] = true;
        }

        for (var i = 0; i < menuList.length; i++) {
          (function (item) {
            // 如果该菜品已存在，跳过
            if (existingIds[item.id]) {
              console.log('菜品已存在，跳过：' + item.name);
              return;
            }

            db.collection('menu').add({
              data: {
                id: item.id,
                categoryId: item.categoryId,
                name: item.name,
                price: item.price,
                image: item.image || '',
                description: item.description || '',
                sales: item.sales || 0,
                isAvailable: true,
                createTime: db.serverDate()
              },
              success: function () {
                console.log('菜品已上传：' + item.name);
              },
              fail: function (err) {
                console.error('上传菜品失败：' + item.name, err);
              }
            });
          })(menuList[i]);
        }
      }
    });
  },

  // 从云数据库加载分类
  loadCategoriesFromCloud: function (callback) {
    var that = this;
    var db = this.getDB();

    db.collection('categories')
      .orderBy('id', 'asc')
      .limit(50)
      .get({
        success: function (res) {
          if (res.data.length > 0) {
            that.globalData.categories = res.data;
            console.log('从云端加载分类成功，共' + res.data.length + '个分类');
          } else {
            // 云端没有分类数据，初始化上传
            console.log('云端无分类数据，开始初始化...');
            that.initCloudCategories();
          }
          if (callback) callback(null, that.globalData.categories);
        },
        fail: function (err) {
          console.error('从云端加载分类失败', err);
          if (callback) callback(err, that.globalData.categories);
        }
      });
  },

  // 将本地默认分类初始化到云端
  initCloudCategories: function () {
    var that = this;
    var db = this.getDB();
    var categories = this.globalData.categories;

    // 先查询云端已有数据，避免重复上传
    db.collection('categories').get({
      success: function (res) {
        var existingIds = {};
        for (var j = 0; j < res.data.length; j++) {
          existingIds[res.data[j].id] = true;
        }

        for (var i = 0; i < categories.length; i++) {
          (function (cat) {
            // 如果该分类已存在，跳过
            if (existingIds[cat.id]) {
              console.log('分类已存在，跳过：' + cat.name);
              return;
            }

            db.collection('categories').add({
              data: {
                id: cat.id,
                name: cat.name,
                icon: cat.icon
              },
              success: function () {
                console.log('分类已上传：' + cat.name);
              }
            });
          })(categories[i]);
        }
      }
    });
  }
})
