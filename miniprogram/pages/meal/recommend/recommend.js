// pages/meal/recommend/recommend.js
Page({
  data: {
    // 顶部推荐 / 菜单
    activeTab: 'recommend',

    // ===== 推荐 Tab：筛选相关 =====
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
      taste: '',
      nutrition: '',
      price: '',
      time: ''
    },

    // ===== 弹窗相关 =====
    modalVisible: false,
    modalType: '', // 'favorites' | 'blocked'
    favoriteDishes: [],
    blockedDishes: [],
    // 菜品详情弹窗
    detailModalVisible: false,
    detailDish: null,
    // 菜品详情弹窗
    detailModalVisible: false,
    detailDish: null,

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

    // 推荐 Tab 的菜品
    recommendDishes: [],

    // ===== 菜单 Tab：筛选相关 =====
    menuDropdownVisible: false,
    activeMenuFilter: '', // 'canteen' | 'window' | 'type'
    menuDropdownOptions: [],
    currentMenuDropdownSelected: '',
    menuFilterRowFixed: false, // 筛选栏是否固定
    
    // 菜单筛选选项
    menuFilterOptions: {
      canteen: [
        {
          category: '学生食堂',
          items: ['紫荆园', '桃李园', '清芬园', '听涛园', '融园', '丁香园', '闻馨园', '双清园']
        },
        {
          category: '教工餐厅',
          items: ['观畴园', '教师餐厅', '芝兰园', '澜园', '寓园', '荷园', '家园', '北园', '南园']
        },
        {
          category: '特色餐厅',
          items: ['清青快餐', '清青休闲', '清青永和', '清青小火锅', '清青披萨', '清青咖啡', '清青牛拉', '面包坊', '玉树园', '熙春园']
        }
      ],
      window: ['自选窗口', '川菜窗口', '粤菜窗口', '面食窗口', '麻辣烫窗口', '轻食窗口', '海鲜窗口', '海南鸡饭窗口', '清真窗口', '汤品窗口'],
      type: ['早餐', '午餐', '晚餐', '宵夜']
    },
    
    selectedMenuFilters: {
      canteen: '',
      window: '',
      type: ''
    },
    
    canteenText: '食堂',
    windowText: '档口',
    typeText: '餐别',
    lastUpdate: '2025-11-05 12:00:00',
    menuDishes: []
  },

  onLoad() {
    this.loadMockRecommendDishes();
    this.loadMockMenuDishes();
  },

  // 推荐 Tab 的 mock 数据
  loadMockRecommendDishes() {
    this.setData({
      recommendDishes: [
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
        },
        {
          id: 3,
          name: '红烧肉',
          location: '桃李园 · 二楼自选窗口',
          kcal: 450,
          protein: 20,
          price: 12,
          tags: ['经典菜品'],
          rating: 5,
          collected: false,
          blocked: false
        },
        {
          id: 4,
          name: '清蒸鱼',
          location: '紫荆园 · 二楼海鲜窗口',
          kcal: 200,
          protein: 30,
          price: 18,
          tags: ['高蛋白', '低脂'],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 5,
          name: '麻婆豆腐',
          location: '桃李园 · 二楼川菜窗口',
          kcal: 180,
          protein: 12,
          price: 8,
          tags: ['素食', '微辣'],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 6,
          name: '糖醋里脊',
          location: '紫荆园 · 二楼自选窗口',
          kcal: 380,
          protein: 22,
          price: 14,
          tags: ['学生最爱'],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 7,
          name: '蒜蓉西兰花',
          location: '桃李园 · 二楼自选窗口',
          kcal: 120,
          protein: 8,
          price: 6,
          tags: ['素食', '低脂'],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 8,
          name: '宫保鸡丁',
          location: '紫荆园 · 二楼川菜窗口',
          kcal: 350,
          protein: 25,
          price: 16,
          tags: ['中辣'],
          rating: 4,
          collected: false,
          blocked: false
        }
      ]
    });
  },

  // 菜单 Tab 的 mock 数据
  loadMockMenuDishes() {
    this.setData({
      menuDishes: [
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
        },
        {
          id: 5,
          name: '水煮肉片',
          location: '紫荆园 · 二楼川菜窗口',
          kcal: 420,
          protein: 28,
          price: 22,
          tags: [],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 6,
          name: '干煸豆角',
          location: '桃李园 · 二楼自选窗口',
          kcal: 250,
          protein: 10,
          price: 10,
          tags: [],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 7,
          name: '白切鸡',
          location: '紫荆园 · 二楼海南鸡饭窗口',
          kcal: 300,
          protein: 35,
          price: 16,
          tags: [],
          rating: 5,
          collected: false,
          blocked: false
        },
        {
          id: 8,
          name: '鱼香肉丝',
          location: '桃李园 · 二楼川菜窗口',
          kcal: 380,
          protein: 20,
          price: 14,
          tags: [],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 9,
          name: '回锅肉',
          location: '紫荆园 · 二楼川菜窗口',
          kcal: 420,
          protein: 18,
          price: 16,
          tags: [],
          rating: 5,
          collected: false,
          blocked: false
        },
        {
          id: 10,
          name: '酸菜鱼',
          location: '桃李园 · 二楼川菜窗口',
          kcal: 350,
          protein: 28,
          price: 22,
          tags: [],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 11,
          name: '青椒土豆丝',
          location: '紫荆园 · 二楼自选窗口',
          kcal: 150,
          protein: 5,
          price: 6,
          tags: [],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 12,
          name: '红烧茄子',
          location: '桃李园 · 二楼自选窗口',
          kcal: 200,
          protein: 8,
          price: 8,
          tags: [],
          rating: 4,
          collected: false,
          blocked: false
        },
        {
          id: 13,
          name: '糖醋排骨',
          location: '紫荆园 · 二楼自选窗口',
          kcal: 450,
          protein: 25,
          price: 18,
          tags: [],
          rating: 5,
          collected: false,
          blocked: false
        },
        {
          id: 14,
          name: '凉拌黄瓜',
          location: '桃李园 · 二楼自选窗口',
          kcal: 50,
          protein: 2,
          price: 4,
          tags: [],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 15,
          name: '蒜蓉生菜',
          location: '紫荆园 · 二楼自选窗口',
          kcal: 80,
          protein: 3,
          price: 5,
          tags: [],
          rating: 3,
          collected: false,
          blocked: false
        },
        {
          id: 16,
          name: '红烧狮子头',
          location: '桃李园 · 二楼自选窗口',
          kcal: 500,
          protein: 30,
          price: 20,
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
    this.setData({ activeTab: tab });
  },

  // ==== 推荐 Tab：筛选区 ====
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

  onDropdownOptionTap(e) {
    const value = e.currentTarget.dataset.value;
    const { activeFilter, selectedFilters } = this.data;

    // 如果点击的是已选中的选项，则取消选择
    if (selectedFilters[activeFilter] === value) {
      selectedFilters[activeFilter] = '';
    } else {
      selectedFilters[activeFilter] = value;
    }

    this.setData({
      selectedFilters,
      dropdownVisible: false,
      dropdownOptions: [],
      currentDropdownSelected: selectedFilters[activeFilter]
    });
  },

  onQuickTagTap(e) {
    const value = e.currentTarget.dataset.value;
    const { quickTags, selectedFilters } = this.data;
    
    // 找到对应的标签信息
    const tag = quickTags.find(t => t.value === value);
    if (!tag) return;

    // 建立 quickTags 到 selectedFilters 的映射关系
    const tagToFilterMap = {
      'breakfast': { type: 'time', value: '早餐' },
      'lunch': { type: 'time', value: '午餐' },
      'dinner': { type: 'time', value: '晚餐' },
      'lowfat': { type: 'nutrition', value: '低脂' },
      'mild': { type: 'taste', value: '微辣' },
      'lt5': { type: 'price', value: '≤5元' },
      'lt10': { type: 'price', value: '≤10元' }
    };

    const filterMap = tagToFilterMap[value];
    if (filterMap) {
      // 如果点击的标签对应的筛选条件已经选中，则取消选择
      if (selectedFilters[filterMap.type] === filterMap.value) {
        selectedFilters[filterMap.type] = '';
        this.setData({
          selectedFilters,
          activeQuickTag: ''
        });
      } else {
        // 否则设置对应的筛选条件
        selectedFilters[filterMap.type] = filterMap.value;
        this.setData({
          selectedFilters,
          activeQuickTag: value
        });
      }
    } else {
      // 对于没有映射关系的标签（如 lt500, lt700），只切换 activeQuickTag
      const newActiveTag = this.data.activeQuickTag === value ? '' : value;
      this.setData({
        activeQuickTag: newActiveTag
      });
    }
  },

  // 一键生成今日推荐
  onGenerate() {
    const recommendDishes = this.data.recommendDishes.map(d => ({
      ...d,
      rating: Math.floor(Math.random() * 5) + 1
    }));
    this.setData({ recommendDishes });
  },

  // ==== 推荐 Tab：dish-card 事件 ====
  onAddMealFromRecommend(e) {
    const { index } = e.detail;
    const dish = this.data.recommendDishes[index];
    console.log('推荐页加入饮食：', dish);
    wx.showToast({
      title: '已加入今日饮食',
      icon: 'success'
    });
  },

  onLikeDishFromRecommend(e) {
    const { index } = e.detail;
    const key = `recommendDishes[${index}].collected`;
    this.setData({
      [key]: !this.data.recommendDishes[index].collected
    });
  },

  onBlockDishFromRecommend(e) {
    const { index } = e.detail;
    const dish = this.data.recommendDishes[index];
    const key = `recommendDishes[${index}].blocked`;
    const newBlockedState = !dish.blocked;
    
    this.setData({
      [key]: newBlockedState
    });
    
    // 如果加入黑名单，显示提示
    if (newBlockedState) {
      wx.showToast({
        title: '已加入黑名单',
        icon: 'success',
        duration: 1500
      });
    }
  },

  onRateDishFromRecommend(e) {
    const { index, score } = e.detail;
    const key = `recommendDishes[${index}].rating`;
    this.setData({
      [key]: score
    });
  },

  // 左侧悬浮按钮
  onOpenFavorites() {
    // 获取所有收藏的菜品，并添加来源信息
    const favoriteDishes = [
      ...this.data.recommendDishes
        .filter(dish => dish.collected)
        .map((dish, index) => ({
          ...dish,
          source: 'recommend',
          originalIndex: this.data.recommendDishes.findIndex(d => d.id === dish.id)
        })),
      ...this.data.menuDishes
        .filter(dish => dish.collected)
        .map((dish, index) => ({
          ...dish,
          source: 'menu',
          originalIndex: this.data.menuDishes.findIndex(d => d.id === dish.id)
        }))
    ];
    
    this.setData({
      modalVisible: true,
      modalType: 'favorites',
      favoriteDishes: favoriteDishes
    });
  },

  onOpenBlockList() {
    // 获取所有黑名单的菜品，并添加来源信息
    const blockedDishes = [
      ...this.data.recommendDishes
        .filter(dish => dish.blocked)
        .map((dish, index) => ({
          ...dish,
          source: 'recommend',
          originalIndex: this.data.recommendDishes.findIndex(d => d.id === dish.id)
        })),
      ...this.data.menuDishes
        .filter(dish => dish.blocked)
        .map((dish, index) => ({
          ...dish,
          source: 'menu',
          originalIndex: this.data.menuDishes.findIndex(d => d.id === dish.id)
        }))
    ];
    
    this.setData({
      modalVisible: true,
      modalType: 'blocked',
      blockedDishes: blockedDishes
    });
  },

  // 关闭弹窗
  onCloseModal() {
    this.setData({
      modalVisible: false,
      modalType: ''
    });
  },

  // 阻止点击弹窗内容区域关闭弹窗
  onModalContentTap(e) {
    // 阻止事件冒泡
  },

  // 弹窗中的事件处理
  onAddMealFromModal(e) {
    const { index } = e.detail;
    const dish = this.data.modalType === 'favorites' 
      ? this.data.favoriteDishes[index]
      : this.data.blockedDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      this.onAddMealFromRecommend({ detail: { index: dish.originalIndex } });
    } else {
      this.onAddMealFromMenu({ detail: { index: dish.originalIndex } });
    }
    
    wx.showToast({
      title: '已加入今日饮食',
      icon: 'success'
    });
  },

  onLikeDishFromModal(e) {
    const { index } = e.detail;
    const dish = this.data.modalType === 'favorites' 
      ? this.data.favoriteDishes[index]
      : this.data.blockedDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      this.onLikeDishFromRecommend({ detail: { index: dish.originalIndex } });
    } else {
      this.onLikeDishFromMenu({ detail: { index: dish.originalIndex } });
    }
    
    // 更新弹窗中的列表
    this.refreshModalList();
  },

  onBlockDishFromModal(e) {
    const { index } = e.detail;
    const dish = this.data.modalType === 'favorites' 
      ? this.data.favoriteDishes[index]
      : this.data.blockedDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      this.onBlockDishFromRecommend({ detail: { index: dish.originalIndex } });
    } else {
      this.onBlockDishFromMenu({ detail: { index: dish.originalIndex } });
    }
    
    // 更新弹窗中的列表
    this.refreshModalList();
  },

  onRateDishFromModal(e) {
    const { index, score } = e.detail;
    const dish = this.data.modalType === 'favorites' 
      ? this.data.favoriteDishes[index]
      : this.data.blockedDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      this.onRateDishFromRecommend({ detail: { index: dish.originalIndex, score } });
    } else {
      this.onRateDishFromMenu({ detail: { index: dish.originalIndex, score } });
    }
  },

  // 刷新弹窗列表
  refreshModalList() {
    if (this.data.modalType === 'favorites') {
      this.onOpenFavorites();
    } else if (this.data.modalType === 'blocked') {
      this.onOpenBlockList();
    }
  },

  // 从收藏列表中移除
  onRemoveFromFavorites(e) {
    const { index } = e.currentTarget.dataset;
    const dish = this.data.favoriteDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      const key = `recommendDishes[${dish.originalIndex}].collected`;
      this.setData({
        [key]: false
      });
    } else {
      const key = `menuDishes[${dish.originalIndex}].collected`;
      this.setData({
        [key]: false
      });
    }
    
    // 刷新弹窗列表
    this.refreshModalList();
  },

  // 从黑名单中移除
  onRemoveFromBlocked(e) {
    const { index } = e.currentTarget.dataset;
    const dish = this.data.blockedDishes[index];
    
    // 根据来源更新对应的列表
    if (dish.source === 'recommend') {
      const key = `recommendDishes[${dish.originalIndex}].blocked`;
      this.setData({
        [key]: false
      });
    } else {
      const key = `menuDishes[${dish.originalIndex}].blocked`;
      this.setData({
        [key]: false
      });
    }
    
    // 刷新弹窗列表
    this.refreshModalList();
  },

  // ==== 菜单 Tab：筛选区 ====
  onCanteenTap() {
    this.openMenuDropdown('canteen');
  },

  onWindowTap() {
    this.openMenuDropdown('window');
  },

  onTypeTap() {
    this.openMenuDropdown('type');
  },

  // 打开菜单下拉选择
  openMenuDropdown(type) {
    const { menuDropdownVisible, activeMenuFilter, menuFilterOptions, selectedMenuFilters } = this.data;
    
    const visible = !(menuDropdownVisible && activeMenuFilter === type);
    
    if (type === 'canteen') {
      // 食堂需要特殊处理，显示分类和子项
      const options = [];
      menuFilterOptions.canteen.forEach(category => {
        options.push({ type: 'category', label: category.category });
        category.items.forEach(item => {
          options.push({ type: 'item', label: item, category: category.category });
        });
      });
      
      this.setData({
        menuDropdownVisible: visible,
        activeMenuFilter: type,
        menuDropdownOptions: visible ? options : [],
        currentMenuDropdownSelected: visible ? selectedMenuFilters[type] : ''
      });
    } else {
      // 档口和餐别直接显示选项
      this.setData({
        menuDropdownVisible: visible,
        activeMenuFilter: type,
        menuDropdownOptions: visible ? menuFilterOptions[type] : [],
        currentMenuDropdownSelected: visible ? selectedMenuFilters[type] : ''
      });
    }
  },

  // 菜单下拉选项点击
  onMenuDropdownOptionTap(e) {
    const { index } = e.currentTarget.dataset;
    const { activeMenuFilter, menuDropdownOptions, selectedMenuFilters } = this.data;
    const option = menuDropdownOptions[index];
    
    // 如果是分类标题，不处理
    if (option.type === 'category') {
      return;
    }
    
    const value = option.label || option;
    
    // 如果点击的是已选中的选项，则取消选择
    if (selectedMenuFilters[activeMenuFilter] === value) {
      selectedMenuFilters[activeMenuFilter] = '';
      this.updateMenuFilterText(activeMenuFilter, '');
    } else {
      selectedMenuFilters[activeMenuFilter] = value;
      this.updateMenuFilterText(activeMenuFilter, value);
    }
    
    this.setData({
      selectedMenuFilters,
      menuDropdownVisible: false,
      menuDropdownOptions: [],
      currentMenuDropdownSelected: selectedMenuFilters[activeMenuFilter]
    });
  },

  // 更新菜单筛选文本显示
  updateMenuFilterText(type, value) {
    const textMap = {
      canteen: 'canteenText',
      window: 'windowText',
      type: 'typeText'
    };
    
    this.setData({
      [textMap[type]]: value || (type === 'canteen' ? '食堂' : type === 'window' ? '档口' : '餐别')
    });
  },

  // ==== 菜单 Tab：dish-card 事件 ====
  onAddMealFromMenu(e) {
    const { index } = e.detail;
    const dish = this.data.menuDishes[index];
    console.log('菜单页加入饮食：', dish);
    wx.showToast({
      title: '已加入今日饮食',
      icon: 'success'
    });
  },

  onLikeDishFromMenu(e) {
    const { index } = e.detail;
    const key = `menuDishes[${index}].collected`;
    this.setData({
      [key]: !this.data.menuDishes[index].collected
    });
  },

  onBlockDishFromMenu(e) {
    const { index } = e.detail;
    const dish = this.data.menuDishes[index];
    const key = `menuDishes[${index}].blocked`;
    const newBlockedState = !dish.blocked;
    
    this.setData({
      [key]: newBlockedState
    });
    
    // 如果加入黑名单，显示提示
    if (newBlockedState) {
      wx.showToast({
        title: '已加入黑名单',
        icon: 'success',
        duration: 1500
      });
    }
  },

  onRateDishFromMenu(e) {
    const { index, score } = e.detail;
    const key = `menuDishes[${index}].rating`;
    this.setData({
      [key]: score
    });
  },

  // 菜单列表滚动事件
  onMenuScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const shouldFix = scrollTop > 0;
    
    if (this.data.menuFilterRowFixed !== shouldFix) {
      this.setData({
        menuFilterRowFixed: shouldFix
      });
    }
  },

  // 菜单页菜品详情
  onDishDetailFromMenu(e) {
    const { index } = e.detail;
    const dish = this.data.menuDishes[index];
    this.setData({
      detailModalVisible: true,
      detailDish: dish
    });
  },

  // 关闭详情弹窗
  onCloseDetailModal() {
    this.setData({
      detailModalVisible: false,
      detailDish: null
    });
  }
});
