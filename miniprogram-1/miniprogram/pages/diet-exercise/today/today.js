// pages/diet-exercise/today/today.js
const dataSync = require('../../../utils/dataSync.js');

const app = getApp();

Page({
  data: {
    // 顶部二级 Tab：今日 / 历史
    activeTab: 'today',

    // 用户信息（用于能量平衡计算）
    userInfo: {
      sex: 'male', // 'male' | 'female'
      weight: 70, // kg
      height: 175, // cm
      age: 25,
      activityFactor: 1.55 // 活动系数
    },

    // 今日汇总（与 wxml 字段保持一致）
    intake: 0,
    burned: 0,
    net: 0,
    energyBalance: 0,     // %
    progressPercent: 0,   // 0~100
    progressDeg: 0,       // 0~360

    // 今日饮食（按早餐/午餐/晚餐聚合显示）
    meals: [
      { id: 1, mealType: 'breakfast', name: '早餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/breakfast.png', isEmpty: true, items: [] },
      { id: 2, mealType: 'lunch',     name: '午餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/lunch.png',     isEmpty: true, items: [] },
      { id: 3, mealType: 'dinner',    name: '晚餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/dinner.png',    isEmpty: true, items: [] }
    ],

    // 今日运动（逐条显示）
    exercises: [],

    // 弹窗
    modalVisible: false,
    modalType: '', // addFood | addExercise | editMeal | editExercise

    editingMealId: null,
    editingMealRecordId: '',

    editingExerciseId: null,
    editingExerciseRecordId: '',

    // 添加/编辑饮食表单
    foodForm: {
      mealType: 'breakfast',
      foodName: '',
      kcal: ''
    },

    // 添加/编辑运动表单
    exerciseForm: {
      exerciseName: '',
      duration: '', // 分钟数（字符串）
      kcal: ''
    },

    // ========== 历史（改为真实后端） ==========
    maxDate: '',
    selectedDate: '',
    selectedWeekday: '',
    historyDataMap: {},

    historyData: {
      totalIntake: 0,
      totalBurned: 0,
      netEnergy: 0,
      dietRecords: [],
      exerciseRecords: []
    },

    // 所有历史记录（按日期分组）
    allHistoryRecords: [],

    // 每个日期卡片的收起/展开状态
    dateGroupCollapsed: {},

    // 历史加载状态
    historyLoaded: false
  },

  // -------------------------
  // 生命周期
  // -------------------------
  onLoad() {
    // 1) 历史状态初始化（先不 mock）
    this.initHistoryState();

    // 2) 加载用户信息（用于能量环计算）
    this.loadUserInfoFromStorage();

    // 3) 获取 userId，并拉取今日真实数据 + 历史范围数据
    this.userId = this.getUserId();
    this.loadTodayData();
    this.loadHistoryRangeAndBuildList(); // 默认拉最近 N 天
  },

  onShow() {
    // 从“我的”页同步过来的用户信息（如果你们项目需要）
    try {
      dataSync.syncUserInfoToToday();
    } catch (e) {}
    this.loadUserInfoFromStorage();

    // 回到页面时刷新今日数据
    this.userId = this.getUserId();
    this.loadTodayData();

    // 如果已经登录但历史还没加载过，补拉一次
    if (!this.data.historyLoaded) {
      this.loadHistoryRangeAndBuildList();
    }
  },

  // -------------------------
  // 顶部 今日 / 历史 tab
  // -------------------------
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  
    if (tab === 'history') {
      // ⭐每次点开历史都刷新一次：
      // - 如果选了某一天：刷新该天
      // - 否则：刷新范围列表（最近 30 天）
      const date = this.data.selectedDate;
      if (date) {
        this.loadHistoryForSingleDate(date);
      } else {
        this.loadHistoryRangeAndBuildList();
      }
    }

    if (tab === 'today') {
      this.userId = this.getUserId();
      this.loadTodayData();
    }

  },

  // -------------------------
  // 工具：userId / 日期
  // -------------------------
  getUserId() {
    const app = getApp();
    if (app?.globalData?.userId) return app.globalData.userId;

    const uid = wx.getStorageSync('userId');
    if (uid) return uid;

    const user = wx.getStorageSync('currentUser');
    return user?._id || '';
  },

  getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  addDays(dateStr, deltaDays) {
    // dateStr: YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(x => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    return this.formatDate(dt);
  },

  // -------------------------
  // 从 storage 读取用户基础信息（身高体重等）
  // -------------------------
  loadUserInfoFromStorage() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
      const userData = wx.getStorageSync(userDataKey);

      if (userData) {
        this.setData({
          'userInfo.sex': userData.gender === '女' ? 'female' : 'male',
          'userInfo.weight': Number(userData.weight) || this.data.userInfo.weight,
          'userInfo.height': Number(userData.height) || this.data.userInfo.height,
          'userInfo.age': Number(userData.age) || this.data.userInfo.age
        });
      }
    } catch (e) {}
  },

  // -------------------------
  // 能量平衡计算
  // -------------------------
  energyBalance(sex, W, H, A, F, I, E) {
    // 基础代谢率 BMR
    const BMR = sex === 'male'
      ? (10 * W + 6.25 * H - 5 * A + 5)
      : (10 * W + 6.25 * H - 5 * A - 161);

    // 总消耗 = (BMR * 活动系数) + 运动消耗
    const totalExpenditure = BMR * F + E;

    // 能量差值
    const diff = Math.abs(I - totalExpenditure);

    // 相对差值比例
    const r = totalExpenditure > 0 ? (diff / totalExpenditure) : 1;

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

  calculateEnergyBalance() {
    const { userInfo, intake, burned } = this.data;
    const { sex, weight, height, age, activityFactor } = userInfo;

    /*const BMR = sex === 'male'
      ? (10 * weight + 6.25 * height - 5 * age + 5)
      : (10 * weight + 6.25 * height - 5 * age - 161);

    const totalExpenditure = BMR * activityFactor + burned;*/

    const energyBalance = this.energyBalance(
      sex,
      weight,
      height,
      age,
      activityFactor,
      intake,
      burned
    );

    const progressPercent = energyBalance;
    const progressDeg = (energyBalance / 100) * 360;

    this.setData({
      energyBalance,
      progressPercent,
      progressDeg,
      net: intake - burned
    });
  },

  // -------------------------
  // Backend -> UI 映射（今日）
  // -------------------------
  buildMealsFromRecords(records) {
    const base = [
      { id: 1, mealType: 'breakfast', name: '早餐', icon: '/images/diet-exercise/breakfast.png' },
      { id: 2, mealType: 'lunch',     name: '午餐', icon: '/images/diet-exercise/lunch.png' },
      { id: 3, mealType: 'dinner',    name: '晚餐', icon: '/images/diet-exercise/dinner.png' }
    ];

    return base.map(m => {
      const items = (records || []).filter(r => r.mealType === m.mealType);
      if (!items || items.length === 0) {
        return { ...m, desc: '无', kcal: 0, isEmpty: true, items: [] };
      }
      return {
        ...m,
        desc: items.map(i => i.foodName).join(' / '),
        kcal: items.reduce((sum, i) => sum + (Number(i.kcal) || 0), 0),
        isEmpty: false,
        items
      };
    });
  },

  buildExercisesFromRecords(records) {
    return (records || []).map((r, idx) => ({
      id: idx + 1,
      recordId: r._id,
      name: r.name,              // exercise_records 用 name
      duration: r.duration,
      kcal: Number(r.kcal) || 0,
      isEmpty: false
    }));
  },

  // -------------------------
  // 拉取今日真实数据（getTodayDiet + getTodayExercise）
  // -------------------------
  loadTodayData() {
    const userId = this.userId;
    if (!userId) {
      // ✅避免显示上一次残留的 meals / exercises
      this.setData({
        intake: 0,
        burned: 0,
        net: 0,
        meals: [
          { id: 1, mealType: 'breakfast', name: '早餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/breakfast.png', isEmpty: true, items: [] },
          { id: 2, mealType: 'lunch',     name: '午餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/lunch.png',     isEmpty: true, items: [] },
          { id: 3, mealType: 'dinner',    name: '晚餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/dinner.png',    isEmpty: true, items: [] }
        ],
        exercises: []
      });
      this.calculateEnergyBalance();
      return;
    }

    wx.showLoading({ title: '加载中...' });

    // 后端自己算 todayStr 也可以；这里传不传都行（你当前文件里传了就保留）
    const todayStr = this.getTodayStr();
    const getDiet = wx.cloud.callFunction({
      name: 'getTodayDiet',
      data: { userId, date: todayStr }
    });

    const getExercise = wx.cloud.callFunction({
      name: 'getTodayExercise',
      data: { userId, date: todayStr }
    });

    Promise.all([getDiet, getExercise])
      .then(([dietRes, exRes]) => {
        const dietData = (dietRes && dietRes.result) ? dietRes.result : {};
        const exData = (exRes && exRes.result) ? exRes.result : {};

        let intake = 0;
        let burned = 0;
        let meals = this.data.meals;
        let exercises = this.data.exercises;

        if (dietData.code === 200 && dietData.data) {
          intake = Number(dietData.data.totalIntake) || 0;
          meals = this.buildMealsFromRecords(dietData.data.records || []);
        }

        if (exData.code === 200 && exData.data) {
          burned = Number(exData.data.totalBurned) || 0;
          exercises = this.buildExercisesFromRecords(exData.data.records || []);
        }

        this.setData({ meals, exercises, intake, burned });
        this.calculateEnergyBalance();

        try { dataSync.syncFromTodayToMine(); } catch (e) {}
      })
      .catch(err => {
        console.error('[loadTodayData] error:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // -------------------------
  // 今日：打开弹窗
  // -------------------------
  onAddFood() {
    this.setData({
      modalVisible: true,
      modalType: 'addFood',
      editingMealId: null,
      editingMealRecordId: '',
      foodForm: { mealType: 'breakfast', foodName: '', kcal: '' }
    });
  },

  onAddExercise() {
    this.setData({
      modalVisible: true,
      modalType: 'addExercise',
      editingExerciseId: null,
      editingExerciseRecordId: '',
      exerciseForm: { exerciseName: '', duration: '', kcal: '' }
    });
  },

  onEditMeal(e) {
    const id = e.currentTarget.dataset.id;              // meal.id (1/2/3)
    const recordId = e.currentTarget.dataset.recordid;  // 单条记录 _id（有就编辑那条）
    const meal = (this.data.meals || []).find(m => m.id === id);
    if (!meal) return;
  
    if (meal.isEmpty || !meal.items || meal.items.length === 0) {
      wx.showToast({ title: '没有可编辑的记录', icon: 'none' });
      return;
    }
  
    // ✅优先编辑点击的那条记录；否则默认第一条
    const target = recordId
      ? (meal.items.find(r => r._id === recordId) || meal.items[0])
      : meal.items[0];
  
    this.setData({
      modalVisible: true,
      modalType: 'editMeal',
      editingMealId: id,
      editingMealRecordId: target._id,   // 关键：后面 editMeal 用它
      foodForm: {
        mealType: meal.mealType,
        foodName: target.foodName || '',
        kcal: String(target.kcal || '')
      }
    });
  },

  onEditExercise(e) {
    const id = e.currentTarget.dataset.id;
    const ex = (this.data.exercises || []).find(x => x.id === id);
    if (!ex) return;

    this.setData({
      modalVisible: true,
      modalType: 'editExercise',
      editingExerciseId: id,
      editingExerciseRecordId: ex.recordId || '',
      exerciseForm: {
        exerciseName: ex.name || '',
        duration: String(ex.duration || '').replace(/分钟/g, '').trim(),
        kcal: String(ex.kcal || '')
      }
    });
  },

  // -------------------------
  // 弹窗：关闭 / 阻止冒泡
  // -------------------------
  onCloseModal() {
    this.setData({
      modalVisible: false,
      modalType: '',
      editingMealId: null,
      editingMealRecordId: '',
      editingExerciseId: null,
      editingExerciseRecordId: ''
    });
  },

  onModalContentTap() {},

  // -------------------------
  // 表单输入
  // -------------------------
  onMealTypeChange(e) {
    const mealTypeMap = ['breakfast', 'lunch', 'dinner'];
    this.setData({ 'foodForm.mealType': mealTypeMap[e.detail.value] });
  },

  onFoodNameInput(e) {
    this.setData({ 'foodForm.foodName': e.detail.value });
  },

  onKcalInput(e) {
    this.setData({ 'foodForm.kcal': e.detail.value });
  },

  onExerciseNameInput(e) {
    this.setData({ 'exerciseForm.exerciseName': e.detail.value });
  },

  onExerciseDurationInput(e) {
    this.setData({ 'exerciseForm.duration': e.detail.value });
  },

  onExerciseKcalInput(e) {
    this.setData({ 'exerciseForm.kcal': e.detail.value });
  },

  // -------------------------
  // 校验
  // -------------------------
  isChinese(str) {
    if (!str || str.trim() === '') return false;
    const chineseRegex = /^[\u4e00-\u9fa5]+$/;
    return chineseRegex.test(str.trim());
  },

  isNumber(str) {
    if (!str || str.trim() === '') return false;
    const num = parseFloat(str.trim());
    return !isNaN(num) && isFinite(num) && num >= 0;
  },

  // -------------------------
  // 提交：饮食（addMeal / editMeal）
  // -------------------------
  onSubmitFood() {
    const userId = this.userId;
    const { foodForm, editingMealRecordId } = this.data;

    if (!userId) {
      wx.showToast({ title: '未获取到用户信息，请先登录', icon: 'none' });
      return;
    }

    if (!foodForm.foodName || !foodForm.kcal) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!this.isChinese(foodForm.foodName)) {
      wx.showToast({ title: '食物名称必须是汉字', icon: 'none' });
      return;
    }

    if (!this.isNumber(foodForm.kcal)) {
      wx.showToast({ title: '热量必须是数字', icon: 'none' });
      return;
    }

    const kcal = parseInt(foodForm.kcal, 10) || 0;

    wx.showLoading({ title: '提交中...' });

    // 编辑：editMeal（后端要求：recordId, foodName, kcal, mealType 可选）
    if (editingMealRecordId) {
      wx.cloud.callFunction({
        name: 'editMeal',
        data: {
          recordId: editingMealRecordId,
          foodName: foodForm.foodName,
          kcal
        }
      }).then(res => {
        const r = res && res.result ? res.result : {};
        if (r.code === 200) {
          wx.showToast({ title: '已更新', icon: 'success' ,duration: 800});
          setTimeout(() => {
            this.onCloseModal();
            this.loadTodayData();
          }, 800);
        } else {
          wx.showToast({ title: r.message || '更新失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('[editMeal] error:', err);
        wx.showToast({ title: err?.errMsg || '更新失败', icon: 'none' });
      }).finally(() => {
        wx.hideLoading();
      });
      return;
    }

    // 新增：addMeal（后端集合：diet_records）
    const todayStr = this.getTodayStr();
    wx.cloud.callFunction({
      name: 'addMeal',
      data: {
        userId,
        date: todayStr,
        mealType: foodForm.mealType,
        foodName: foodForm.foodName,
        kcal
      }
    }).then(res => {
      const r = res && res.result ? res.result : {};
      if (r.code === 200) {
        wx.showToast({ title: '已添加', icon: 'success' });
        this.onCloseModal();
        this.loadTodayData();
      } else {
        wx.showToast({ title: r.message || '添加失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('[addMeal] error:', err);
      wx.showToast({ title: err?.errMsg || '添加失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // -------------------------
  // 提交：运动（addExercise / editExercise）
  // -------------------------
  onSubmitExercise() {
    const userId = this.userId;
    const { exerciseForm, editingExerciseRecordId } = this.data;

    if (!userId) {
      wx.showToast({ title: '未获取到用户信息，请先登录', icon: 'none' });
      return;
    }

    if (!exerciseForm.exerciseName || !exerciseForm.duration || !exerciseForm.kcal) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!this.isChinese(exerciseForm.exerciseName)) {
      wx.showToast({ title: '运动名称必须是汉字', icon: 'none' });
      return;
    }

    if (!this.isNumber(exerciseForm.duration) || !this.isNumber(exerciseForm.kcal)) {
      wx.showToast({ title: '时长/热量必须是数字', icon: 'none' });
      return;
    }

    const durationMinutes = parseInt(exerciseForm.duration, 10) || 0;
    const kcal = parseInt(exerciseForm.kcal, 10) || 0;
    const todayStr = this.getTodayStr();

    wx.showLoading({ title: '提交中...' });

    // 编辑：editExercise（后端要求：id, name, duration, kcal）
    if (editingExerciseRecordId) {
      wx.cloud.callFunction({
        name: 'editExercise',
        data: {
          id: editingExerciseRecordId,
          name: exerciseForm.exerciseName,
          duration: `${durationMinutes}分钟`,
          kcal
        }
      }).then(res => {
        const r = res && res.result ? res.result : {};
        if (r.code === 200) {
          wx.showToast({ title: '已更新', icon: 'success' ,duration: 800});
          setTimeout(() => {
            this.onCloseModal();
            this.loadTodayData();
          }, 800);
        } else {
          wx.showToast({ title: r.message || '更新失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('[editExercise] error:', err);
        wx.showToast({ title: err?.errMsg || '更新失败', icon: 'none' });
      }).finally(() => {
        wx.hideLoading();
      });
      return;
    }

    // 新增：addExercise（后端要求：userId, date, name, duration, kcal）
    wx.cloud.callFunction({
      name: 'addExercise',
      data: {
        userId,
        date: todayStr,
        name: exerciseForm.exerciseName,
        duration: `${durationMinutes}分钟`,
        kcal
      }
    }).then(res => {
      const r = res && res.result ? res.result : {};
      if (r.code === 200) {
        wx.showToast({ title: '已添加', icon: 'success' });
        this.onCloseModal();
        this.loadTodayData();
      } else {
        wx.showToast({ title: r.message || '添加失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('[addExercise] error:', err);
      wx.showToast({ title: err?.errMsg || '添加失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // -------------------------
  // 删除：饮食 / 运动（已按你们后端参数对齐）
  // -------------------------
  onDeleteMeal(e) {
    const id = e.currentTarget.dataset.id;              // meal.id
    const recordId = e.currentTarget.dataset.recordid;  // 单条记录 _id（有就删那条）
    const meal = (this.data.meals || []).find(m => m.id === id);
  
    if (!meal || meal.isEmpty || !meal.items || meal.items.length === 0) return;
  
    wx.showModal({
      title: '确认删除',
      content: recordId ? '确定删除这条饮食记录吗？' : `确定删除「${meal.name}」的全部记录吗？`,
      success: (res) => {
        if (!res.confirm) return;
  
        wx.showLoading({ title: '删除中...' });
  
        const userId = this.userId;
  
        // ✅有 recordId：只删一条；否则删该餐别全部
        const tasks = recordId
          ? [wx.cloud.callFunction({ name: 'deleteMeal', data: { userId, recordId } })]
          : meal.items.map(r => wx.cloud.callFunction({
              name: 'deleteMeal',
              data: { userId, recordId: r._id }
            }));
  
        Promise.all(tasks)
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadTodayData();
          })
          .catch(err => {
            console.error('[deleteMeal] error:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          })
          .finally(() => wx.hideLoading());
      }
    });
  },

  onDeleteExercise(e) {
    const id = e.currentTarget.dataset.id;
    const ex = (this.data.exercises || []).find(x => x.id === id);
    if (!ex || !ex.recordId) return;

    wx.showModal({
      title: '确认删除',
      content: '确定删除该条运动记录吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });

        // 后端 deleteExercise 需要 event.id
        wx.cloud.callFunction({
          name: 'deleteExercise',
          data: { id: ex.recordId }
        }).then(r => {
          const result = r && r.result ? r.result : {};
          if (result.code === 200) {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadTodayData();
          } else {
            wx.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        }).catch(err => {
          console.error('[deleteExercise] error:', err);
          wx.showToast({ title: err?.errMsg || '删除失败', icon: 'none' });
        }).finally(() => {
          wx.hideLoading();
        });
      }
    });
  },

  // =====================================================
  // 历史相关（改为真实后端：getDietHistory + getExerciseHistory）
  // =====================================================
  initHistoryState() {
    const maxDate = this.formatDate(new Date());
    this.setData({
      maxDate,
      selectedDate: '',
      selectedWeekday: '',
      historyDataMap: {},
      allHistoryRecords: [],
      dateGroupCollapsed: {},
      historyData: {
        totalIntake: 0,
        totalBurned: 0,
        netEnergy: 0,
        dietRecords: [],
        exerciseRecords: []
      },
      historyLoaded: false
    });
  },

  // 日期选择（单日）
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({
      selectedDate: date,
      selectedWeekday: this.getWeekday(date)
    });
    this.loadHistoryForSingleDate(date);
  },

  // 清除选择（回到列表）
  onClearDate() {
    this.setData({
      selectedDate: '',
      selectedWeekday: '',
      historyData: {
        totalIntake: 0,
        totalBurned: 0,
        netEnergy: 0,
        dietRecords: [],
        exerciseRecords: []
      }
    });
    this.loadHistoryRangeAndBuildList();
  },

  onDateGroupHeaderTap(e) {
    const date = e.currentTarget.dataset.date;
    const dateGroupCollapsed = { ...this.data.dateGroupCollapsed };
    dateGroupCollapsed[date] = !dateGroupCollapsed[date];
    this.setData({ dateGroupCollapsed });
  },

  // 拉单日历史：startDate=endDate=date
  loadHistoryForSingleDate(date) {
    const userId = this.userId || this.getUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载中...' });

    Promise.all([
      wx.cloud.callFunction({
        name: 'getDietHistory',
        data: { userId, startDate: date, endDate: date }
      }),
      wx.cloud.callFunction({
        name: 'getExerciseHistory',
        data: { userId, startDate: date, endDate: date }
      })
    ]).then(([dietRes, exRes]) => {
      const dietData = dietRes?.result || {};
      const exData = exRes?.result || {};

      const dietRecords = (dietData.code === 200 && dietData.data?.records) ? dietData.data.records : [];
      const exerciseRecords = (exData.code === 200 && exData.data?.records) ? exData.data.records : [];

      const mappedDiet = this.mapDietHistoryRecords(dietRecords);
      const mappedEx = this.mapExerciseHistoryRecords(exerciseRecords);

      const totalIntake = mappedDiet.reduce((sum, r) => sum + (Number(r.kcal) || 0), 0);
      const totalBurned = mappedEx.reduce((sum, r) => sum + (Number(r.kcal) || 0), 0);

      this.setData({
        historyData: {
          totalIntake,
          totalBurned,
          netEnergy: totalIntake - totalBurned,
          dietRecords: mappedDiet,
          exerciseRecords: mappedEx
        }
      });
    }).catch(err => {
      console.error('[loadHistoryForSingleDate] error:', err);
      wx.showToast({ title: err?.errMsg || '加载失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // 拉范围历史（默认最近 30 天）并构建列表分组
  loadHistoryRangeAndBuildList() {
    const userId = this.userId || this.getUserId();
    if (!userId) return;

    const endDate = this.getTodayStr();
    const startDate = this.addDays(endDate, -30); // 最近 30 天（你可以改成 -14 / -60）

    wx.showLoading({ title: '加载中...' });

    Promise.all([
      wx.cloud.callFunction({
        name: 'getDietHistory',
        data: { userId, startDate, endDate }
      }),
      wx.cloud.callFunction({
        name: 'getExerciseHistory',
        data: { userId, startDate, endDate }
      })
    ]).then(([dietRes, exRes]) => {
      const dietData = dietRes?.result || {};
      const exData = exRes?.result || {};

      const dietRecords = (dietData.code === 200 && dietData.data?.records) ? dietData.data.records : [];
      const exerciseRecords = (exData.code === 200 && exData.data?.records) ? exData.data.records : [];

      // 分组到 map：date -> { dietRecords, exerciseRecords }
      const map = {};

      (dietRecords || []).forEach(r => {
        const date = r.date;
        if (!date) return;
        if (!map[date]) map[date] = { dietRecords: [], exerciseRecords: [] };
        map[date].dietRecords.push(r);
      });

      (exerciseRecords || []).forEach(r => {
        const date = r.date;
        if (!date) return;
        if (!map[date]) map[date] = { dietRecords: [], exerciseRecords: [] };
        map[date].exerciseRecords.push(r);
      });

      // 生成 historyDataMap（页面内部使用）
      const historyDataMap = {};
      Object.keys(map).forEach(date => {
        const d = this.mapDietHistoryRecords(map[date].dietRecords);
        const ex = this.mapExerciseHistoryRecords(map[date].exerciseRecords);

        const totalIntake = d.reduce((sum, it) => sum + (Number(it.kcal) || 0), 0);
        const totalBurned = ex.reduce((sum, it) => sum + (Number(it.kcal) || 0), 0);

        historyDataMap[date] = {
          totalIntake,
          totalBurned,
          netEnergy: totalIntake - totalBurned,
          dietRecords: d,
          exerciseRecords: ex
        };
      });

      // 构建 allHistoryRecords（按日期倒序）
      const allHistoryRecords = Object.keys(historyDataMap)
        .sort((a, b) => b.localeCompare(a))
        .map(date => ({
          date,
          weekday: this.getWeekday(date),
          ...historyDataMap[date]
        }));

      // 折叠状态初始化/保留
      const dateGroupCollapsed = { ...this.data.dateGroupCollapsed };
      allHistoryRecords.forEach(item => {
        if (dateGroupCollapsed[item.date] === undefined) {
          dateGroupCollapsed[item.date] = false;
        }
      });

      this.setData({
        historyDataMap,
        allHistoryRecords,
        dateGroupCollapsed,
        historyLoaded: true
      });
    }).catch(err => {
      console.error('[loadHistoryRangeAndBuildList] error:', err);
      wx.showToast({ title: err?.errMsg || '加载失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // 后端 diet_records -> 前端 history list item
  mapDietHistoryRecords(records) {
    return (records || []).map((r, idx) => ({
      id: idx + 1,
      recordId: r._id,
      mealType: r.mealType,
      name: r.foodName,                 // 兼容你们原来的 history mock 用 name 字段
      foodName: r.foodName,
      kcal: Number(r.kcal) || 0,
      date: r.date,
      createdAt: r.createdAt
    }));
  },

  // 后端 exercise_records -> 前端 history list item
  mapExerciseHistoryRecords(records) {
    return (records || []).map((r, idx) => ({
      id: idx + 1,
      recordId: r._id,
      name: r.name,                     // exercise_records 用 name
      duration: r.duration,
      kcal: Number(r.kcal) || 0,
      date: r.date,
      createdAt: r.createdAt
    }));
  },

  // -------------------------
  // 日期工具（你原来的）
  // -------------------------
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const d = new Date(date);
    return weekdays[d.getDay()];
  }
});
