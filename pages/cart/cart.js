// pages/cart/cart.js
var app = getApp();

Page({
  data: {
    cart: [],
    totalPrice: 0,
    totalCount: 0
  },

  onShow: function () {
    this.updateCartData();
  },

  // 更新购物车数据
  updateCartData: function () {
    this.setData({
      cart: app.globalData.cart,
      totalPrice: app.getCartTotalPrice(),
      totalCount: app.getCartTotalCount()
    });
  },

  // 添加商品
  onAddItem: function (e) {
    var item = e.currentTarget.dataset.item;
    app.addToCart(item);
    this.updateCartData();
  },

  // 减少商品
  onReduceItem: function (e) {
    var itemId = e.currentTarget.dataset.id;
    app.reduceFromCart(itemId);
    this.updateCartData();
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
      this.updateCartData();
    }
  },

  // 去结算
  onGoCheckout: function () {
    if (this.data.totalCount === 0) {
      wx.showToast({
        title: '购物车是空的哦',
        icon: 'none'
      });
      return;
    }

    // 检查登录状态
    if (!app.checkLogin()) {
      return;
    }

    wx.navigateTo({
      url: '/pages/order/order'
    });
  },

  // 去点餐
  onGoOrder: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
