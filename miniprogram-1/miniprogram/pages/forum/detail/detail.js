// pages/forum/detail/detail.js
Page({
  data: {
    statusBarHeight: 0,
    navbarHeight: 132,

    postId: null,
    post: {},

    // 评论（树形：一级评论 + replies）
    comments: [],

    commentText: '',
    replyingTo: null,
    replyingCommentId: null,

    // 分页
    commentPage: 1,
    pageSize: 20,
    commentTotal: 0,
    hasMoreComments: true,
    loadingMore: false,

    // UI 状态
    isMyPost: false
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const navbarHeight = statusBarHeight + 88;

    const postId = options.id;

    this.setData({
      statusBarHeight,
      navbarHeight,
      postId
    });

    // 读本地“是否点过赞/火”（火目前仍走本地；赞会在拉取后用云端纠正）
    this._loadReactionState();

    // 拉取：帖子详情 + 第一页评论
    this.loadPostData(true);
  },

  onPullDownRefresh() {
    this.loadPostData(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadMoreComments();
  },

  // =========================
  // 用户信息（适配你们：账号密码登录 + users._id）
  // =========================
  _getUserMeta() {
    const app = getApp();
    const currentUser = wx.getStorageSync('currentUser') || {};
    const currentAccount = wx.getStorageSync('currentAccount') || '';

    const userId =
      (app && app.globalData && app.globalData.userId) ||
      wx.getStorageSync('userId') ||
      (currentUser && currentUser._id) ||
      '';

    const username = currentAccount || currentUser.username || '';

    return {
      userId: String(userId || '').trim(),
      username: String(username || '').trim()
    };
  },

  // =========================
  // 云端查询：我是否点赞过该帖子
  // =========================
  _hasLikedPostFromCloud(postId) {
    const meta = this._getUserMeta();
    if (!postId || !meta.userId) return Promise.resolve(null);

    return wx.cloud.callFunction({
      name: 'forumHasLikedPost',
      data: { postId, userId: meta.userId }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (!r || (r.code !== 0 && r.code !== 200) || !r.data) return null;
      return !!r.data.liked;
    }).catch(err => {
      console.error('[forumHasLikedPost] error:', err);
      return null;
    });
  },

  _syncPostLikedFromCloud(postId) {
    return this._hasLikedPostFromCloud(postId).then(liked => {
      if (liked === null) return;
      this.setData({ 'post.liked': liked });
      this._saveReactionState({ liked }); // 仅兜底
    });
  },

  // -------------------------
  // 后端拉取：帖子 + 评论（分页）
  // ✅后端已返回最新 authorName/authorAvatar + 评论 name/avatar
  // -------------------------
  loadPostData(reset = false) {
    const postId = this.data.postId;
    if (!postId) return Promise.resolve();

    const page = reset ? 1 : this.data.commentPage;
    const pageSize = this.data.pageSize;

    if (reset) {
      this.setData({
        commentPage: 1,
        hasMoreComments: true,
        loadingMore: false
      });
    }

    wx.showLoading({ title: '加载中...' });

    return wx.cloud.callFunction({
      name: 'forumGetPostDetail',
      data: {
        postId,
        commentPage: page,
        pageSize
      }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 0 && r.code !== 200) {
        wx.showToast({ title: r.message || '加载失败', icon: 'none' });
        return;
      }

      const data = r.data || {};
      const postRaw = data.post || {};
      const commentsRaw = data.comments || [];
      const total = data.commentTotal || 0;

      const mappedPost = this._mapPost(postRaw);
      const tree = this._buildCommentTree(commentsRaw);

      if (reset) {
        this.setData({
          post: mappedPost,
          comments: tree,
          commentTotal: total,
          commentPage: 1,
          hasMoreComments: tree.length < total
        });
      } else {
        const mergedFlat = this._flattenTreeToList(this.data.comments).concat(commentsRaw);
        const rebuilt = this._buildCommentTree(mergedFlat);
        this.setData({
          post: mappedPost,
          comments: rebuilt,
          commentTotal: total,
          hasMoreComments: rebuilt.length < total
        });
      }

      this._updateIsMyPost(this.data.post);

      // ✅纠正 liked
      return this._syncPostLikedFromCloud(this.data.post.id);
    }).catch(err => {
      console.error('[forumGetPostDetail] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  loadMoreComments() {
    if (!this.data.hasMoreComments || this.data.loadingMore) return;

    this.setData({ loadingMore: true });

    const nextPage = this.data.commentPage + 1;
    const postId = this.data.postId;

    wx.cloud.callFunction({
      name: 'forumGetPostDetail',
      data: {
        postId,
        commentPage: nextPage,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 0 && r.code !== 200) {
        wx.showToast({ title: r.message || '加载失败', icon: 'none' });
        return;
      }

      const data = r.data || {};
      const postRaw = data.post || {};
      const commentsRaw = data.comments || [];
      const total = data.commentTotal || 0;

      const mappedPost = this._mapPost(postRaw);

      const mergedFlat = this._flattenTreeToList(this.data.comments).concat(commentsRaw);
      const rebuilt = this._buildCommentTree(mergedFlat);

      this.setData({
        post: mappedPost,
        comments: rebuilt,
        commentTotal: total,
        commentPage: nextPage,
        hasMoreComments: mergedFlat.length < total
      });

      return this._syncPostLikedFromCloud(mappedPost.id);
    }).catch(err => {
      console.error('[loadMoreComments] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '加载失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loadingMore: false });
    });
  },

  // -------------------------
  // 评论输入
  // -------------------------
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  // -------------------------
  // 提交评论/回复：forumAddComment
  // ✅新后端：不再传 name/avatar（只存 userId）
  // -------------------------
  onSubmitComment() {
    const content = (this.data.commentText || '').trim();
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    const postId = this.data.postId;
    const parentId = this.data.replyingCommentId || null;

    const meta = this._getUserMeta();
    if (!meta.userId || !meta.username) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    wx.cloud.callFunction({
      name: 'forumAddComment',
      data: {
        postId,
        content,
        images: [],
        parentId,

        userId: meta.userId,
        username: meta.username
      }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 0 && r.code !== 200) {
        wx.showToast({ title: r.message || '评论失败', icon: 'none' });
        return;
      }

      wx.showToast({ title: parentId ? '回复成功' : '评论成功', icon: 'success' });
      this.setData({
        commentText: '',
        replyingTo: null,
        replyingCommentId: null,
        commentPage: 1
      });

      this.loadPostData(true);
    }).catch(err => {
      console.error('[forumAddComment] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '评论失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  onReplyTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const author = e.currentTarget.dataset.author;
    this.setData({
      replyingTo: author || '匿名用户',
      replyingCommentId: commentId
    });
  },

  onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.commentId;
    if (!commentId) return;

    const meta = this._getUserMeta();
    if (!meta.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });

        wx.cloud.callFunction({
          name: 'forumDeleteComment',
          data: { commentId, userId: meta.userId }
        }).then(resp => {
          const r = (resp && resp.result) ? resp.result : {};
          if (r.code !== 0 && r.code !== 200) {
            wx.showToast({ title: r.message || '删除失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadPostData(true);
        }).catch(err => {
          console.error('[forumDeleteComment] error:', err);
          wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '删除失败', icon: 'none' });
        }).finally(() => {
          wx.hideLoading();
        });
      }
    });
  },

  // 评论点赞：仍然本地 UI（不入库）
  onCommentLikeTap(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const comments = (this.data.comments || []).map(c => {
      if (c.commentId === commentId) {
        const liked = !c.liked;
        return { ...c, liked, likes: liked ? (c.likes || 0) + 1 : Math.max(0, (c.likes || 0) - 1) };
      }
      const replies = (c.replies || []).map(r => {
        if (r.commentId === commentId) {
          const liked = !r.liked;
          return { ...r, liked, likes: liked ? (r.likes || 0) + 1 : Math.max(0, (r.likes || 0) - 1) };
        }
        return r;
      });
      return { ...c, replies };
    });
    this.setData({ comments });
  },

  // -------------------------
  // 帖子点赞：先查 forumHasLikedPost 再调 forumLikePost（云端真相）
  // -------------------------
  async onLikeTap() {
    const postId = this.data.postId;
    if (!postId) return;

    const meta = this._getUserMeta();
    if (!meta.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const likedNow = await this._hasLikedPostFromCloud(postId);
    if (likedNow === null) {
      wx.showToast({ title: '获取点赞状态失败', icon: 'none' });
      return;
    }

    const action = likedNow ? 'unlike' : 'like';

    const oldLikes = Number(this.data.post.likes) || 0;
    const nextLiked = !likedNow;
    const nextCount = Math.max(0, oldLikes + (nextLiked ? 1 : -1));

    this.setData({
      'post.liked': nextLiked,
      'post.likes': nextCount
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'forumLikePost',
        data: { postId, action, userId: meta.userId }
      });

      const r = (res && res.result) ? res.result : {};
      if (r.code !== 0 && r.code !== 200) {
        this.setData({ 'post.liked': likedNow, 'post.likes': oldLikes });
        wx.showToast({ title: r.message || '操作失败', icon: 'none' });
        return;
      }

      if (r.data && r.data.likeCount !== undefined) {
        this.setData({ 'post.likes': Number(r.data.likeCount) || this.data.post.likes });
      }

      this._saveReactionState({ liked: nextLiked });
    } catch (err) {
      console.error('[forumLikePost-like] error:', err);
      this.setData({ 'post.liked': likedNow, 'post.likes': oldLikes });
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '操作失败', icon: 'none' });
    }
  },

  // 火：仍沿用你现有逻辑
  onFireTap() {
    const postId = this.data.postId;
    const fired = !!(this.data.post && this.data.post.fired);

    const meta = this._getUserMeta();
    if (!meta.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const action = fired ? 'unfire' : 'fire';

    const nextFired = !fired;
    const oldHot = Number(this.data.post.hot) || 0;
    const nextHot = Math.max(0, oldHot + (nextFired ? 1 : -1));

    this.setData({
      'post.fired': nextFired,
      'post.hot': nextHot
    });

    wx.cloud.callFunction({
      name: 'forumLikePost',
      data: { postId, action, userId: meta.userId }
    }).then(res => {
      const r = (res && res.result) ? res.result : {};
      if (r.code !== 0 && r.code !== 200) {
        this.setData({ 'post.fired': fired, 'post.hot': oldHot });
        wx.showToast({ title: r.message || '操作失败', icon: 'none' });
        return;
      }

      if (r.data && r.data.fireCount !== undefined) {
        this.setData({ 'post.hot': Number(r.data.fireCount) || this.data.post.hot });
      }

      this._saveReactionState({ fired: nextFired });
    }).catch(err => {
      console.error('[forumLikePost-fire] error:', err);
      wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '操作失败', icon: 'none' });
    });
  },

  onDeletePost() {
    const postId = this.data.postId;
    if (!postId) return;

    const meta = this._getUserMeta();
    if (!meta.userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });

        wx.cloud.callFunction({
          name: 'forumDeletePost',
          data: { postId, userId: meta.userId }
        }).then(resp => {
          const r = (resp && resp.result) ? resp.result : {};
          if (r.code !== 0 && r.code !== 200) {
            wx.showToast({ title: r.message || '删除失败', icon: 'none' });
            return;
          }

          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 800);
        }).catch(err => {
          console.error('[forumDeletePost] error:', err);
          wx.showToast({ title: (err && err.errMsg) ? err.errMsg : '删除失败', icon: 'none' });
        }).finally(() => {
          wx.hideLoading();
        });
      }
    });
  },

  onImageTap(e) {
    const src = e.currentTarget.dataset.src;
    const images = (this.data.post && this.data.post.images) ? this.data.post.images : [];
    wx.previewImage({
      current: src,
      urls: images
    });
  },

  onBack() {
    wx.navigateBack();
  },

  // -------------------------
  // 内部：映射/工具
  // -------------------------
  _mapPost(p) {
    const createdAtTs = this._toTimestamp(p.createdAt || p.updatedAt);
    const postId = p._id || this.data.postId;

    const liked = this._getLocalLiked(postId);
    const fired = this._getLocalFired(postId);

    const author =
      (p.authorName && String(p.authorName).trim()) ||
      (p.authorUsername && String(p.authorUsername).trim()) ||
      '匿名用户';

    const avatar = (p.authorAvatar && String(p.authorAvatar).trim())
      ? p.authorAvatar
      : '/images/tabbar/mine.png';

    return {
      id: postId,
      userId: String(p.userId || '').trim(),

      author,
      avatar,
      timestamp: createdAtTs,
      time: this.formatTime(createdAtTs),

      content: p.content || '',
      images: Array.isArray(p.images) ? p.images : [],

      likes: Number(p.likeCount) || 0,
      liked,

      hot: Number(p.fireCount) || 0,
      fired,

      comments: Number(p.commentCount) || 0
    };
  },

  _buildCommentTree(flat) {
    const meta = this._getUserMeta();
    const myUserId = meta.userId;

    const map = {};
    (flat || []).forEach(c => {
      const ts = this._toTimestamp(c.createdAt || c.updatedAt);

      const author =
        (c.name && String(c.name).trim()) ||
        (c.username && String(c.username).trim()) ||
        '匿名用户';

      const avatar = (c.avatar && String(c.avatar).trim())
        ? c.avatar
        : '/images/tabbar/mine.png';

      const uid = String(c.userId || '').trim();

      map[c._id] = {
        commentId: c._id,
        parentId: c.parentId || null,

        userId: uid,
        author,
        avatar,

        time: this.formatTime(ts),
        timestamp: ts,

        content: c.content || '',
        images: Array.isArray(c.images) ? c.images : [],

        likes: Number(c.likeCount) || 0,
        liked: false,

        replies: [],

        isMine: !!(myUserId && uid && String(uid) === String(myUserId))
      };
    });

    const roots = [];
    Object.keys(map).forEach(id => {
      const c = map[id];
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].replies.push(c);
      } else {
        roots.push(c);
      }
    });

    roots.forEach(r => {
      r.replies.sort((a, b) => a.timestamp - b.timestamp);
    });
    roots.sort((a, b) => a.timestamp - b.timestamp);

    return roots;
  },

  _flattenTreeToList(tree) {
    const flat = [];
    (tree || []).forEach(c => {
      flat.push({
        _id: c.commentId,
        parentId: null,
        userId: c.userId,
        username: c.author,
        name: c.author,
        avatar: c.avatar,
        content: c.content,
        images: c.images,
        likeCount: c.likes,
        createdAt: c.timestamp
      });

      (c.replies || []).forEach(r => {
        flat.push({
          _id: r.commentId,
          parentId: c.commentId,
          userId: r.userId,
          username: r.author,
          name: r.author,
          avatar: r.avatar,
          content: r.content,
          images: r.images,
          likeCount: r.likes,
          createdAt: r.timestamp
        });
      });
    });
    return flat;
  },

  _toTimestamp(v) {
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

  _updateIsMyPost(post) {
    const meta = this._getUserMeta();
    const myUserId = meta.userId;
    const isMyPost = !!(myUserId && post && post.userId && String(post.userId) === String(myUserId));
    this.setData({ isMyPost });
  },

  // -------------------------
  // 本地保存：帖子 like/fire 状态（like 仅兜底；云端为准）
  // -------------------------
  _reactionKey(postId) {
    return `forum_reaction_${postId}`;
  },

  _loadReactionState() {
    const postId = this.data.postId;
    if (!postId) return;
    const key = this._reactionKey(postId);
    const state = wx.getStorageSync(key) || {};
    this._reactionCache = state;
  },

  _saveReactionState(partial) {
    const postId = this.data.postId;
    if (!postId) return;
    const key = this._reactionKey(postId);
    const prev = wx.getStorageSync(key) || {};
    const next = { ...prev, ...partial };
    wx.setStorageSync(key, next);
    this._reactionCache = next;
  },

  _getLocalLiked(postId) {
    const key = this._reactionKey(postId);
    const state = wx.getStorageSync(key) || {};
    return !!state.liked;
  },

  _getLocalFired(postId) {
    const key = this._reactionKey(postId);
    const state = wx.getStorageSync(key) || {};
    return !!state.fired;
  }
});
