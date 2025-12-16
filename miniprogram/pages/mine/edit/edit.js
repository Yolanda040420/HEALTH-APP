// pages/mine/edit/edit.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132, // 默认值：状态栏(44px) + 导航栏(88rpx = 44px)
    // 用户信息
    name: '清小健',
    gender: '男',
    genderOptions: ['男', '女'],
    genderIndex: 0,
    age: 25,
    weight: 70,
    height: 175,
    
    // 今日摄入
    currentIntake: 1200,
    targetIntake: 2000,
    intakePercent: 60
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88; // 状态栏高度 + 导航栏内容高度(88rpx = 44px)
    this.setData({
      statusBarHeight: statusBarHeight,
      navbarHeight: navbarHeight
    });
    
    // 从上一页获取数据（如果有）
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
  },

  onBack() {
    wx.navigateBack();
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      genderIndex: index,
      gender: this.data.genderOptions[index]
    });
  },

  onAgeInput(e) {
    this.setData({
      age: e.detail.value
    });
  },

  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    });
  },

  onHeightInput(e) {
    this.setData({
      height: e.detail.value
    });
  },

  onTargetIntakeInput(e) {
    const targetIntake = parseInt(e.detail.value) || 0;
    const currentIntake = this.data.currentIntake;
    const intakePercent = targetIntake > 0 ? Math.min(100, Math.round((currentIntake / targetIntake) * 100)) : 0;
    
    this.setData({
      targetIntake: targetIntake,
      intakePercent: intakePercent
    });
  },

  onSave() {
    // 验证数据
    if (!this.data.name || this.data.name.trim() === '') {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.age || this.data.age <= 0) {
      wx.showToast({
        title: '请输入有效年龄',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.weight || this.data.weight <= 0) {
      wx.showToast({
        title: '请输入有效体重',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.height || this.data.height <= 0) {
      wx.showToast({
        title: '请输入有效身高',
        icon: 'none'
      });
      return;
    }
    
    // 保存到本地存储
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
      const userData = {
        name: this.data.name,
        gender: this.data.gender,
        age: parseInt(this.data.age),
        weight: parseFloat(this.data.weight),
        height: parseFloat(this.data.height),
        targetIntake: parseInt(this.data.targetIntake),
        intakePercent: this.data.intakePercent
      };
      wx.setStorageSync(userDataKey, userData);
    } catch (e) {
      console.error('保存数据失败', e);
    }
    
    // 更新上一页的数据
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({
        name: this.data.name,
        gender: this.data.gender,
        age: parseInt(this.data.age),
        weight: parseFloat(this.data.weight),
        height: parseFloat(this.data.height),
        targetIntake: parseInt(this.data.targetIntake),
        intakePercent: this.data.intakePercent
      });
      
      // 如果上一页有保存方法，也调用它
      if (typeof prevPage.saveUserData === 'function') {
        prevPage.saveUserData();
      }
    }
    
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});

