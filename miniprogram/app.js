// app.js
App({
  globalData: {
    // 云开发环境ID（env参数决定小程序发起的云开发调用会默认请求到哪个云环境的资源）
    // 此处请填入环境ID，环境ID可打开云控制台查看
    // 如不填则使用默认环境（第一个创建的环境）
    env: "",
    userInfo: null,
    isLoggedIn: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const currentAccount = wx.getStorageSync('currentAccount');
    
    this.globalData.isLoggedIn = isLoggedIn;
    this.globalData.currentAccount = currentAccount;
  }
});
