Component({
  properties: {
    dish: {
      type: Object,
      value: {}
    },
    index: {
      type: Number,
      value: 0
    },
    // recommend / menu
    mode: {
      type: String,
      value: 'recommend'
    }
  },

  data: {
    stars: [1, 2, 3, 4, 5]
  },

  methods: {
    onAddTap() {
      this.triggerEvent('add', {
        index: this.data.index
      });
    },

    onLikeTap() {
      this.triggerEvent('like', {
        index: this.data.index
      });
    },

    onBlockTap() {
      this.triggerEvent('block', {
        index: this.data.index
      });
    },

    onRateTap(e) {
      const score = e.currentTarget.dataset.score;
      this.triggerEvent('rate', {
        index: this.data.index,
        score
      });
    },

    onDetailTap() {
      this.triggerEvent('detail', {
        index: this.data.index
      });
    }
  }
});
