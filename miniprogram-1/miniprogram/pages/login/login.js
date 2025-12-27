// pages/login/login.js
Page({
  data: {
    mode: 'login', // 'login' | 'register'
    username: '',
    password: '',
    confirmPassword: '',
    submitting: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  // 检查登录状态（本地标记 + userId 是否存在）
  checkLoginStatus() {
    const currentAccount = wx.getStorageSync('currentAccount');
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const userId = wx.getStorageSync('userId'); // ⭐方案A：users._id

    if (isLoggedIn && currentAccount && userId) {
      // 同步到全局
      const app = getApp();
      if (app) {
        app.globalData.currentAccount = currentAccount;
        app.globalData.isLoggedIn = true;
        app.globalData.userId = userId;
      }

      this.loadAccountData(currentAccount);
      this.redirectToHome();
    }
  },

  // 切换登录/注册模式
  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      mode,
      username: '',
      password: '',
      confirmPassword: ''
    });
  },

  onUsernameInput(e) {
    this.setData({ username: (e.detail.value || '').trim() });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || '' });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value || '' });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const { mode, username, password, confirmPassword } = this.data;


    if (!username || username.length < 3) {
      wx.showToast({ title: '账号至少3个字符', icon: 'none' });
      return;
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少6个字符', icon: 'none' });
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      if (mode === 'register') {
        await this.handleRegister(username, password);
      } else {
        const p=0;
        await this.handleLogin(username, password, p);
      }
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 注册：调用云函数 register
  async handleRegister(username, password) {
    wx.showLoading({ title: '注册中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'register',
        data: { username, password }
      });

      console.log('[register] raw:', res);
      console.log('[register] result:', res.result);

      if (res.result && res.result.code === 200) {
        wx.showToast({ title: '注册成功', icon: 'success' });

        // 先保留你原来的本地初始化（后续可做云端同步）
        this.initAccountData(username);

        await this.sleep(400);
        const p=1;
        await this.handleLogin(username, password, p);
      } else {
        wx.showToast({
          title: (res.result && res.result.message) ? res.result.message : '注册失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('[register] error:', err);
      wx.showToast({ title: err?.errMsg || '注册调用失败', icon: 'none' });
    } finally {
      await this.sleep(1200);
      wx.hideLoading();
    }
  },

  // 登录：调用云函数 login
  async handleLogin(username, password, pp) {
    wx.showLoading({ title: '登录中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { username, password }
      });

      console.log('[login] raw:', res);
      console.log('[login] result:', res.result);

      if (res.result && res.result.success) {
        const user = res.result.user || null;

        // ⭐方案A：把 users._id 当 userId 存起来，给 today / profile 用
        const userId = user && user._id ? user._id : '';

        if (!userId) {
          wx.showToast({ title: '登录成功但缺少userId(_id)', icon: 'none' });
          return;
        }

        // 保存后端用户对象
        wx.setStorageSync('currentUser', user);
        wx.setStorageSync('userId', userId);

        // 同步到全局
        const app = getApp();
        if (app) {
          app.globalData.userId = userId;
        }

        // 登录成功处理（本地标记 + 跳转）
        const p=pp;
        this.handleLoginSuccess(username, userId, p);
      } else {
        wx.showToast({
          title: (res.result && res.result.msg) ? res.result.msg : '登录失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('[login] error:', err);
      wx.showToast({ title: err?.errMsg || '登录调用失败', icon: 'none' });
    } finally {
      await this.sleep(1200);
      wx.hideLoading();
    }
  },

  // 登录成功处理
  handleLoginSuccess(username, userId, pp) {
    wx.setStorageSync('currentAccount', username);
    wx.setStorageSync('isLoggedIn', true);

    const app = getApp();
    if (app) {
      app.globalData.currentAccount = username;
      app.globalData.isLoggedIn = true;
      app.globalData.userId = userId;
    }

    this.loadAccountData(username);
    const p=pp;
    if(p===0){
      this.redirectToHome();
    }
    else{
      this.redirectToEdit();
    }
  },

  // 初始化账号数据（保留你原逻辑）
  initAccountData(username) {
    const accountKey = `account_${username}`;

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

    const todayData = {
      intake: 0,
      burned: 0,
      net: 0,
      meals: [
        { id: 1, name: '早餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/breakfast.png', isEmpty: true },
        { id: 2, name: '午餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/lunch.png', isEmpty: true },
        { id: 3, name: '晚餐', desc: '无', kcal: 0, icon: '/images/diet-exercise/dinner.png', isEmpty: true }
      ],
      exercises: []
    };
    wx.setStorageSync(`${accountKey}_todayData`, todayData);
  },

  // 加载账号数据（保留你原逻辑）
  loadAccountData(username) {
    const accountKey = `account_${username}`;

    let userData = wx.getStorageSync(`${accountKey}_userData`);
    if (!userData) {
      this.initAccountData(username);
      userData = wx.getStorageSync(`${accountKey}_userData`);
    }
    wx.setStorageSync('userData', userData);

    let todayData = wx.getStorageSync(`${accountKey}_todayData`);
    if (!todayData) {
      this.initAccountData(username);
      todayData = wx.getStorageSync(`${accountKey}_todayData`);
    }
    wx.setStorageSync('todayData', todayData);
  },

  redirectToHome() {
    wx.switchTab({
      url: '/pages/mine/index/index'
    });
  },

  redirectToEdit() {
    wx.navigateTo({
      url: '/pages/mine/edit/edit'
    });
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});