// pages/login/login.js
Page({
  data: {
    mode: 'login', // 'login' | 'register'
    username: '',
    password: '',
    confirmPassword: ''
  },

  onLoad() {
    // 检查是否已经登录
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const currentAccount = wx.getStorageSync('currentAccount');
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    
    if (isLoggedIn && currentAccount) {
      // 已经登录，加载账号数据并跳转到首页
      this.loadAccountData(currentAccount);
      this.redirectToHome();
    }
  },

  // 切换登录/注册模式
  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      mode: mode,
      username: '',
      password: '',
      confirmPassword: ''
    });
  },

  // 账号输入
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value.trim()
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  // 提交表单
  onSubmit() {
    const { mode, username, password, confirmPassword } = this.data;

    // 验证输入
    if (!username || username.length < 3) {
      wx.showToast({
        title: '账号至少3个字符',
        icon: 'none'
      });
      return;
    }

    if (!password || password.length < 6) {
      wx.showToast({
        title: '密码至少6个字符',
        icon: 'none'
      });
      return;
    }

    if (mode === 'register') {
      // 注册模式
      if (password !== confirmPassword) {
        wx.showToast({
          title: '两次密码不一致',
          icon: 'none'
        });
        return;
      }

      this.handleRegister(username, password);
    } else {
      // 登录模式
      this.handleLogin(username, password);
    }
  },

  // 处理注册
  handleRegister(username, password) {
    // 检查账号是否已存在
    const accounts = this.getAllAccounts();
    if (accounts[username]) {
      wx.showToast({
        title: '账号已存在',
        icon: 'none'
      });
      return;
    }

    // 保存账号信息（密码使用简单加密，实际项目中应该使用更安全的方式）
    accounts[username] = {
      password: this.simpleEncrypt(password),
      createTime: new Date().getTime()
    };
    wx.setStorageSync('accounts', accounts);

    // 初始化该账号的数据
    this.initAccountData(username);

    wx.showToast({
      title: '注册成功',
      icon: 'success'
    });

    // 自动登录
    setTimeout(() => {
      this.handleLoginSuccess(username);
    }, 1000);
  },

  // 处理登录
  handleLogin(username, password) {
    // 获取所有账号
    const accounts = this.getAllAccounts();
    
    if (!accounts[username]) {
      wx.showToast({
        title: '账号不存在',
        icon: 'none'
      });
      return;
    }

    // 验证密码
    const encryptedPassword = this.simpleEncrypt(password);
    if (accounts[username].password !== encryptedPassword) {
      wx.showToast({
        title: '密码错误',
        icon: 'none'
      });
      return;
    }

    // 登录成功
    this.handleLoginSuccess(username);
  },

  // 登录成功处理
  handleLoginSuccess(username) {
    // 保存当前登录账号
    wx.setStorageSync('currentAccount', username);
    wx.setStorageSync('isLoggedIn', true);
    
    // 更新全局数据
    const app = getApp();
    if (app) {
      app.globalData.currentAccount = username;
      app.globalData.isLoggedIn = true;
    }

    // 加载该账号的数据
    this.loadAccountData(username);

    // 跳转到首页
    this.redirectToHome();
  },

  // 获取所有账号
  getAllAccounts() {
    try {
      return wx.getStorageSync('accounts') || {};
    } catch (e) {
      return {};
    }
  },

  // 简单加密（实际项目中应使用更安全的方式）
  simpleEncrypt(password) {
    // 使用简单的字符串转换作为示例，实际项目中应该使用更安全的加密方式
    // 这里使用简单的hash算法
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  },

  // 初始化账号数据
  initAccountData(username) {
    const accountKey = `account_${username}`;
    
    // 初始化用户数据
    const userData = {
      name: '清小健',
      gender: '男',
      age: 25,
      weight: 70,
      height: 175,
      targetIntake: 2000,
      intakePercent: 0,
      currentIntake: 0,
      selectedGoal: 'lose'
    };
    wx.setStorageSync(`${accountKey}_userData`, userData);

    // 初始化今日记录数据
    const todayData = {
      intake: 0,
      burned: 0,
      net: 0,
      meals: [
        {
          id: 1,
          name: '早餐',
          desc: '无',
          kcal: 0,
          icon: '/images/diet-exercise/breakfast.png',
          isEmpty: true
        },
        {
          id: 2,
          name: '午餐',
          desc: '无',
          kcal: 0,
          icon: '/images/diet-exercise/lunch.png',
          isEmpty: true
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
      exercises: []
    };
    wx.setStorageSync(`${accountKey}_todayData`, todayData);
  },

  // 加载账号数据
  loadAccountData(username) {
    const accountKey = `account_${username}`;
    
    // 加载用户数据
    let userData = wx.getStorageSync(`${accountKey}_userData`);
    if (!userData) {
      this.initAccountData(username);
      userData = wx.getStorageSync(`${accountKey}_userData`);
    }
    wx.setStorageSync('userData', userData);

    // 加载今日数据
    let todayData = wx.getStorageSync(`${accountKey}_todayData`);
    if (!todayData) {
      this.initAccountData(username);
      todayData = wx.getStorageSync(`${accountKey}_todayData`);
    }
    wx.setStorageSync('todayData', todayData);
  },

  // 跳转到首页
  redirectToHome() {
    wx.switchTab({
      url: '/pages/meal/recommend/recommend'
    });
  }
});
