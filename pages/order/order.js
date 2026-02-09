// pages/order/order.js
var app = getApp();

Page({
  data: {
    cart: [],
    totalPrice: 0,
    totalCount: 0,
    tableNo: '',
    remark: '',
    submitting: false
  },

  onLoad: function () {
    // 检查登录状态
    if (!app.checkLogin()) {
      wx.navigateBack();
      return;
    }

    this.setData({
      cart: app.globalData.cart,
      totalPrice: app.getCartTotalPrice(),
      totalCount: app.getCartTotalCount()
    });
  },

  // 输入桌号
  onTableNoInput: function (e) {
    this.setData({
      tableNo: e.detail.value
    });
  },

  // 输入备注
  onRemarkInput: function (e) {
    this.setData({
      remark: e.detail.value
    });
  },

  // 提交订单
  onSubmitOrder: function () {
    if (!this.data.tableNo) {
      wx.showToast({
        title: '请输入桌号',
        icon: 'none'
      });
      return;
    }

    if (this.data.totalCount === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      return;
    }

    if (this.data.submitting) return;

    wx.showModal({
      title: '确认下单',
      content: '桌号：' + this.data.tableNo + '\n共' + this.data.totalCount + '件商品，合计¥' + this.data.totalPrice,
      success: this._handleSubmitConfirm
    });
  },

  _handleSubmitConfirm: function (res) {
    if (res.confirm) {
      var that = this;
      that.setData({ submitting: true });

      wx.showLoading({
        title: '提交订单中...',
        mask: true
      });

      // 调用云数据库创建订单
      app.createOrder(
        that.data.cart,
        that.data.totalPrice,
        that.data.tableNo,
        that.data.remark,
        function (err, order) {
          wx.hideLoading();
          that.setData({ submitting: false });

          if (err) {
            wx.showToast({
              title: '下单失败，请重试',
              icon: 'none'
            });
            return;
          }

          wx.showToast({
            title: '下单成功！',
            icon: 'success',
            duration: 1500
          });
          setTimeout(function () {
            wx.switchTab({
              url: '/pages/mine/mine'
            });
          }, 1500);
        }
      );
    }
  }
});
