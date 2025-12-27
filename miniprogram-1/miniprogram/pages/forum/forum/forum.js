// pages/forum/forum/forum.js
Page({
  data: {
    // 顶部论坛 / 资讯
    activeTab: 'forum',

    // 论坛排序
    sortType: 'latest', // 'latest' | 'hot'

    // 消息提醒（保留你原有逻辑）
    notificationVisible: false,
    hasNewNotifications: false,
    notifications: [],

    // 论坛帖子列表（后端拉取）
    posts: [],
    sortedPosts: [],

    // 分页
    page: 0,         // 后端是 0-based page
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    loadingMore: false,

    // ========== 资讯：云数据库 info_articles ==========
    articles: [],
    articlePage: 0,
    articlePageSize: 10,
    articleTotal: 0,
    articleHasMore: true,
    articleLoading: false,
    articleLoadingMore: false
  },

  // -------------------------
  // 获取当前登录用户上下文（给 forumLikePost / forumDeletePost / forumHasLikedPost 等用）
  // -------------------------
  getCurrentUserCtx() {
    const app = getApp();
    const currentUser = wx.getStorageSync('currentUser') || {};
    const userData = wx.getStorageSync('userData') || {};

    const userId =
      (app && app.globalData && app.globalData.userId) ||
      wx.getStorageSync('userId') ||
      (currentUser._id || '') ||
      '';

    const username =
      wx.getStorageSync('currentAccount') ||
      currentUser.username ||
      '';

    const name =
      userData.name ||
      currentUser.name ||
      '';

    // 这里只是“当前用户”的资料；帖子作者头像/姓名由后端 forumGetPosts 动态拼出来
    const avatar =
      userData.avatarUrl ||
      currentUser.avatarUrl ||
      currentUser.avatar ||
      '/images/tabbar/mine.png';

    return { userId, username, name, avatar };
  },

  // -------------------------
  // 生命周期
  // -------------------------
  onLoad() {
    console.log('论坛页面加载');
    this.loadNotifications();
    this.refreshForumPosts(true);
  },

  onShow() {
    this.loadNotifications();

    if (this.data.activeTab === 'forum') {
      this.refreshForumPosts(true);
    } else {
      this.refreshInfoArticles(true);
    }
  },

  onPullDownRefresh() {
    const p = (this.data.activeTab === 'forum')
      ? this.refreshForumPosts(true)
      : this.refreshInfoArticles(true);

    Promise.resolve(p).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.activeTab === 'forum') {
      this.loadMoreForumPosts();
    } else {
      this.loadMoreInfoArticles();
    }
  },

  // -------------------------
  // 顶部 Tab 切换
  // -------------------------
  onSubTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });

    if (tab === 'forum') {
      this.refreshForumPosts(true);
    } else {
      this.refreshInfoArticles(true);
    }
  },

  // -------------------------
  // 排序
  // -------------------------
  onSortTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ sortType: type });
    this.sortPosts();
  },

  sortPosts() {
    const sortType = this.data.sortType;
    const posts = (this.data.posts || []).slice();

    if (sortType === 'latest') {
      posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      posts.sort((a, b) => {
        const scoreA = (a.hot || 0) * 2 + (a.likes || 0) + (a.comments || 0);
        const scoreB = (b.hot || 0) * 2 + (b.likes || 0) + (b.comments || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    }

    this.setData({ sortedPosts: posts });
  },

  // -------------------------
  // 后端拉取：forumGetPosts
  // ✅注意：后端已基于 users 拼接 authorName/authorAvatar（最新）
  // 前端只需要映射 & 补 liked
  // -------------------------
  refreshForumPosts(reset = true) {
    if (this.data.loading) return Promise.resolve();

    const page = reset ? 0 : this.data.page;
    const pageSize = this.data.pageSize;

    this.setData({
      loading: true,
      page: page
    });

    wx.showLoading({ title: '加载中...' });

    return wx.cloud.callFunction({
      name: 'forumGetPosts',
      data: { page, pageSize }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 200) {
        wx.showToast({ title: r.message || '加载失败', icon: 'none' });
        return;
      }

      const data = r.data || {};
      const list = data.list || [];
      const total = Number(data.total) || 0;

      const mapped = list.map(p => this.mapPostFromBackend(p));

      this.setData({
        posts: mapped,
        total: total,
        page: 0,
        hasMore: mapped.length < total
      });

      this.sortPosts();

      // ✅补全 liked（依赖 userId）
      return this.syncLikedStatesForPosts(mapped);
    }).catch(err => {
      console.error('[forumGetPosts] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loading: false });
      wx.hideLoading();
    });
  },

  loadMoreForumPosts() {
    if (this.data.loadingMore || this.data.loading) return;
    if (!this.data.hasMore) return;

    this.setData({ loadingMore: true });

    const nextPage = this.data.page + 1;
    const pageSize = this.data.pageSize;

    wx.cloud.callFunction({
      name: 'forumGetPosts',
      data: { page: nextPage, pageSize }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 200) {
        wx.showToast({ title: r.message || '加载失败', icon: 'none' });
        return;
      }

      const data = r.data || {};
      const list = data.list || [];
      const total = Number(data.total) || this.data.total;

      const mapped = list.map(p => this.mapPostFromBackend(p));
      const merged = (this.data.posts || []).concat(mapped);

      this.setData({
        posts: merged,
        total: total,
        page: nextPage,
        hasMore: merged.length < total
      });

      this.sortPosts();

      // ✅只补新段 liked，再合并写回 this.data.posts
      return this.syncLikedStatesForPosts(mapped, { mergeIntoAll: true });
    }).catch(err => {
      console.error('[forumGetPosts-more] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loadingMore: false });
    });
  },

  // -------------------------
  // ✅ 用后端 forumHasLikedPost 为 posts 补齐 liked
  // -------------------------
  syncLikedStatesForPosts(postsSegment, opts = {}) {
    const mergeIntoAll = !!opts.mergeIntoAll;
    const seg = Array.isArray(postsSegment) ? postsSegment.slice() : [];
    if (!seg.length) return Promise.resolve();

    const ctx = this.getCurrentUserCtx();
    const userId = ctx.userId;

    if (!userId) {
      const updatedSeg = seg.map(p => ({ ...p, liked: false }));
      updatedSeg.forEach(p => this.saveReactionState(p.id, { liked: false }));

      if (mergeIntoAll) {
        const all = (this.data.posts || []).slice();
        const map = {};
        updatedSeg.forEach(p => { map[String(p.id)] = p; });
        const mergedAll = all.map(p => map[String(p.id)] ? map[String(p.id)] : p);
        this.setData({ posts: mergedAll });
      } else {
        this.setData({ posts: updatedSeg });
      }
      this.sortPosts();
      return Promise.resolve();
    }

    const tasks = seg.map(p => {
      return wx.cloud.callFunction({
        name: 'forumHasLikedPost',
        data: { postId: p.id, userId: userId }
      }).then(res => {
        const r = (res && res.result) ? res.result : {};
        const liked = !!(r && (r.code === 0 || r.code === 200) && r.data && r.data.liked);
        return { ...p, liked: liked };
      }).catch(() => p);
    });

    return Promise.all(tasks).then(updatedSeg => {
      updatedSeg.forEach(p => this.saveReactionState(p.id, { liked: !!p.liked }));

      if (mergeIntoAll) {
        const all = (this.data.posts || []).slice();
        const map = {};
        updatedSeg.forEach(p => { map[String(p.id)] = p; });
        const mergedAll = all.map(p => map[String(p.id)] ? map[String(p.id)] : p);
        this.setData({ posts: mergedAll });
      } else {
        this.setData({ posts: updatedSeg });
      }

      this.sortPosts();
    });
  },

  // -------------------------
  // 点赞：先用 forumHasLikedPost 确认云端当前状态，再调 forumLikePost
  // -------------------------
  onLikeTap(e) {
    const id = e.currentTarget.dataset.id; // postId
    if (!id) return;

    const ctx = this.getCurrentUserCtx();
    const userId = ctx.userId;

    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const posts = (this.data.posts || []).slice();
    const idx = posts.findIndex(p => String(p.id) === String(id));
    if (idx < 0) return;

    const old = posts[idx];

    wx.cloud.callFunction({
      name: 'forumHasLikedPost',
      data: { postId: id, userId: userId }
    }).then(resp => {
      const r0 = (resp && resp.result) ? resp.result : {};
      if (r0.code !== 0 && r0.code !== 200) {
        wx.showToast({ title: r0.message || '状态查询失败', icon: 'none' });
        return;
      }

      const likedNow = !!(r0.data && r0.data.liked);
      const action = likedNow ? 'unlike' : 'like';

      // 乐观更新 UI
      const nextLiked = !likedNow;
      const nextLikes = Math.max(0, (old.likes || 0) + (nextLiked ? 1 : -1));
      posts[idx] = { ...old, liked: nextLiked, likes: nextLikes };

      this.setData({ posts: posts });
      this.sortPosts();
      this.saveReactionState(id, { liked: nextLiked });

      return wx.cloud.callFunction({
        name: 'forumLikePost',
        data: { postId: id, action: action, userId: userId }
      }).then(res => {
        const r = (res && res.result) ? res.result : {};
        if (r.code !== 0 && r.code !== 200) {
          throw new Error(r.message || '操作失败');
        }

        const fixedPosts = (this.data.posts || []).slice();
        const j = fixedPosts.findIndex(p => String(p.id) === String(id));
        if (j >= 0) {
          const likeCount = (r.data && r.data.likeCount !== undefined)
            ? Number(r.data.likeCount)
            : fixedPosts[j].likes;

          fixedPosts[j] = {
            ...fixedPosts[j],
            likes: isNaN(likeCount) ? fixedPosts[j].likes : likeCount,
            liked: (action === 'like')
          };
          this.setData({ posts: fixedPosts });
          this.sortPosts();
          this.saveReactionState(id, { liked: (action === 'like') });
        }
      }).catch(err => {
        // 失败回滚
        const rollback = (this.data.posts || []).slice();
        const j = rollback.findIndex(p => String(p.id) === String(id));
        if (j >= 0) {
          rollback[j] = { ...rollback[j], liked: old.liked, likes: old.likes };
          this.setData({ posts: rollback });
          this.sortPosts();
          this.saveReactionState(id, { liked: old.liked });
        }
        wx.showToast({ title: (err && err.message) ? err.message : '操作失败', icon: 'none' });
      });
    }).catch(err => {
      console.error('[forumHasLikedPost] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '状态查询失败', icon: 'none' });
    });
  },

  // -------------------------
  // 删除帖子：forumDeletePost
  // -------------------------
  onDeletePost(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const ctx = this.getCurrentUserCtx();
    const userId = ctx.userId;

    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定删除这条帖子吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });

        wx.cloud.callFunction({
          name: 'forumDeletePost',
          data: { postId: id, userId: userId }
        }).then(resp => {
          const r = (resp && resp.result) ? resp.result : {};
          if (r.code !== 0 && r.code !== 200) {
            wx.showToast({ title: r.message || '删除失败', icon: 'none' });
            return;
          }

          wx.showToast({ title: '删除成功', icon: 'success' });
          this.refreshForumPosts(true);
        }).catch(err => {
          console.error('[forumDeletePost] error:', err);
          wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '删除失败', icon: 'none' });
        }).finally(() => {
          wx.hideLoading();
        });
      }
    });
  },

  // -------------------------
  // 跳转
  // -------------------------
  onPublish() {
    wx.navigateTo({ url: '/pages/forum/publish/publish' });
  },

  onViewFullPost(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/forum/detail/detail?id=${id}` });
  },

  onPostCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/forum/detail/detail?id=${id}` });
  },

  onCommentTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/forum/detail/detail?id=${id}` });
  },

  // =========================
  // 资讯：info_articles
  // =========================
  getInfoQuery() {
    const db = wx.cloud.database();
    return db.collection('info_articles').where({ status: 'published' });
  },

  refreshInfoArticles(reset = true) {
    if (this.data.articleLoading) return Promise.resolve();

    const page = reset ? 0 : this.data.articlePage;
    const pageSize = this.data.articlePageSize;

    this.setData({
      articleLoading: true,
      articlePage: page
    });

    wx.showLoading({ title: '加载中...' });

    const query = this.getInfoQuery();

    return Promise.all([
      query.count(),
      query.orderBy('createdAt', 'desc').skip(page * pageSize).limit(pageSize).get()
    ]).then(arr => {
      const countRes = arr[0];
      const listRes = arr[1];

      const total = Number(countRes && countRes.total) || 0;
      const list = (listRes && listRes.data) ? listRes.data : [];

      const mapped = list.map(a => this.mapArticleFromBackend(a));

      this.setData({
        articles: mapped,
        articleTotal: total,
        articleHasMore: mapped.length < total,
        articlePage: page
      });
    }).catch(err => {
      console.error('[info_articles] refresh error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ articleLoading: false });
      wx.hideLoading();
    });
  },

  loadMoreInfoArticles() {
    if (this.data.articleLoadingMore || this.data.articleLoading) return;
    if (!this.data.articleHasMore) return;

    this.setData({ articleLoadingMore: true });

    const nextPage = this.data.articlePage + 1;
    const pageSize = this.data.articlePageSize;

    const query = this.getInfoQuery();

    query.orderBy('createdAt', 'desc')
      .skip(nextPage * pageSize)
      .limit(pageSize)
      .get()
      .then(res => {
        const list = (res && res.data) ? res.data : [];
        const mapped = list.map(a => this.mapArticleFromBackend(a));

        const merged = (this.data.articles || []).concat(mapped);
        const total = this.data.articleTotal;

        this.setData({
          articles: merged,
          articlePage: nextPage,
          articleHasMore: merged.length < total
        });
      })
      .catch(err => {
        console.error('[info_articles] load more error:', err);
        wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ articleLoadingMore: false });
      });
  },

  onArticleScrollToLower() {
    this.loadMoreInfoArticles();
  },

  onImageTap(e) {
    const src = e.currentTarget.dataset.src;
    const id = e.currentTarget.dataset.id;

    if (!src) return;

    const article = (this.data.articles || []).find(a => String(a.id) === String(id));
    const urls = article && Array.isArray(article.images) ? article.images : [src];

    wx.previewImage({
      current: src,
      urls: urls
    });
  },

  mapArticleFromBackend(a) {
    const id = a._id || a.id;
    const title = a.title || '';
    const content = a.content || '';
    const images = Array.isArray(a.images) ? a.images : [];

    const snippet = content.length > 80 ? (content.slice(0, 80) + '…') : content;
    const ts = this.toTimestamp(a.createdAt || a.updatedAt);

    return {
      id,
      title,
      content,
      snippet,
      images,
      imageCount: images.length,
      time: this.formatTime(ts)
    };
  },

  // -------------------------
  // 通知（保留你原有逻辑）
  // -------------------------
  onNotificationTap() {
    this.setData({ notificationVisible: true });
    this.markNotificationsAsRead();
  },

  onCloseNotification() {
    this.setData({ notificationVisible: false });
  },

  onModalContentTap() {},

  loadNotifications() {
    const notifications = wx.getStorageSync('notifications') || [];
    const hasNew = notifications.some(n => !n.read);
    this.setData({
      notifications,
      hasNewNotifications: hasNew
    });
  },

  markNotificationsAsRead() {
    let notifications = wx.getStorageSync('notifications') || [];
    notifications = notifications.map(n => ({ ...n, read: true }));
    wx.setStorageSync('notifications', notifications);
    this.setData({
      notifications,
      hasNewNotifications: false
    });
  },

  onNotificationItemTap(e) {
    const postId = e.currentTarget.dataset.postId;
    if (postId) {
      wx.navigateTo({ url: `/pages/forum/detail/detail?id=${postId}` });
    }
  },

  // -------------------------
  // 工具：后端 -> 前端映射
  // ✅确保显示最新 name/avatar：直接使用后端返回的 authorName/authorAvatar（已从 users 动态拼接）
  // -------------------------
  mapPostFromBackend(p) {
    const postId = p._id;
    const ts = this.toTimestamp(p.createdAt || p.updatedAt);

    // 先用本地缓存顶一下（避免页面闪），随后会被 forumHasLikedPost 覆盖
    const cached = this.getReactionState(postId) || {};
    const liked = !!cached.liked;

    const ctx = this.getCurrentUserCtx();
    const currentUserId = ctx.userId;
    const postUserId = String(p.userId || '');

    return {
      id: postId,
      userId: postUserId,

      author: (p.authorName || p.authorUsername || '匿名用户'),
      avatar: (p.authorAvatar && String(p.authorAvatar).trim()) ? p.authorAvatar : '/images/tabbar/mine.png',

      timestamp: ts,
      time: this.formatTime(ts),

      content: p.content || '',
      showFullText: true,
      images: Array.isArray(p.images) ? p.images : [],

      likes: Number(p.likeCount) || 0,
      hot: Number(p.fireCount) || 0,
      comments: Number(p.commentCount) || 0,

      liked,

      isMine: !!currentUserId && !!postUserId && String(currentUserId) === String(postUserId)
    };
  },

  toTimestamp(v) {
    if (!v) return Date.now();
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return isNaN(t) ? Date.now() : t;
    }
    if (typeof v.getTime === 'function') return v.getTime();
    try {
      const t = Date.parse(String(v));
      return isNaN(t) ? Date.now() : t;
    } catch (e) {
      return Date.now();
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return '刚刚';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}-${day}`;
  },

  // -------------------------
  // 本地 reaction（仍保留：用于首屏不闪烁）
  // -------------------------
  reactionKey(postId) {
    return `forum_reaction_${postId}`;
  },

  getReactionState(postId) {
    const key = this.reactionKey(postId);
    return wx.getStorageSync(key) || {};
  },

  saveReactionState(postId, partial) {
    const key = this.reactionKey(postId);
    const prev = wx.getStorageSync(key) || {};
    const next = { ...prev, ...partial };
    wx.setStorageSync(key, next);
  }
});
