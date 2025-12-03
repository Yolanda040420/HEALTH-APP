// pages/mine/index/index.js
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
  },

  onShow() {
    // 页面显示时，确保数据是最新的
    // 如果从编辑页面返回，数据应该已经通过 setData 更新了
    // 这里可以再次从本地存储加载以确保数据同步
    this.loadUserData();
  },

  // 从本地存储加载用户数据
  loadUserData() {
    try {
      const userData = wx.getStorageSync('userData');
      if (userData) {
        this.setData({
          name: userData.name || this.data.name,
          gender: userData.gender || this.data.gender,
          age: userData.age || this.data.age,
          weight: userData.weight || this.data.weight,
          height: userData.height || this.data.height,
          targetIntake: userData.targetIntake || this.data.targetIntake,
          intakePercent: userData.intakePercent || this.data.intakePercent
        });
      }
    } catch (e) {
      console.error('加载用户数据失败', e);
    }
  },

  // 保存用户数据到本地存储
  saveUserData() {
    try {
      wx.setStorageSync('userData', {
        name: this.data.name,
        gender: this.data.gender,
        age: this.data.age,
        weight: this.data.weight,
        height: this.data.height,
        targetIntake: this.data.targetIntake,
        intakePercent: this.data.intakePercent
      });
    } catch (e) {
      console.error('保存用户数据失败', e);
    }
  }
});
