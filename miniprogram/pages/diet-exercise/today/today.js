// pages/diet-exercise/today/today.js
Page({
  data: {
    // 顶部今日 / 历史
    activeTab: 'today',
    
    // 用户信息（用于能量平衡计算）
    userInfo: {
      sex: 'male', // 'male' | 'female'
      weight: 70, // kg
      height: 175, // cm
      age: 25,
      activityFactor: 1.55 // 活动系数
    },
    
    // 今日数据
    intake: 1200,
    burned: 400,
    net: 800,
    energyBalance: 60, // 动态计算
    progressAngle: 54, // 动态计算
    progressPercent: 0, // 进度百分比（0-100）
    progressDeg: 0,
    showProgressHalf: false, // 是否显示下半部分进度
    
    // 弹窗相关
    modalVisible: false,
    modalType: '', // 'addFood' | 'addExercise' | 'editMeal' | 'editExercise'
    editingMealId: null,
    editingExerciseId: null,
    
    // 添加饮食表单
    foodForm: {
      mealType: 'breakfast', // 'breakfast' | 'lunch' | 'dinner'
      foodName: '',
      kcal: ''
    },
    
    // 添加运动表单
    exerciseForm: {
      exerciseName: '',
      duration: '',
      kcal: ''
    },
    
    meals: [
      {
        id: 1,
        name: '早餐',
        desc: '面包 + 牛奶 + 鸡蛋',
        kcal: 400,
        icon: '/images/diet-exercise/breakfast.png',
        isEmpty: false
      },
      {
        id: 2,
        name: '午餐',
        desc: '牛肉面 + 烤鸡翅',
        kcal: 800,
        icon: '/images/diet-exercise/lunch.png',
        isEmpty: false
      },
      {
        id: 3,
        name: '晚餐',
        desc: '无',
        kcal: 0,
        icon: '/images/diet-exercise/dinner.png',
        isEmpty: true
      }
    ],
    
    // 今日运动列表
    exercises: [
      {
        id: 1,
        name: '跑步',
        duration: '30分钟',
        kcal: 200,
        isEmpty: false
      }
    ],

    // 历史数据
    selectedDate: '', // 空字符串表示未选择，显示所有记录
    selectedWeekday: '',
    datePickerExpanded: false, // 日期选择器展开状态
    dateCardCollapsed: false, // 日期卡片收起状态
    maxDate: '', // 最大日期（今天）
    // 多日期历史数据存储
    historyDataMap: {},
    historyData: {
      totalIntake: 0,
      totalBurned: 0,
      netEnergy: 0,
      dietRecords: [],
      exerciseRecords: []
    },
    // 所有历史记录（按日期分组，用于未选择日期时显示）
    allHistoryRecords: [],
    // 每个日期卡片的收起/展开状态
    dateGroupCollapsed: {} // { '2025-11-29': false, '2025-11-30': false, ... }
  },

  // 顶部 今日 / 历史 tab
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 能量平衡计算公式
  energyBalance(sex, W, H, A, F, I, E) {
    // 基础代谢率 BMR
    const BMR = sex === "male" 
      ? (10 * W + 6.25 * H - 5 * A + 5)
      : (10 * W + 6.25 * H - 5 * A - 161);
    
    // 总消耗 = (BMR * 活动系数) + 运动消耗
    const totalExpenditure = BMR * F + E;
    
    // 能量差值
    const diff = Math.abs(I - totalExpenditure);
    
    // 相对差值比例
    const r = diff / totalExpenditure;
    
    // 计算能量平衡百分比
    const SAFE = 0.4;
    const MAX = 1.0;
    let balance;
    if (r <= SAFE) {
      balance = 100;
    } else if (r >= MAX) {
      balance = 0;
    } else {
      balance = 100 * (1 - (r - SAFE) / (MAX - SAFE));
    }
    
    return Math.round(balance);
  },

  // 计算能量平衡和进度角度
  calculateEnergyBalance() {
    const { userInfo, intake, burned } = this.data;
    const { sex, weight, height, age, activityFactor } = userInfo;
    
    // 计算基础代谢率
    const BMR = sex === "male" 
      ? (10 * weight + 6.25 * height - 5 * age + 5)
      : (10 * weight + 6.25 * height - 5 * age - 161);
    
    // 总消耗 = (BMR * 活动系数) + 运动消耗
    const totalExpenditure = BMR * activityFactor + burned;
    
    // 使用公式计算能量平衡
    const energyBalance = this.energyBalance(
      sex, 
      weight, 
      height, 
      age, 
      activityFactor, 
      intake, 
      burned
    );
    
    // 进度环直接使用能量平衡分数
    const progressPercent = energyBalance; // 0 - 100
    const progressDeg = progressPercent / 100 * 360; // 转成角度

    // 调试信息
    console.log('能量平衡计算:', {
      BMR: BMR.toFixed(2),
      totalExpenditure: totalExpenditure.toFixed(2),
      intake,
      burned,
      energyBalance,
      progressPercent: progressPercent.toFixed(2),
      progressDeg: progressDeg.toFixed(2)
    });
    
    this.setData({
      energyBalance,
      progressPercent,
      progressDeg,
      net: intake - burned
    });
  },

  // 今日相关方法
  onAddFood() {
    this.setData({
      modalVisible: true,
      modalType: 'addFood',
      foodForm: {
        mealType: 'breakfast',
        foodName: '',
        kcal: ''
      }
    });
  },

  onAddExercise() {
    this.setData({
      modalVisible: true,
      modalType: 'addExercise',
      editingExerciseId: null,
      exerciseForm: {
        exerciseName: '',
        duration: '',
        kcal: ''
      }
    });
  },

  onEditMeal(e) {
    const id = e.currentTarget.dataset.id;
    const meal = this.data.meals.find(m => m.id === id);
    if (!meal) {
      return;
    }
    
    this.setData({
      modalVisible: true,
      modalType: 'editMeal',
      editingMealId: id,
      foodForm: {
        mealType: meal.name === '早餐' ? 'breakfast' : meal.name === '午餐' ? 'lunch' : 'dinner',
        foodName: meal.isEmpty ? '' : meal.desc,
        kcal: meal.isEmpty ? '' : meal.kcal.toString()
      }
    });
  },

  onDeleteMeal(e) {
    const id = e.currentTarget.dataset.id;
    const meals = this.data.meals.map(m => {
      if (m.id === id) {
        return {
          ...m,
          desc: '无',
          kcal: 0,
          isEmpty: true
        };
      }
      return m;
    });
    
    // 重新计算总摄入
    const intake = meals.reduce((sum, m) => sum + m.kcal, 0);
    
    this.setData({ meals, intake });
    this.calculateEnergyBalance();
    
    wx.showToast({
      title: '已清空',
      icon: 'none'
    });
  },

  // 弹窗相关方法
  onCloseModal() {
    this.setData({
      modalVisible: false,
      modalType: '',
      editingMealId: null,
      editingExerciseId: null
    });
  },

  onModalContentTap() {
    // 阻止事件冒泡
  },

  // 表单输入
  onFoodNameInput(e) {
    this.setData({
      'foodForm.foodName': e.detail.value
    });
  },

  onKcalInput(e) {
    this.setData({
      'foodForm.kcal': e.detail.value
    });
  },

  onMealTypeChange(e) {
    const mealTypeMap = ['breakfast', 'lunch', 'dinner'];
    this.setData({
      'foodForm.mealType': mealTypeMap[e.detail.value]
    });
  },

  onExerciseNameInput(e) {
    this.setData({
      'exerciseForm.exerciseName': e.detail.value
    });
  },

  onExerciseDurationInput(e) {
    this.setData({
      'exerciseForm.duration': e.detail.value
    });
  },

  onExerciseKcalInput(e) {
    this.setData({
      'exerciseForm.kcal': e.detail.value
    });
  },

  // 提交表单
  onSubmitFood() {
    const { foodForm, editingMealId, meals } = this.data;
    if (!foodForm.foodName || !foodForm.kcal) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const kcal = parseInt(foodForm.kcal) || 0;
    const mealTypeMap = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐'
    };
    const mealName = mealTypeMap[foodForm.mealType];

    let newMeals = [...meals];
    if (editingMealId) {
      // 编辑模式
      newMeals = newMeals.map(m => {
        if (m.id === editingMealId) {
          return {
            ...m,
            desc: foodForm.foodName,
            kcal: kcal,
            isEmpty: false
          };
        }
        return m;
      });
    } else {
      // 添加模式
      newMeals = newMeals.map(m => {
        if (m.name === mealName) {
          return {
            ...m,
            desc: foodForm.foodName,
            kcal: kcal,
            isEmpty: false
          };
        }
        return m;
      });
    }

    const intake = newMeals.reduce((sum, m) => sum + m.kcal, 0);
    
    this.setData({
      meals: newMeals,
      intake,
      modalVisible: false,
      modalType: '',
      editingMealId: null
    });
    
    this.calculateEnergyBalance();
    
    wx.showToast({
      title: editingMealId ? '已更新' : '已添加',
      icon: 'success'
    });
  },

  onEditExercise(e) {
    const id = e.currentTarget.dataset.id;
    const exercise = this.data.exercises.find(ex => ex.id === id);
    if (!exercise) return;
    
    this.setData({
      modalVisible: true,
      modalType: 'editExercise',
      editingExerciseId: id,
      exerciseForm: {
        exerciseName: exercise.name === '无' ? '' : exercise.name,
        duration: exercise.duration,
        kcal: exercise.kcal.toString()
      }
    });
  },

  onDeleteExercise(e) {
    const id = e.currentTarget.dataset.id;
    // 直接删除记录，从数组中移除
    const exercises = this.data.exercises.filter(ex => ex.id !== id);
    
    // 重新计算总消耗
    const burned = exercises.reduce((sum, ex) => sum + ex.kcal, 0);
    
    this.setData({ exercises, burned });
    this.calculateEnergyBalance();
    
    wx.showToast({
      title: '已删除',
      icon: 'none'
    });
  },

  onSubmitExercise() {
    const { exerciseForm, burned, exercises, editingExerciseId } = this.data;
    if (!exerciseForm.exerciseName || !exerciseForm.kcal) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const kcal = parseInt(exerciseForm.kcal) || 0;
    let newExercises = [...exercises];
    let newBurned = burned;
    
    if (editingExerciseId) {
      // 编辑模式：找到要编辑的运动，更新它
      const oldExercise = exercises.find(ex => ex.id === editingExerciseId);
      const oldKcal = oldExercise ? oldExercise.kcal : 0;
      
      newExercises = newExercises.map(ex => {
        if (ex.id === editingExerciseId) {
          return {
            ...ex,
            name: exerciseForm.exerciseName,
            duration: exerciseForm.duration,
            kcal: kcal,
            isEmpty: false
          };
        }
        return ex;
      });
      
      newBurned = burned - oldKcal + kcal;
    } else {
      // 添加模式：直接添加新记录到数组
      const newId = Math.max(...newExercises.map(ex => ex.id), 0) + 1;
      newExercises.push({
        id: newId,
        name: exerciseForm.exerciseName,
        duration: exerciseForm.duration,
        kcal: kcal,
        isEmpty: false
      });
      newBurned = burned + kcal;
    }
    
    this.setData({
      exercises: newExercises,
      burned: newBurned,
      modalVisible: false,
      modalType: '',
      editingExerciseId: null
    });
    
    this.calculateEnergyBalance();
    
    wx.showToast({
      title: editingExerciseId ? '已更新' : '已添加',
      icon: 'success'
    });
  },

  // 历史相关方法
  onDateChange(e) {
    const date = e.detail.value;
    // 选择了日期，显示单日数据
    this.setData({
      selectedDate: date,
      selectedWeekday: this.getWeekday(date),
      datePickerExpanded: false, // 选择后自动收起
      dateCardCollapsed: false // 选择日期后自动展开
    });
    this.loadHistoryData(date);
  },

  onDateHeaderTap() {
    // 展开/收起日期卡片（统计卡片和记录列表）
    this.setData({
      dateCardCollapsed: !this.data.dateCardCollapsed
    });
  },

  // 清空日期选择
  onClearDate() {
    this.setData({
      selectedDate: '',
      selectedWeekday: '',
      dateCardCollapsed: false,
      datePickerExpanded: false,
      historyData: {
        totalIntake: 0,
        totalBurned: 0,
        netEnergy: 0,
        dietRecords: [],
        exerciseRecords: []
      }
    });
    this.loadAllHistoryRecords();
  },

  // 日期分组头部点击（收起/展开）
  onDateGroupHeaderTap(e) {
    const date = e.currentTarget.dataset.date;
    const dateGroupCollapsed = { ...this.data.dateGroupCollapsed };
    dateGroupCollapsed[date] = !dateGroupCollapsed[date];
    this.setData({
      dateGroupCollapsed
    });
  },

  // 加载指定日期的历史数据
  loadHistoryData(date) {
    let data = this.data.historyDataMap[date];
    
    // 如果该日期没有数据，使用默认数据
    if (!data) {
      data = this.getDefaultHistoryData(date);
      // 将新数据保存到 historyDataMap
      const historyDataMap = { ...this.data.historyDataMap };
      historyDataMap[date] = data;
      this.setData({ historyDataMap });
    }
    
    this.setData({
      historyData: data
    });
  },

  // 获取默认历史数据（用于新日期）
  getDefaultHistoryData(date) {
    // 为每个日期生成固定的数据
    const dateDataMap = {
      '2025-11-29': {
        dietRecords: [
          { id: 1, name: '燕麦牛奶', quantity: 1, kcal: 250 },
          { id: 2, name: '水煮蛋', quantity: 2, kcal: 140 },
          { id: 3, name: '清炒鸡胸饭', quantity: 1, kcal: 520 },
          { id: 4, name: '清炒时蔬', quantity: 1, kcal: 80 },
          { id: 5, name: '牛肉面', quantity: 1, kcal: 550 },
          { id: 6, name: '苹果', quantity: 1, kcal: 80 }
        ],
        exerciseRecords: [
          { id: 1, name: '跑步', duration: '5 km', kcal: 330 },
          { id: 2, name: '力量训练', duration: '30 min', kcal: 150 }
        ]
      },
      '2025-11-30': {
        dietRecords: [
          { id: 1, name: '全麦面包', quantity: 2, kcal: 200 },
          { id: 2, name: '酸奶', quantity: 1, kcal: 120 },
          { id: 3, name: '鸡胸肉沙拉', quantity: 1, kcal: 350 },
          { id: 4, name: '三文鱼', quantity: 1, kcal: 280 },
          { id: 5, name: '糙米饭', quantity: 1, kcal: 220 },
          { id: 6, name: '西兰花', quantity: 1, kcal: 50 },
          { id: 7, name: '香蕉', quantity: 1, kcal: 90 }
        ],
        exerciseRecords: [
          { id: 1, name: '游泳', duration: '40 min', kcal: 280 },
          { id: 2, name: '瑜伽', duration: '45 min', kcal: 120 }
        ]
      },
      '2025-12-01': {
        dietRecords: [
          { id: 1, name: '小米粥', quantity: 1, kcal: 150 },
          { id: 2, name: '蒸蛋', quantity: 1, kcal: 70 },
          { id: 3, name: '红烧肉', quantity: 1, kcal: 600 },
          { id: 4, name: '白米饭', quantity: 1, kcal: 200 },
          { id: 5, name: '青菜', quantity: 1, kcal: 30 },
          { id: 6, name: '橙子', quantity: 1, kcal: 60 }
        ],
        exerciseRecords: [
          { id: 1, name: '骑行', duration: '1小时', kcal: 400 },
          { id: 2, name: '快走', duration: '30 min', kcal: 150 }
        ]
      },
      '2025-12-02': {
        dietRecords: [
          { id: 1, name: '豆浆', quantity: 1, kcal: 100 },
          { id: 2, name: '包子', quantity: 2, kcal: 300 },
          { id: 3, name: '宫保鸡丁', quantity: 1, kcal: 450 },
          { id: 4, name: '米饭', quantity: 1, kcal: 200 },
          { id: 5, name: '紫菜蛋花汤', quantity: 1, kcal: 50 },
          { id: 6, name: '葡萄', quantity: 1, kcal: 70 }
        ],
        exerciseRecords: [
          { id: 1, name: '跳绳', duration: '20 min', kcal: 200 },
          { id: 2, name: '羽毛球', duration: '1小时', kcal: 350 }
        ]
      },
      '2025-12-03': {
        dietRecords: [
          { id: 1, name: '燕麦牛奶', quantity: 1, kcal: 250 },
          { id: 2, name: '水煮蛋', quantity: 2, kcal: 140 },
          { id: 3, name: '清炒鸡胸饭', quantity: 1, kcal: 520 },
          { id: 4, name: '清炒时蔬', quantity: 1, kcal: 80 },
          { id: 5, name: '牛肉面', quantity: 1, kcal: 550 },
          { id: 6, name: '苹果', quantity: 1, kcal: 80 }
        ],
        exerciseRecords: [
          { id: 1, name: '跑步', duration: '5 km', kcal: 330 },
          { id: 2, name: '力量训练', duration: '30 min', kcal: 150 }
        ]
      }
    };

    const data = dateDataMap[date];
    if (!data) {
      // 如果日期不在预设列表中，返回空数据
      return {
        totalIntake: 0,
        totalBurned: 0,
        netEnergy: 0,
        dietRecords: [],
        exerciseRecords: []
      };
    }

    const totalIntake = data.dietRecords.reduce((sum, item) => sum + item.kcal, 0);
    const totalBurned = data.exerciseRecords.reduce((sum, item) => sum + item.kcal, 0);
    const netEnergy = totalIntake - totalBurned;

    return {
      totalIntake,
      totalBurned,
      netEnergy,
      dietRecords: data.dietRecords,
      exerciseRecords: data.exerciseRecords
    };
  },

  // 初始化历史数据
  initHistoryData() {
    const today = new Date();
    const todayStr = this.formatDate(today);
    const maxDate = todayStr;
    
    // 生成最近五天（2025/11/29-2025/12/3）的数据
    const targetDates = [
      '2025-11-29',
      '2025-11-30',
      '2025-12-01',
      '2025-12-02',
      '2025-12-03'
    ];

    const historyDataMap = {};
    targetDates.forEach(date => {
      historyDataMap[date] = this.getDefaultHistoryData(date);
    });

    // 初始化所有历史记录（按日期分组）
    const allHistoryRecords = targetDates.map(date => ({
      date,
      weekday: this.getWeekday(date),
      ...historyDataMap[date]
    }));

    // 设置默认：未选择日期，显示所有记录
    this.setData({
      maxDate,
      selectedDate: '', // 初始为空，显示所有记录
      selectedWeekday: '',
      historyDataMap,
      allHistoryRecords,
      historyData: {
        totalIntake: 0,
        totalBurned: 0,
        netEnergy: 0,
        dietRecords: [],
        exerciseRecords: []
      }
    });
  },

  // 加载所有历史记录（未选择日期时）
  loadAllHistoryRecords() {
    const allHistoryRecords = Object.keys(this.data.historyDataMap)
      .sort((a, b) => b.localeCompare(a)) // 按日期倒序排列
      .map(date => ({
        date,
        weekday: this.getWeekday(date),
        ...this.data.historyDataMap[date]
      }));
    
    // 初始化每个日期分组的收起状态（默认都展开）
    const dateGroupCollapsed = {};
    allHistoryRecords.forEach(item => {
      if (this.data.dateGroupCollapsed[item.date] === undefined) {
        dateGroupCollapsed[item.date] = false; // 默认展开
      } else {
        dateGroupCollapsed[item.date] = this.data.dateGroupCollapsed[item.date];
      }
    });
    
    this.setData({
      allHistoryRecords,
      dateGroupCollapsed
    });
  },

  // 格式化日期
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取星期
  getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(date);
    return weekdays[d.getDay()];
  },

  onLoad() {
    this.calculateEnergyBalance();
    this.initHistoryData();
    // 初始化后加载所有历史记录
    this.loadAllHistoryRecords();
  }
});
