// pages/mine/index/index.js
const dataSync = require('../../../utils/dataSync.js');

Page({
  data: {
    statusBarHeight: 0, // 状态栏高度
    // 用户信息
    name: '清小健',
    subtitle: '健身达人',
    gender: '男',
    age: 25,
    weight: 70,
    height: 175,
    
    // 健身目标
    selectedGoal: 'lose', // 'lose' | 'maintain' | 'gain'
    
    // 能量平衡
    energyBalance: 60, // 显示60%意味着剩余60%，已完成40%
    progressAngle: 54, // -90 + 144 = 54度
    intake: 1200,
    burned: 400,
    net: 800,
    
    // 今日摄入
    currentIntake: 1200,
    targetIntake: 2000,
    intakePercent: 60, // 1200 / 2000 * 100
    
    // 今日饮食
    meals: [
      {
        id: 1,
        name: '早餐',
        desc: '面包 + 牛奶 + 鸡蛋',
        kcal: 400,
        icon: '/images/diet-exercise/breakfast.png'
      },
      {
        id: 2,
        name: '午餐',
        desc: '牛肉面 + 烤鸡翅',
        kcal: 800,
        icon: '/images/diet-exercise/lunch.png'
      }
    ]
  },

  // 健身目标切换
  onGoalTap(e) {
    const goal = e.currentTarget.dataset.goal;
    this.setData({ selectedGoal: goal });
  },

  // 编辑个人信息
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/mine/edit/edit'
    });
  },

  onLoad() {
    console.log('我的页面加载');
    
    // 获取状态栏高度，用于自定义导航栏适配
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 0
    });
    
    // 尝试从本地存储加载数据
    this.loadUserData();
    
    // 同步今日摄入数据
    this.syncIntakeFromToday();
  },

  onShow() {
    // 页面显示时，确保数据是最新的
    // 如果从编辑页面返回，数据应该已经通过 setData 更新了
    // 这里可以再次从本地存储加载以确保数据同步
    this.loadUserData();
    
    // 同步今日摄入数据
    this.syncIntakeFromToday();
  },

  // 从本地存储加载用户数据
  loadUserData() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
      const userData = wx.getStorageSync(userDataKey);
      if (userData) {
        this.setData({
          name: userData.name || this.data.name,
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
      
      // 同步用户信息到记录页面（如果已登录）
      if (currentAccount) {
        dataSync.syncFromMineToToday();
      }
    } catch (e) {
      console.error('加载用户数据失败', e);
    }
  },

  // 从记录页面同步今日摄入数据
  syncIntakeFromToday() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const todayDataKey = currentAccount ? `account_${currentAccount}_todayData` : 'todayData';
      const todayData = wx.getStorageSync(todayDataKey);
      if (todayData) {
        const currentIntake = todayData.intake || 0;
        const targetIntake = this.data.targetIntake || 2000;
        const intakePercent = targetIntake > 0 ? Math.min(100, Math.round((currentIntake / targetIntake) * 100)) : 0;
        
        this.setData({
          currentIntake: currentIntake,
          intakePercent: intakePercent
        });
        
        // 更新本地存储
        const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
        const userData = wx.getStorageSync(userDataKey) || {};
        userData.currentIntake = currentIntake;
        userData.intakePercent = intakePercent;
        wx.setStorageSync(userDataKey, userData);
      }
    } catch (e) {
      console.error('同步今日摄入数据失败', e);
    }
  },

  // 保存用户数据到本地存储
  saveUserData() {
    try {
      const currentAccount = wx.getStorageSync('currentAccount');
      const userDataKey = currentAccount ? `account_${currentAccount}_userData` : 'userData';
      const userData = {
        name: this.data.name,
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
      
      // 同步用户信息到记录页面（如果已登录）
      if (currentAccount) {
        dataSync.syncFromMineToToday();
      }
    } catch (e) {
      console.error('保存用户数据失败', e);
    }
  },

  // 健身目标切换
  onGoalTap(e) {
    const goal = e.currentTarget.dataset.goal;
    this.setData({ selectedGoal: goal });
    
    // 保存数据
    const userData = wx.getStorageSync('userData') || {};
    userData.selectedGoal = goal;
    wx.setStorageSync('userData', userData);
  }
});
