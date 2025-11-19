Page({
  data: {
    canteenText: '食堂',
    windowText: '档口',
    typeText: '餐别',
    lastUpdate: '2025-11-05 12:00:00',
    dishes: []
  },

  onLoad() {
    this.loadMockDishes();
  },

  loadMockDishes() {
    this.setData({
      dishes: [
        {
          id: 1,
          name: '冒烤鸭',
          location: '桃李园 · 二楼麻辣烫窗口',
          kcal: 520,
          protein: 18,
          price: 18,
          tags: [],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 2,
          name: '椰子鸡套餐',
          location: '紫荆园 · 二楼海南鸡饭窗口',
          kcal: 480,
          protein: 22,
          price: 20,
          tags: [],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 3,
          name: '宫保鸡丁',
          location: '桃李园 · 二楼自选窗口',
          kcal: 550,
          protein: 20,
          price: 15,
          tags: [],
          rating: 2,
          collected: false,
          blocked: false
        },
        {
          id: 4,
          name: '番茄炒蛋',
          location: '桃李园 · 二楼自选窗口',
          kcal: 320,
          protein: 15,
          price: 3,
          tags: [],
          rating: 5,
          collected: false,
          blocked: false
        }
      ]
    });
  },

  // 顶部 推荐 / 菜单 tab
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'recommend') {
      wx.redirectTo({
        url: '/pages/meal/recommend/recommend'
      });
    }
  },

  // 下面三个筛选先简单弹个提示，后面可以换成弹窗/下拉
  onCanteenTap() {
    wx.showToast({
      title: '选择食堂（待实现）',
      icon: 'none'
    });
  },

  onWindowTap() {
    wx.showToast({
      title: '选择档口（待实现）',
      icon: 'none'
    });
  },

  onTypeTap() {
    wx.showToast({
      title: '选择餐别（待实现）',
      icon: 'none'
    });
  },

  // 子组件事件：加入饮食
  onAddMeal(e) {
    const { index } = e.detail;
    const dish = this.data.dishes[index];
    console.log('菜单页加入饮食：', dish);
    wx.showToast({
      title: '已加入今日饮食',
      icon: 'success'
    });
  },

  onLikeDish(e) {
    const { index } = e.detail;
    const key = `dishes[${index}].collected`;
    this.setData({
      [key]: !this.data.dishes[index].collected
    });
  },

  onBlockDish(e) {
    const { index } = e.detail;
    const key = `dishes[${index}].blocked`;
    this.setData({
      [key]: !this.data.dishes[index].blocked
    });
  },

  onRateDish(e) {
    const { index, score } = e.detail;
    const key = `dishes[${index}].rating`;
    this.setData({
      [key]: score
    });
  }
});
