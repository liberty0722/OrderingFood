// pages/index/index.js
var app = getApp();

Page({
  data: {
    categories: [],
    currentCategoryId: 1,
    menuList: [],
    filteredMenu: [],
    cartTotalCount: 0,
    cartTotalPrice: 0,
    showCartPopup: false,
    cart: [],
    // 自定义菜品弹窗
    showCustomDishPopup: false,
    customDishName: '',
    customDishDesc: '',
    // 我的菜品建议
    showSuggestionList: false,
    suggestionList: [],
    // 当前分类信息
    currentCategoryName: '热销推荐',
    currentCategoryIcon: '🔥'
  },

  onLoad: function () {
    // 从云端加载数据（包含分类和菜品）
    this.loadCloudMenu();
  },

  onShow: function () {
    this.updateCartInfo();
    // 每次显示时刷新云端菜品（商家可能已修改）
    this.loadCloudMenu();
  },

  // 从云端加载菜品数据
  loadCloudMenu: function () {
    var that = this;
    app.loadCategoriesFromCloud(function (err, categories) {
      if (!err && categories && categories.length > 0) {
        that.setData({ categories: categories });
      }
    });
    app.loadMenuFromCloud(function (err, menuList) {
      if (!err && menuList && menuList.length > 0) {
        that.setData({ menuList: menuList });
        that.filterMenu(that.data.currentCategoryId);
      }
    });
  },

  // 切换分类
  onCategoryTap: function (e) {
    var categoryId = e.currentTarget.dataset.id;
    this.setData({
      currentCategoryId: categoryId
    });
    this.filterMenu(categoryId);
  },

    // 根据分类过滤菜品
  filterMenu: function (categoryId) {
    var menuList = this.data.menuList;
    var filtered = [];
    for (var i = 0; i < menuList.length; i++) {
      if (menuList[i].categoryId === categoryId) {
        var item = menuList[i];
        item.count = app.getItemCount(item.id);
        filtered.push(item);
      }
    }
    // 找到当前分类名称
    var categories = this.data.categories;
    var currentCategoryName = '';
    var currentCategoryIcon = '';
    for (var j = 0; j < categories.length; j++) {
      if (categories[j].id === categoryId) {
        currentCategoryName = categories[j].name;
        currentCategoryIcon = categories[j].icon;
        break;
      }
    }
    this.setData({
      filteredMenu: filtered,
      currentCategoryName: currentCategoryName,
      currentCategoryIcon: currentCategoryIcon
    });
  },

  // 添加商品
  onAddItem: function (e) {
    var item = e.currentTarget.dataset.item;
    app.addToCart(item);
    this.updateCartInfo();
    this.filterMenu(this.data.currentCategoryId);
  },

  // 减少商品
  onReduceItem: function (e) {
    var itemId = e.currentTarget.dataset.id;
    app.reduceFromCart(itemId);
    this.updateCartInfo();
    this.filterMenu(this.data.currentCategoryId);
  },

  // 更新购物车信息
  updateCartInfo: function () {
    this.setData({
      cartTotalCount: app.getCartTotalCount(),
      cartTotalPrice: app.getCartTotalPrice(),
      cart: app.globalData.cart
    });
  },

  // 显示/隐藏购物车弹窗
  onToggleCartPopup: function () {
    if (this.data.cartTotalCount === 0) return;
    this.setData({
      showCartPopup: !this.data.showCartPopup
    });
  },

  // 隐藏购物车弹窗
  onHideCartPopup: function () {
    this.setData({
      showCartPopup: false
    });
  },

  // 清空购物车
  onClearCart: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空购物车吗？',
      success: this._handleClearCartConfirm
    });
  },

  _handleClearCartConfirm: function (res) {
    if (res.confirm) {
      app.clearCart();
      this.updateCartInfo();
      this.filterMenu(this.data.currentCategoryId);
      this.setData({
        showCartPopup: false
      });
    }
  },

  // 弹窗中添加商品
  onPopupAddItem: function (e) {
    var item = e.currentTarget.dataset.item;
    app.addToCart(item);
    this.updateCartInfo();
    this.filterMenu(this.data.currentCategoryId);
  },

  // 弹窗中减少商品
  onPopupReduceItem: function (e) {
    var itemId = e.currentTarget.dataset.id;
    app.reduceFromCart(itemId);
    this.updateCartInfo();
    this.filterMenu(this.data.currentCategoryId);
    if (app.getCartTotalCount() === 0) {
      this.setData({ showCartPopup: false });
    }
  },

  // 去结算
  onGoCheckout: function () {
    if (this.data.cartTotalCount === 0) return;
    wx.navigateTo({
      url: '/pages/order/order'
    });
  },

  // ========== 自定义菜品功能 ==========

  // 显示自定义菜品弹窗
  onShowCustomDish: function () {
    this.setData({
      showCustomDishPopup: true,
      customDishName: '',
      customDishDesc: ''
    });
  },

  // 隐藏自定义菜品弹窗
  onHideCustomDish: function () {
    this.setData({
      showCustomDishPopup: false
    });
  },

  // 输入自定义菜品名称
  onCustomDishNameInput: function (e) {
    this.setData({
      customDishName: e.detail.value
    });
  },

  // 输入自定义菜品描述
  onCustomDishDescInput: function (e) {
    this.setData({
      customDishDesc: e.detail.value
    });
  },

  // 确认提交菜品建议给商家
  onConfirmCustomDish: function () {
    var that = this;
    var name = this.data.customDishName.trim();
    var desc = this.data.customDishDesc.trim();

    if (!name) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...', mask: true });

    var db = app.getDB();
    db.collection('dish_suggestions').add({
      data: {
        name: name,
        description: desc || '',
        status: '待审核',  // 待审核 / 已上架 / 已忽略
        createTime: db.serverDate(),
        createTimeStr: that._formatTime(new Date())
      },
      success: function () {
        wx.hideLoading();
        wx.showToast({
          title: '已提交给商家',
          icon: 'success',
          duration: 2000
        });
        that.setData({
          showCustomDishPopup: false,
          customDishName: '',
          customDishDesc: ''
        });
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('提交菜品建议失败', err);
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 查看我的菜品建议
  onShowSuggestionList: function () {
    var that = this;
    that.setData({ showSuggestionList: true });
    that.loadMySuggestions();
  },

  // 隐藏建议列表
  onHideSuggestionList: function () {
    this.setData({ showSuggestionList: false });
  },

  // 加载我的菜品建议
  loadMySuggestions: function () {
    var that = this;
    var db = app.getDB();
    db.collection('dish_suggestions')
      .orderBy('createTime', 'desc')
      .limit(20)
      .get({
        success: function (res) {
          that.setData({ suggestionList: res.data });
        },
        fail: function (err) {
          console.error('获取建议列表失败', err);
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
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return year + '-' + pad(month) + '-' + pad(day) + ' ' + pad(hour) + ':' + pad(minute);
  },

  // 阻止事件冒泡
  onStopPropagation: function () {
    // 空函数，用于阻止冒泡
  }
});
