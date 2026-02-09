// pages/merchant/merchant.js
var app = getApp();

Page({
  data: {
    orders: [],
    filteredOrders: [],
    loading: false,
    currentTab: 'all',
    merchantPassword: '123456',
    isLoggedIn: false,
    passwordInput: '',
    newOrderCount: 0,
    // 订单实时监听器
    watcher: null,
    // ========== 菜品管理 ==========
    currentPage: 'orders',  // 'orders' 或 'menu'
    menuList: [],
    categories: [],
    menuLoading: false,
    // 添加菜品弹窗
    showAddDishPopup: false,
    newDishName: '',
    newDishPrice: '',
    newDishDesc: '',
    newDishCategoryId: 1,
    // 添加分类弹窗
    showAddCategoryPopup: false,
    newCategoryName: '',
    newCategoryIcon: '',
    // 菜品建议管理
    suggestionList: [],
    suggestionLoading: false,
    // 采纳上架弹窗
    showApproveSuggestionPopup: false,
    approvingSuggestion: null,
    approveDishPrice: '',
    approveDishCategoryId: 1
  },

  onLoad: function () {
    // 检查商家权限
    if (!app.checkMerchant()) {
      wx.navigateBack();
      return;
    }
    this.setData({ isLoggedIn: true });
    this.loadOrders();
    this.startWatching();
  },

  onUnload: function () {
    // 页面卸载时关闭监听
    this.stopWatching();
  },

  onHide: function () {
    // 页面隐藏时关闭监听，节省资源
    this.stopWatching();
  },

  onShow: function () {
    // 页面显示时重新监听
    if (this.data.isLoggedIn) {
      this.loadOrders();
      this.startWatching();
    }
  },

  // 密码输入
  onPasswordInput: function (e) {
    this.setData({
      passwordInput: e.detail.value
    });
  },

  // 商家登录验证
  onLogin: function () {
    if (this.data.passwordInput === this.data.merchantPassword) {
      this.setData({ isLoggedIn: true });
      wx.setStorageSync('merchantLoggedIn', true);
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      this.loadOrders();
      this.startWatching();
    } else {
      wx.showToast({
        title: '密码错误',
        icon: 'none'
      });
    }
  },

  // 退出商家端
  onLogout: function () {
    this.stopWatching();
    this.setData({
      isLoggedIn: false,
      passwordInput: '',
      orders: [],
      filteredOrders: []
    });
    // 退出商家登录，但不退出全局登录状态
    wx.navigateBack();
  },

  // 从云数据库加载所有订单（商家可看到所有用户的订单）
  loadOrders: function () {
    var that = this;
    that.setData({ loading: true });

    // 先尝试直接查询数据库（最直接的方式）
    that._directLoadOrders();
  },

  // 直接查询数据库（主要方式）
  _directLoadOrders: function () {
    var that = this;
    var db = app.getDB();
    
    console.log('开始直接查询订单数据...');
    
    db.collection('orders')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get({
        success: function (res) {
          console.log('订单查询成功，数据量：', res.data.length);
          
          // 处理查询结果
          var orders = res.data || [];
          
          // 为每个订单添加格式化的时间字符串（如果不存在）
          orders.forEach(function(order) {
            if (!order.createTimeStr && order.createTime) {
              var date = new Date(order.createTime);
              order.createTimeStr = date.getFullYear() + '-' + 
                _padZero(date.getMonth() + 1) + '-' + 
                _padZero(date.getDate()) + ' ' + 
                _padZero(date.getHours()) + ':' + 
                _padZero(date.getMinutes()) + ':' + 
                _padZero(date.getSeconds());
            }
            
            // 确保订单状态存在
            if (!order.status) {
              order.status = '待制作';
            }
          });
          
          that.setData({
            orders: orders,
            loading: false
          });
          
          // 更新过滤后的订单列表
          that.filterOrders(that.data.currentTab);
          
          // 显示加载结果
          if (orders.length === 0) {
            console.log('没有找到订单数据，可能数据库中还没有订单');
          }
        },
        fail: function (err) {
          console.error('订单查询失败:', err);
          that.setData({ loading: false });
          
          // 显示具体的错误信息
          var errorMsg = '获取订单失败';
          if (err.errMsg) {
            if (err.errMsg.includes('PERMISSION')) {
              errorMsg = '数据库权限问题，请设置 orders 集合为"所有用户可读"';
            } else if (err.errMsg.includes('INDEX')) {
              errorMsg = '数据库索引问题，请为 createTime 字段创建索引';
            }
          }
          
          wx.showModal({
            title: '错误提示',
            content: errorMsg + '\n\n错误详情：' + (err.errMsg || '未知错误'),
            showCancel: false
          });
        }
      });
    
    // 辅助函数：补零
    function _padZero(n) {
      return n < 10 ? '0' + n : '' + n;
    }
  },

  // 开始实时监听订单变化 - 核心功能！
  startWatching: function () {
    var that = this;

    // 如果已有监听器，先关闭
    this.stopWatching();

    var db = app.getDB();
    this.data.watcher = db.collection('orders')
      .orderBy('createTime', 'desc')
      .watch({
        onChange: function (snapshot) {
          console.log('订单数据变化', snapshot);

          if (snapshot.type === 'init') {
            // 初始化数据
            that.setData({
              orders: snapshot.docs
            });
            that.filterOrders(that.data.currentTab);
          } else {
            // 数据变化（新增、修改、删除）
            var docChanges = snapshot.docChanges;
            for (var i = 0; i < docChanges.length; i++) {
              var change = docChanges[i];
              if (change.dataType === 'add') {
                // 新订单来了！
                that.onNewOrderArrived(change.doc);
              }
            }
            // 更新完整数据
            that.setData({
              orders: snapshot.docs
            });
            that.filterOrders(that.data.currentTab);
          }
        },
        onError: function (err) {
          console.error('监听订单失败', err);
          // 监听失败后降级为轮询
          that.stopWatching();
        }
      });
  },

  // 停止监听
  stopWatching: function () {
    if (this.data.watcher) {
      this.data.watcher.close();
      this.data.watcher = null;
    }
  },

  // 新订单到达提醒
  onNewOrderArrived: function (order) {
    var that = this;

    // 振动提醒
    wx.vibrateShort({
      type: 'heavy'
    });

    // 弹窗提示
    var items = '';
    if (order.items) {
      for (var i = 0; i < order.items.length; i++) {
        items += order.items[i].name + ' x' + order.items[i].count;
        if (i < order.items.length - 1) {
          items += '、';
        }
      }
    }

    wx.showModal({
      title: '🔔 新订单来了！',
      content: '桌号：' + (order.tableNo || '未知') + '\n商品：' + items + '\n合计：¥' + (order.totalPrice || 0) + '\n备注：' + (order.remark || '无'),
      confirmText: '开始制作',
      cancelText: '稍后处理',
      success: function (res) {
        if (res.confirm) {
          that.updateOrderStatus(order._id, '制作中');
        }
      }
    });
  },

  // 切换订单状态标签
  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
    this.filterOrders(tab);
  },

  // 过滤订单
  filterOrders: function (tab) {
    var orders = this.data.orders;
    var filtered = [];

    if (tab === 'all') {
      filtered = orders;
    } else {
      var statusMap = {
        'pending': '待制作',
        'cooking': '制作中',
        'done': '已完成'
      };
      var targetStatus = statusMap[tab];
      for (var i = 0; i < orders.length; i++) {
        if (orders[i].status === targetStatus) {
          filtered.push(orders[i]);
        }
      }
    }

    this.setData({
      filteredOrders: filtered
    });
  },

  // 更新订单状态
  updateOrderStatus: function (orderId, newStatus) {
    var that = this;
    var db = app.getDB();

    db.collection('orders').doc(orderId).update({
      data: {
        status: newStatus
      },
      success: function () {
        wx.showToast({
          title: '状态已更新',
          icon: 'success'
        });
        // 数据会通过 watch 自动更新
      },
      fail: function (err) {
        console.error('更新订单状态失败', err);
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    });
  },

  // 操作订单 - 开始制作
  onStartCooking: function (e) {
    var orderId = e.currentTarget.dataset.id;
    this.updateOrderStatus(orderId, '制作中');
  },

  // 操作订单 - 完成制作
  onFinishCooking: function (e) {
    var orderId = e.currentTarget.dataset.id;
    this.updateOrderStatus(orderId, '已完成');
  },

  // 删除订单
  onDeleteOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;
    var tableNo = e.currentTarget.dataset.table;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除桌号' + tableNo + '的订单吗？此操作不可撤销，用户端也会同步删除。',
      confirmText: '确认删除',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          that._doDeleteOrder(orderId);
        }
      }
    });
  },

  // 执行删除订单操作
  _doDeleteOrder: function (orderId) {
    var that = this;
    var db = app.getDB();

    wx.showLoading({ title: '删除中...', mask: true });

    // 删除云数据库中的订单
    db.collection('orders').doc(orderId).remove({
      success: function () {
        wx.hideLoading();
        wx.showToast({
          title: '订单已删除',
          icon: 'success'
        });
        
        // 重新加载订单列表
        that.loadOrders();
        
        console.log('订单删除成功，ID:', orderId);
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('删除订单失败:', err);
        
        var errorMsg = '删除失败';
        if (err.errMsg) {
          if (err.errMsg.includes('PERMISSION')) {
            errorMsg = '权限不足，无法删除订单';
          }
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
      }
    });
  },

  // 查看订单详情
  onOrderDetail: function (e) {
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
        items += '\n';
      }
    }

    wx.showModal({
      title: '订单详情 - 桌号' + order.tableNo,
      content: '订单号：' + order.orderId + '\n\n商品清单：\n' + items + '\n\n合计：¥' + order.totalPrice + '\n状态：' + order.status + '\n备注：' + (order.remark || '无') + '\n下单时间：' + order.createTimeStr,
      showCancel: false,
      confirmText: '关闭'
    });
  },

  // 手动刷新
  onRefresh: function () {
    if (this.data.currentPage === 'orders') {
      this.loadOrders();
    } else if (this.data.currentPage === 'menu') {
      this.loadMenuData();
    } else if (this.data.currentPage === 'suggestions') {
      this.loadSuggestions();
    }
    wx.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1000
    });
  },

  // ========== 页面切换 ==========

  // 切换到订单管理
  onSwitchToOrders: function () {
    this.setData({ currentPage: 'orders' });
    this.loadOrders();
  },

  // 切换到菜品管理
  onSwitchToMenu: function () {
    this.setData({ currentPage: 'menu' });
    this.loadMenuData();
  },

  // 切换到菜品建议
  onSwitchToSuggestions: function () {
    this.setData({ currentPage: 'suggestions' });
    this.loadSuggestions();
  },

  // 切换到设置页面
  onSwitchToSettings: function () {
    this.setData({ currentPage: 'settings' });
  },

  // ========== 菜品管理功能 ==========

  // 加载菜品和分类数据
  loadMenuData: function () {
    var that = this;
    that.setData({ menuLoading: true });
    that.loadMenuCategories();
    that.loadMenuItems();
  },

  // 加载分类
  loadMenuCategories: function () {
    var that = this;
    var db = app.getDB();

    db.collection('categories')
      .orderBy('id', 'asc')
      .limit(50)
      .get({
        success: function (res) {
          that.setData({ categories: res.data });
        },
        fail: function (err) {
          console.error('加载分类失败', err);
          // 降级用本地数据
          that.setData({ categories: app.globalData.categories });
        }
      });
  },

  // 加载菜品
  loadMenuItems: function () {
    var that = this;
    var db = app.getDB();

    db.collection('menu')
      .orderBy('categoryId', 'asc')
      .orderBy('id', 'asc')
      .limit(100)
      .get({
        success: function (res) {
          that.setData({
            menuList: res.data,
            menuLoading: false
          });
        },
        fail: function (err) {
          console.error('加载菜品失败', err);
          that.setData({
            menuList: app.globalData.menuList,
            menuLoading: false
          });
        }
      });
  },

  // ---- 添加菜品 ----

  // 显示添加菜品弹窗
  onShowAddDish: function () {
    this.setData({
      showAddDishPopup: true,
      newDishName: '',
      newDishPrice: '',
      newDishDesc: '',
      newDishCategoryId: this.data.categories.length > 0 ? this.data.categories[0].id : 1
    });
  },

  // 隐藏添加菜品弹窗
  onHideAddDish: function () {
    this.setData({ showAddDishPopup: false });
  },

  onNewDishNameInput: function (e) {
    this.setData({ newDishName: e.detail.value });
  },

  onNewDishPriceInput: function (e) {
    this.setData({ newDishPrice: e.detail.value });
  },

  onNewDishDescInput: function (e) {
    this.setData({ newDishDesc: e.detail.value });
  },

  onNewDishCategoryChange: function (e) {
    var index = parseInt(e.detail.value);
    var categories = this.data.categories;
    if (categories[index]) {
      this.setData({ newDishCategoryId: categories[index].id });
    }
  },

  // 确认添加菜品到云数据库
  onConfirmAddDish: function () {
    var that = this;
    var name = this.data.newDishName.trim();
    var priceStr = this.data.newDishPrice.trim();
    var desc = this.data.newDishDesc.trim();
    var categoryId = this.data.newDishCategoryId;

    if (!name) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }
    if (!priceStr) {
      wx.showToast({ title: '请输入菜品价格', icon: 'none' });
      return;
    }

    var price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...', mask: true });

    var db = app.getDB();
    var newId = categoryId * 100 + Date.now() % 100;

    db.collection('menu').add({
      data: {
        id: newId,
        categoryId: categoryId,
        name: name,
        price: price,
        image: '',
        description: desc || '新增菜品',
        sales: 0,
        isAvailable: true,
        createTime: db.serverDate()
      },
      success: function () {
        wx.hideLoading();
        wx.showToast({ title: '菜品添加成功', icon: 'success' });
        that.setData({ showAddDishPopup: false });
        that.loadMenuItems();
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('添加菜品失败', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  // 删除菜品
  onDeleteDish: function (e) {
    var that = this;
    var dishId = e.currentTarget.dataset.id;
    var dishName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除「' + dishName + '」吗？删除后顾客将无法看到该菜品。',
      success: function (res) {
        if (res.confirm) {
          that._doDeleteDish(dishId);
        }
      }
    });
  },

  _doDeleteDish: function (dishId) {
    var that = this;
    var db = app.getDB();

    wx.showLoading({ title: '删除中...', mask: true });

    db.collection('menu').doc(dishId).remove({
      success: function () {
        wx.hideLoading();
        wx.showToast({ title: '已删除', icon: 'success' });
        that.loadMenuItems();
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('删除菜品失败', err);
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    });
  },

  // ---- 添加分类 ----

  onShowAddCategory: function () {
    this.setData({
      showAddCategoryPopup: true,
      newCategoryName: '',
      newCategoryIcon: ''
    });
  },

  onHideAddCategory: function () {
    this.setData({ showAddCategoryPopup: false });
  },

  onNewCategoryNameInput: function (e) {
    this.setData({ newCategoryName: e.detail.value });
  },

  onNewCategoryIconInput: function (e) {
    this.setData({ newCategoryIcon: e.detail.value });
  },

  // 确认添加分类
  onConfirmAddCategory: function () {
    var that = this;
    var name = this.data.newCategoryName.trim();
    var icon = this.data.newCategoryIcon.trim() || '🍽️';

    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...', mask: true });

    // 生成新的分类ID
    var categories = this.data.categories;
    var maxId = 0;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id > maxId) {
        maxId = categories[i].id;
      }
    }
    var newId = maxId + 1;

    var db = app.getDB();
    db.collection('categories').add({
      data: {
        id: newId,
        name: name,
        icon: icon
      },
      success: function () {
        wx.hideLoading();
        wx.showToast({ title: '分类添加成功', icon: 'success' });
        that.setData({ showAddCategoryPopup: false });
        that.loadMenuCategories();
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('添加分类失败', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  // 删除分类
  onDeleteCategory: function (e) {
    var that = this;
    var catId = e.currentTarget.dataset.id;
    var catName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认删除',
      content: '删除分类「' + catName + '」后，该分类下的菜品不会被删除，但顾客将无法通过分类查看。',
      success: function (res) {
        if (res.confirm) {
          that._doDeleteCategory(catId);
        }
      }
    });
  },

  _doDeleteCategory: function (catId) {
    var that = this;
    var db = app.getDB();

    wx.showLoading({ title: '删除中...', mask: true });

    db.collection('categories').doc(catId).remove({
      success: function () {
        wx.hideLoading();
        wx.showToast({ title: '已删除', icon: 'success' });
        that.loadMenuCategories();
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('删除分类失败', err);
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    });
  },

  // ========== 菜品建议管理 ==========

  // 加载所有菜品建议
  loadSuggestions: function () {
    var that = this;
    that.setData({ suggestionLoading: true });
    var db = app.getDB();

    db.collection('dish_suggestions')
      .orderBy('createTime', 'desc')
      .limit(50)
      .get({
        success: function (res) {
          that.setData({
            suggestionList: res.data,
            suggestionLoading: false
          });
        },
        fail: function (err) {
          console.error('加载菜品建议失败', err);
          that.setData({ suggestionLoading: false });
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      });
  },

  // 显示采纳上架弹窗
  onShowApproveSuggestion: function (e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    var desc = e.currentTarget.dataset.desc;
    this.setData({
      showApproveSuggestionPopup: true,
      approvingSuggestion: { _id: id, name: name, description: desc },
      approveDishPrice: '',
      approveDishCategoryId: this.data.categories.length > 0 ? this.data.categories[0].id : 1
    });
    // 确保分类数据已加载
    if (this.data.categories.length === 0) {
      this.loadMenuCategories();
    }
  },

  onHideApproveSuggestion: function () {
    this.setData({ showApproveSuggestionPopup: false });
  },

  // 修改采纳菜品名称
  onApproveDishNameInput: function (e) {
    this.setData({
      'approvingSuggestion.name': e.detail.value
    });
  },

  onApprovePriceInput: function (e) {
    this.setData({ approveDishPrice: e.detail.value });
  },

  onApproveCategoryChange: function (e) {
    var index = parseInt(e.detail.value);
    var categories = this.data.categories;
    if (categories[index]) {
      this.setData({ approveDishCategoryId: categories[index].id });
    }
  },

  // 确认采纳上架
  onConfirmApproveSuggestion: function () {
    var that = this;
    var suggestion = this.data.approvingSuggestion;
    var priceStr = this.data.approveDishPrice.trim();
    var categoryId = this.data.approveDishCategoryId;

    if (!priceStr) {
      wx.showToast({ title: '请输入价格', icon: 'none' });
      return;
    }

    var price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '上架中...', mask: true });

    var db = app.getDB();
    var newId = categoryId * 100 + Date.now() % 100;

    var dishName = suggestion.name ? suggestion.name.trim() : '';
    if (!dishName) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }

    // 1. 添加菜品到menu集合
    db.collection('menu').add({
      data: {
        id: newId,
        categoryId: categoryId,
        name: dishName,
        price: price,
        image: '',
        description: suggestion.description || '顾客推荐菜品',
        sales: 0,
        isAvailable: true,
        fromSuggestion: true,
        createTime: db.serverDate()
      },
      success: function () {
        // 2. 更新建议状态为"已上架"
        db.collection('dish_suggestions').doc(suggestion._id).update({
          data: { status: '已上架' },
          success: function () {
            wx.hideLoading();
            wx.showToast({ title: '已采纳上架', icon: 'success' });
            that.setData({ showApproveSuggestionPopup: false });
            that.loadSuggestions();
          },
          fail: function () {
            wx.hideLoading();
            wx.showToast({ title: '菜品已添加，建议状态更新失败', icon: 'none' });
            that.setData({ showApproveSuggestionPopup: false });
            that.loadSuggestions();
          }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('上架菜品失败', err);
        wx.showToast({ title: '上架失败', icon: 'none' });
      }
    });
  },

  // 忽略建议
  onIgnoreSuggestion: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认忽略',
      content: '确定忽略这条菜品建议吗？',
      success: function (res) {
        if (res.confirm) {
          var db = app.getDB();
          db.collection('dish_suggestions').doc(id).update({
            data: { status: '已忽略' },
            success: function () {
              wx.showToast({ title: '已忽略', icon: 'success' });
              that.loadSuggestions();
            },
            fail: function (err) {
              console.error('更新建议状态失败', err);
              wx.showToast({ title: '操作失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 阻止事件冒泡
  onStopPropagation: function () {
    // 空函数
  },

  // ========== 数据清理功能 ==========

  // 清理重复数据
  onCleanupData: function () {
    var that = this;
    wx.showModal({
      title: '数据清理',
      content: '这将清理云端重复的菜品和分类数据，确定继续吗？',
      success: function (res) {
        if (res.confirm) {
          that._doCleanupData();
        }
      }
    });
  },

  _doCleanupData: function () {
    var that = this;
    wx.showLoading({ title: '清理中...', mask: true });

    // 清理重复菜品
    wx.cloud.callFunction({
      name: 'cleanupData',
      data: { action: 'cleanupMenu' },
      success: function (menuRes) {
        console.log('菜品清理结果:', menuRes);

        // 清理重复分类
        wx.cloud.callFunction({
          name: 'cleanupData',
          data: { action: 'cleanupCategories' },
          success: function (catRes) {
            wx.hideLoading();
            console.log('分类清理结果:', catRes);

            var menuResult = menuRes.result;
            var catResult = catRes.result;

            wx.showModal({
              title: '清理完成',
              content: '菜品：' + (menuResult.success ? '删除了 ' + menuResult.deleted + ' 条重复数据' : '清理失败') + '\n' +
                       '分类：' + (catResult.success ? '删除了 ' + catResult.deleted + ' 条重复数据' : '清理失败') + '\n\n' +
                       '请重新进入小程序查看效果。',
              showCancel: false
            });

            // 刷新数据
            that.loadMenu();
            that.loadMenuCategories();
          },
          fail: function (err) {
            wx.hideLoading();
            console.error('清理分类失败:', err);
            wx.showToast({ title: '清理失败', icon: 'none' });
          }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('清理菜品失败:', err);
        wx.showToast({ title: '清理失败', icon: 'none' });
      }
    });
  }
});
