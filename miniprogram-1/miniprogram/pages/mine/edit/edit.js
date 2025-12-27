// pages/mine/edit/edit.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,

    name: '清小健',
    gender: '男',
    genderOptions: ['男', '女'],
    genderIndex: 0,
    age: 25,
    weight: 70,
    height: 175,

    currentIntake: 1200,
    targetIntake: 2000,
    intakePercent: 60,

    submitting: false
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;
    this.setData({ statusBarHeight, navbarHeight });

    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage && prevPage.data) {
      this.setData({
        name: prevPage.data.name || '清小健',
        gender: prevPage.data.gender || '男',
        genderIndex: prevPage.data.gender === '女' ? 1 : 0,
        age: prevPage.data.age || 25,
        weight: prevPage.data.weight || 70,
        height: prevPage.data.height || 175,
        currentIntake: prevPage.data.currentIntake || 1200,
        targetIntake: prevPage.data.targetIntake || 2000,
        intakePercent: prevPage.data.intakePercent || 60
      });
    }

    // ✅再刷新一次今日摄入（云端 totalIntake）
    this.refreshTodayIntake();
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

  async refreshTodayIntake() {
    const currentAccount = wx.getStorageSync('currentAccount');
    const todayDataKey = currentAccount ? `account_${currentAccount}_todayData` : 'todayData';

    let currentIntake = 0;

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

          // 写回本地 todayData
          const todayData = wx.getStorageSync(todayDataKey) || {};
          todayData.intake = currentIntake;
          wx.setStorageSync(todayDataKey, todayData);
        }
      } catch (e) {
        console.error('[getTodayDiet] error:', e);
      }
    }

    if (!currentIntake) {
      try {
        const todayData = wx.getStorageSync(todayDataKey);
        if (todayData) currentIntake = Number(todayData.intake) || 0;
      } catch (e) {}
    }

    const targetIntake = Number(this.data.targetIntake) || 2000;
    const intakePercent = targetIntake > 0
      ? Math.min(100, Math.round((currentIntake / targetIntake) * 100))
      : 0;

    this.setData({ currentIntake, intakePercent });
  },

  onBack() { 
    wx.switchTab({
      url: '/pages/mine/index/index'
    });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },

  onGenderChange(e) {
    const index = parseInt(e.detail.value, 10);
    this.setData({
      genderIndex: index,
      gender: this.data.genderOptions[index]
    });
  },

  onAgeInput(e) { this.setData({ age: e.detail.value }); },
  onWeightInput(e) { this.setData({ weight: e.detail.value }); },
  onHeightInput(e) { this.setData({ height: e.detail.value }); },

  onTargetIntakeInput(e) {
    const targetIntake = parseInt(e.detail.value, 10) || 0;
    const currentIntake = this.data.currentIntake;
    const intakePercent = targetIntake > 0
      ? Math.min(100, Math.round((currentIntake / targetIntake) * 100))
      : 0;

    this.setData({ targetIntake, intakePercent });
  },

  async onSave() {
    if (this.data.submitting) return;

    // 校验
    if (!this.data.name || this.data.name.trim() === '') {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!this.data.age || Number(this.data.age) <= 0 || Number(this.data.age) >= 100) {
      wx.showToast({ title: '请输入有效年龄', icon: 'none' });
      return;
    }
    if (!this.data.weight || Number(this.data.weight) <= 0 || Number(this.data.weight) >= 200) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }
    if (!this.data.height || Number(this.data.height) <= 0 || Number(this.data.height) >= 250) {
      wx.showToast({ title: '请输入有效身高', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...' });

    // 1) 先写本地（保持你原来结构）
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';

      const userData = {
        name: this.data.name,
        gender: this.data.gender,
        age: parseInt(this.data.age, 10),
        weight: parseFloat(this.data.weight),
        height: parseFloat(this.data.height),
        targetIntake: parseInt(this.data.targetIntake, 10),
        intakePercent: this.data.intakePercent
      };

      wx.setStorageSync(userDataKey, userData);
    } catch (e) {
      console.error('保存本地数据失败', e);
    }

    // 2) 更新上一页显示 + 调用上一页 saveUserData（你原逻辑）
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({
        name: this.data.name,
        gender: this.data.gender,
        age: parseInt(this.data.age, 10),
        weight: parseFloat(this.data.weight),
        height: parseFloat(this.data.height),
        targetIntake: parseInt(this.data.targetIntake, 10),
        intakePercent: this.data.intakePercent
      });

      if (typeof prevPage.saveUserData === 'function') {
        prevPage.saveUserData();
      }
    }

    // 3) 同步云端 users（方案A：userId=_id）
    const userId = this.getUserId();
    if (userId) {
      // fitnessGoal 需要从上一页（mine/index）拿 selectedGoal 进行映射，拿不到就不覆盖
      let fitnessGoal;
      try {
        const goal = prevPage && prevPage.data ? prevPage.data.selectedGoal : '';
        if (goal === 'maintain') fitnessGoal = 'maintain';
        else if (goal === 'gain') fitnessGoal = 'muscle_gain';
        else if (goal === 'lose') fitnessGoal = 'fat_loss';
      } catch (e) {}

      try {
        await wx.cloud.callFunction({
          name: 'saveUserProfile',
          data: {
            userId,
            name: this.data.name,
            sex: this.data.gender === '女' ? 'female' : 'male',
            age: parseInt(this.data.age, 10),
            weight: parseFloat(this.data.weight),
            height: parseFloat(this.data.height),
            targetIntake: parseInt(this.data.targetIntake, 10),
            ...(fitnessGoal ? { fitnessGoal } : {})
          }
        });
      } catch (err) {
        console.error('[saveUserProfile] error:', err);
        // 云端失败不阻止返回，只提示
        wx.showToast({ title: '云端同步失败(已存本地)', icon: 'none' });
      }
    }

    wx.hideLoading();
    this.setData({ submitting: false });

    wx.showToast({ title: '保存成功', icon: 'success', duration: 1200 });
    setTimeout(() => this.onBack(), 1200);
  }
});