// pages/meal/recommend/recommend.js
Page({
  data: {
    activeTab: 'recommend',

    // 下拉筛选
    dropdownVisible: false,
    activeFilter: '',
    dropdownOptions: [],
    currentDropdownSelected: '',

    filterOptions: {
      taste: ['不辣', '微辣', '中辣', '重辣', '素食', '清真'],
      nutrition: ['低脂', '高蛋白', '高纤维'],
      price: ['≤5元', '≤10元', '≤15元'],
      time: ['早餐', '午餐', '晚餐', '宵夜']
    },

    selectedFilters: {
      taste: '不辣',
      nutrition: '低脂',
      price: '≤5元',
      time: '午餐'
    },

    // 横向滚动标签
    quickTags: [
      { value: 'breakfast', label: '早餐' },
      { value: 'lunch', label: '午餐' },
      { value: 'dinner', label: '晚餐' },
      { value: 'lowfat', label: '低脂' },
      { value: 'mild', label: '微辣' },
      { value: 'lt5', label: '≤5元' },
      { value: 'lt10', label: '≤10元' },
      { value: 'lt500', label: '≤500 kcal' },
      { value: 'lt700', label: '≤700 kcal' }
    ],
    activeQuickTag: 'lunch',

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
          name: '番茄炒蛋',
          location: '桃李园 · 二楼自选窗口',
          kcal: 320,
          protein: 15,
          price: 3,
          tags: ['减脂推荐', '学生最爱'],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 2,
          name: '鸡胸肉沙拉',
          location: '紫荆园 · 三楼轻食窗口',
          kcal: 280,
          protein: 25,
          price: 15,
          tags: ['减脂推荐', '高蛋白'],
          rating: 2,
          collected: false,
          blocked: false
        }
      ]
    });
  },

  // 推荐 / 菜单
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'menu') {
      wx.navigateTo({
        url: '/pages/meal/menu/menu'
      });
      return;
    }
    this.setData({ activeTab: tab });
  },

  // 点击“口味 / 营养 / 价格 / 时段”
  onFilterHeaderTap(e) {
    const type = e.currentTarget.dataset.type;
    const { dropdownVisible, activeFilter, filterOptions, selectedFilters } = this.data;

    const visible = !(dropdownVisible && activeFilter === type);

    this.setData({
      dropdownVisible: visible,
      activeFilter: type,
      dropdownOptions: visible ? filterOptions[type] : [],
      currentDropdownSelected: visible ? selectedFilters[type] : ''
    });
  },

  // 下拉选项点击
  onDropdownOptionTap(e) {
    const value = e.currentTarget.dataset.value;
    const { activeFilter, selectedFilters } = this.data;

    selectedFilters[activeFilter] = value;

    this.setData({
      selectedFilters,
      dropdownVisible: false,
      dropdownOptions: [],
      currentDropdownSelected: value
    });
  },

  // 横向 tag 点击
  onQuickTagTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      activeQuickTag: value
    });
  },

  // 一键生成今日推荐
  onGenerate() {
    const dishes = this.data.dishes.map(d => ({
      ...d,
      rating: Math.floor(Math.random() * 5) + 1
    }));
    this.setData({ dishes });
  },

  // dish-card 事件
  onAddMeal(e) {
    const { index } = e.detail;
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
  },

  // 左侧悬浮按钮
  onOpenFavorites() {
    wx.showToast({
      title: '打开收藏列表（待实现）',
      icon: 'none'
    });
  },

  onOpenBlockList() {
    wx.showToast({
      title: '打开黑名单（待实现）',
      icon: 'none'
    });
  }
});
