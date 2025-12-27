// pages/mine/index/index.js
const dataSync = require('../../../utils/dataSync.js');

Page({
  data: {
    statusBarHeight: 0,

    name: '清小健',
    subtitle: '健身达人',
    avatarUrl: '', // 用户头像URL
    gender: '男',
    age: 25,
    weight: 70,
    height: 175,

    selectedGoal: 'lose', // 'lose' | 'maintain' | 'gain'

    energyBalance: 60,
    progressAngle: 54,
    intake: 1200,
    burned: 400,
    net: 800,

    currentIntake: 1200,
    targetIntake: 2000,
    intakePercent: 60,

    meals: []
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: systemInfo.statusBarHeight || 0 });

    this.loadUserData();
    this.syncIntakeFromToday();      // ✅改成云端优先
    this.loadUserProfileFromCloud(); // 会刷新 targetIntake
  },

  onShow() {
    this.loadUserData();
    this.syncIntakeFromToday();      // ✅改成云端优先
    this.loadUserProfileFromCloud();
  },

  onGoalTap(e) {
    const goal = e.currentTarget.dataset.goal;
    if (!goal) return;

    this.setData({ selectedGoal: goal });
    this.saveUserData();
    this.saveProfileToCloud({ fitnessGoal: this.mapGoalToFitnessGoal(goal) });
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/mine/edit/edit' });
  },

  onLogout() {
    // 1) 清会话态（让所有页面都判定为“未登录”）
    try {
      wx.removeStorageSync('isLoggedIn');
      wx.removeStorageSync('userId');
      wx.removeStorageSync('currentUser');
      wx.removeStorageSync('currentAccount');
  
      // 这两个是“当前活跃缓存”，不清会串号
      wx.removeStorageSync('userData');
      wx.removeStorageSync('todayData');
    } catch (e) {}
  
    // 2) 清全局态
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.isLoggedIn = false;
      app.globalData.userId = '';
      app.globalData.currentAccount = '';
    }
  
    // 3) 跳转到登录页（通常 login 不是 tabBar，用 redirectTo）
    wx.redirectTo({
      url: '/pages/login/login'
    });
  },

  // 点击头像修改头像
  onAvatarTap() {
    const that = this;
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success(res) {
        if (res.tapIndex === 0) {
          // 从相册选择
          that.chooseImage();
        } else if (res.tapIndex === 1) {
          // 拍照
          that.chooseImage(true);
        }
      }
    });
  },

  // 选择图片
  chooseImage(camera = false) {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: camera ? ['camera'] : ['album'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.uploadAvatar(tempFilePath);
      },
      fail(err) {
        console.error('选择图片失败', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 上传头像到云存储
  uploadAvatar(filePath) {
    const that = this;
    wx.showLoading({ title: '上传中...' });

    const userId = this.getUserId();
    if (!userId) {
      wx.hideLoading();
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 生成唯一的文件路径
    const cloudPath = `avatars/${userId}_${Date.now()}.jpg`;

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        console.log('上传成功', res);
        // 获取文件ID
        const fileID = res.fileID;
        
        // 更新本地数据
        that.setData({ avatarUrl: fileID });
        
        // 保存到本地存储
        that.saveUserData();
        
        // 同步到云端
        that.saveProfileToCloud({ avatarUrl: fileID });
        
        wx.hideLoading();
        wx.showToast({ title: '头像更新成功', icon: 'success' });
      },
      fail: err => {
        console.error('上传失败', err);
        wx.hideLoading();
        wx.showToast({ title: '上传失败，请重试', icon: 'none' });
      }
    });
  },

  getUserId() {
    const app = getApp();
    return (
      (app && app.globalData && app.globalData.userId) ||
      wx.getStorageSync('userId') ||
      (wx.getStorageSync('currentUser') && wx.getStorageSync('currentUser')._id) ||
      ''
    );
  },

  // -------------------------
  // 云端：拉取用户 profile（getUserProfile）
  // -------------------------
  loadUserProfileFromCloud() {
    const userId = this.getUserId();
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { userId }
    }).then(res => {
      const r = res && res.result ? res.result : {};
      if (r.code !== 200 || !r.data) return;

      const d = r.data;
      const gender = d.sex === 'female' ? '女' : '男';
      const selectedGoal = this.mapFitnessGoalToGoal(d.fitnessGoal);

      this.setData({
        name: d.name || this.data.name,
        avatarUrl: d.avatarUrl || this.data.avatarUrl,
        gender,
        age: d.age ?? this.data.age,
        weight: d.weight ?? this.data.weight,
        height: d.height ?? this.data.height,
        targetIntake: d.targetIntake ?? this.data.targetIntake,
        selectedGoal
      });

      // 写回本地
      this.saveUserData();

      // ⭐关键：targetIntake 刚更新，立刻重新算一次 intakePercent
      this.syncIntakeFromToday();

      try { dataSync.syncFromMineToToday(); } catch (e) {}
    }).catch(err => {
      console.error('[getUserProfile] error:', err);
    });
  },

  saveProfileToCloud(partial = {}) {
    const userId = this.getUserId();
    if (!userId) return;

    const payload = {
      userId,
      name: this.data.name,
      avatarUrl: this.data.avatarUrl || '',
      sex: this.data.gender === '女' ? 'female' : 'male',
      age: Number(this.data.age) || 0,
      weight: Number(this.data.weight) || 0,
      height: Number(this.data.height) || 0,
      targetIntake: Number(this.data.targetIntake) || 2000,
      fitnessGoal: this.mapGoalToFitnessGoal(this.data.selectedGoal)
    };

    Object.keys(partial).forEach(k => { payload[k] = partial[k]; });

    wx.cloud.callFunction({
      name: 'saveUserProfile',
      data: payload
    }).then(res => {
      const r = res && res.result ? res.result : {};
      if (r.code !== 200) console.warn('[saveUserProfile] failed:', r);
    }).catch(err => {
      console.error('[saveUserProfile] error:', err);
    });
  },

  // -------------------------
  // 本地：从本地存储加载用户数据
  // -------------------------
  loadUserData() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
      const userData = wx.getStorageSync(userDataKey);

      if (userData) {
        this.setData({
          name: userData.name || this.data.name,
          avatarUrl: userData.avatarUrl || this.data.avatarUrl,
          gender: userData.gender || this.data.gender,
          age: userData.age || this.data.age,
          weight: userData.weight || this.data.weight,
          height: userData.height || this.data.height,
          targetIntake: userData.targetIntake || this.data.targetIntake,
          intakePercent: userData.intakePercent || this.data.intakePercent,
          currentIntake: userData.currentIntake || this.data.currentIntake,
          selectedGoal: userData.selectedGoal || this.data.selectedGoal
        });
      }

      if (currentAccount) {
        try { dataSync.syncFromMineToToday(); } catch (e) {}
      }
    } catch (e) {
      console.error('加载用户数据失败', e);
    }
  },

  // -------------------------
  // ✅ 修复点：今日摄入优先走云端 getTodayDiet 的 totalIntake
  // -------------------------
  async syncIntakeFromToday() {
    const currentAccount = wx.getStorageSync('currentAccount');
    const todayDataKey = currentAccount ? `account_${currentAccount}_todayData` : 'todayData';
    const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';

    let currentIntake = 0;

    // 1) 云端优先
    const userId = this.getUserId();
    if (userId) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getTodayDiet',
          data: { userId }
        });

        const r = res && res.result ? res.result : {};
        if (r.code === 200 && r.data) {
          currentIntake = Number(r.data.totalIntake) || 0;

          // 写回本地 todayData（兼容你原来的读取逻辑）
          const todayData = wx.getStorageSync(todayDataKey) || {};
          todayData.intake = currentIntake;
          wx.setStorageSync(todayDataKey, todayData);
        }
      } catch (e) {
        console.error('[getTodayDiet] error:', e);
      }
    }

    // 2) 云端失败/未登录 -> fallback 本地
    if (!currentIntake) {
      try {
        const todayData = wx.getStorageSync(todayDataKey);
        if (todayData) currentIntake = Number(todayData.intake) || 0;
      } catch (e) {}
    }

    // 3) 计算 percent（用当前页面的 targetIntake）
    const targetIntake = Number(this.data.targetIntake) || 2000;
    const intakePercent = targetIntake > 0
      ? Math.min(100, Math.round((currentIntake / targetIntake) * 100))
      : 0;

    this.setData({ currentIntake, intakePercent });

    // 4) 写回本地 userData（Mine/Edit 都用得到）
    try {
      const userData = wx.getStorageSync(userDataKey) || {};
      userData.currentIntake = currentIntake;
      userData.intakePercent = intakePercent;
      wx.setStorageSync(userDataKey, userData);
    } catch (e) {}
  },

  saveUserData() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';

      const userData = {
        name: this.data.name,
        avatarUrl: this.data.avatarUrl,
        gender: this.data.gender,
        age: this.data.age,
        weight: this.data.weight,
        height: this.data.height,
        targetIntake: this.data.targetIntake,
        intakePercent: this.data.intakePercent,
        currentIntake: this.data.currentIntake,
        selectedGoal: this.data.selectedGoal
      };

      wx.setStorageSync(userDataKey, userData);

      if (currentAccount) {
        try { dataSync.syncFromMineToToday(); } catch (e) {}
      }
    } catch (e) {
      console.error('保存用户数据失败', e);
    }
  },

  mapGoalToFitnessGoal(goal) {
    if (goal === 'maintain') return 'maintain';
    if (goal === 'gain') return 'muscle_gain';
    return 'fat_loss';
  },

  mapFitnessGoalToGoal(fitnessGoal) {
    if (fitnessGoal === 'maintain') return 'maintain';
    if (fitnessGoal === 'muscle_gain') return 'gain';
    return 'lose';
  }
});