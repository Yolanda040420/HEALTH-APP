// pages/forum/publish/publish.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,
    content: '',
    images: [] // 本地临时路径数组 tempFilePaths
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;

    this.setData({
      statusBarHeight,
      navbarHeight
    });
  },

  // 统一拿登录用户信息（给后端 userId/username/name/avatar 用）
  getCurrentUserCtx() {
    const app = getApp();
    const currentUser = wx.getStorageSync('currentUser') || {};
    const userData = wx.getStorageSync('userData') || {};
    const userInfo = wx.getStorageSync('userInfo') || {}; // 可能有 nickName/avatarUrl（微信授权）

    const userId =
      (app && app.globalData && app.globalData.userId) ||
      wx.getStorageSync('userId') ||
      (currentUser._id || '') ||
      '';

    // 你们是账号密码登录，所以 username 优先 currentAccount
    const username =
      wx.getStorageSync('currentAccount') ||
      currentUser.username ||
      '';

    // 展示名：优先 userData.name（个人资料里填的），其次微信 nickName，再其次 username
    const name =
      userData.name ||
      userInfo.nickName ||
      currentUser.name ||
      username ||
      '';

    // 头像：如果你们有微信头像就用，否则用 currentUser.avatar，再否则空串
    const authorAvatar =
      userInfo.avatarUrl ||
      currentUser.avatar ||
      '';

    return { userId, username, name, authorAvatar };
  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 选择图片（最多9张）
  onChooseImage() {
    const remain = 9 - (this.data.images || []).length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths || [];
        const images = (this.data.images || []).concat(tempFilePaths);
        this.setData({
          images: images.slice(0, 9)
        });
      }
    });
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = (this.data.images || []).slice();
    images.splice(index, 1);
    this.setData({ images });
  },

  // 发布：上传图片 -> 调 forumCreatePost
  async onPublish() {
    const content = (this.data.content || '').trim();
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    // 后端必填 title：用内容自动生成
    const title = content.length > 20 ? content.slice(0, 20) + '…' : content;

    // ✅ 按你新后端要求：必须带 userId + username
    const { userId, username, name, authorAvatar } = this.getCurrentUserCtx();
    if (!userId || !username) {
      wx.showToast({ title: '请先登录再发布', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    try {
      // 1) 上传图片（tempFilePath -> fileID）
      const tempPaths = this.data.images || [];
      const fileIDs = await this.uploadImages(tempPaths);

      // 2) 调云函数发帖（匹配你最新 forumCreatePost）
      const resp = await wx.cloud.callFunction({
        name: 'forumCreatePost',
        data: {
          title,
          content,
          tags: [],        // 暂无标签就传空数组
          images: fileIDs, // fileID 数组

          userId,
          username,
          name,
          authorAvatar
        }
      });

      const r = resp && resp.result ? resp.result : {};
      if (r.code === 200) {
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 800);
      } else {
        wx.showToast({ title: r.message || '发布失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[publish] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '发布失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 上传多张图片：返回 fileID 数组
  uploadImages(tempPaths) {
    if (!tempPaths || tempPaths.length === 0) return Promise.resolve([]);

    const tasks = tempPaths.map((filePath, idx) => {
      const ext = this.getFileExt(filePath);
      const cloudPath = `forum/posts/${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}${ext}`;

      return wx.cloud.uploadFile({
        cloudPath,
        filePath
      }).then(res => res.fileID);
    });

    return Promise.all(tasks);
  },

  getFileExt(filePath) {
    if (!filePath) return '.jpg';
    const m = filePath.match(/\.\w+$/);
    return m ? m[0] : '.jpg';
  },

  // 返回
  onBack() {
    wx.navigateBack();
  }
});