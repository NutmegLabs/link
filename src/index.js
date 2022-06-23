/**
 * @typedef {object} LinkToolData
 * @description Link Tool's input and output data format
 * @property {string} link — data url
 * @property {metaData} meta — fetched link data
 */

/**
 * @typedef {object} metaData
 * @description Fetched link meta data
 * @property {string} image - link's meta image
 * @property {string} title - link's meta title
 * @property {string} description - link's description
 */

// eslint-disable-next-line
import css from './index.css';
import ToolboxIcon from './svg/toolbox.svg';
import ajax from '@codexteam/ajax';
// eslint-disable-next-line
import polyfill from 'url-polyfill';
import StarOn from './svg/ic_star_on.svg';
import StarOff from './svg/ic_star_off.svg';

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on link data fetching
 * @property {number} success  - 1 for successful uploading, 0 for failure
 * @property {metaData} meta - Object with link data.
 *
 * Tool may have any data provided by backend, currently are supported by design:
 * title, description, image, url
 */
export default class LinkTool {
  /**
   * Notify core that read-only mode supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: ToolboxIcon,
      title: 'Link',
    };
  }

  /**
   * Allow to press Enter inside the LinkTool input
   *
   * @returns {boolean}
   * @public
   */
  static get enableLineBreaks() {
    return true;
  }

  /**
   * @param {object} - previously saved data
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoint: config.endpoint || '',
      headers: config.headers || {},
      apikey: config.apikey || '',
      language: config.language || '',
      attribution: config.attribution || {},
      supplierName: config.supplierName || '',
      seeMoreText: config.seeMoreText || '',
      showLessText: config.showLessText || '',
      participationDateText: config.participationDateText || '',
      writtenDateText: config.writtenDateText || '',
    };

    this.nodes = {
      wrapper: null,
      container: null,
      progress: null,
      input: null,
      inputHolder: null,
      linkContent: null,
      anchor: null,
      bodyHolder: null,
      linkImage: null,
      linkTitle: null,
      linkDescription: null,
      textArrow: null,
      bodyInfo: null,
      infoWeek: null,
      infoPrice: null,
    };

    this.isReview = false;

    this.reviewNodes = {
      itemTop: null,
      itemTopReview: null,
      itemTopReviewStars: null,
      itemTopReviewNum: null,
      itemTopInfo: null,
      itemTopInfoDate: null,
      itemTopInfoType: null,
      itemTtl: null,
      itemMessage: null,
      itemMore: null,
      itemPic: null,
      itemPicList: null,
      itemPicPrev: null,
      itemPicNext: null,
      itemUser: null,
      itemUserIc: null,
      itemUserInfo: null,
      itemUserInfoName: null,
      itemUserInfoDate: null,
      itemReply: null,
      itemReplyTtl: null,
      itemReplyBox: null,
      itemReplyMessage: null,
      itemReplyMore: null,
      itemMoreButton: null,
      itemReplyMoreButton: null,
    };

    this.regex =
      new RegExp(/https?:\/\/((api(.dev)?(.stg)?.ntmg.com)|(localhost:3007))\/v1\/reviews\/([^/?&"]+)/);
    this.head = {};
    this.pic = [];
    this.bound = 0;
    this.itemWidth = 0;
    this.maxWidth = 0;
    this.totalRight = 0;
    this.visibleRight = 0;
    this.visibleWidth = 0;
    this.remainWidth = 0;
    this.isMore = false;
    this.isReplyMore = false;
    this.moreText = 'See More';
    this.moreCloseText = 'Show Less';
    this.participationDateText = 'Participation Date';
    this.writtenDateText = 'Posted Date';

    this._data = {
      link: '',
      meta: {},
    };

    this.data = data;
  }

  /**
   * Renders Block content
   *
   * @public
   *
   * @returns {object} this.nodes.wrapper - render element wrapper
   */
  render() {
    console.log('test 2');
    this.nodes.wrapper = this.make('div', this.CSS.baseClass);
    this.nodes.container = this.make('div', this.CSS.container);

    this.nodes.inputHolder = this.makeInputHolder();
    this.nodes.linkContent = this.prepareLinkPreview();
    this.nodes.reviewContent = this.prepareReviewPreview();

    // if (this.isReview == true) {
    //  this.nodes.linkContent = this.prepareReviewPreview();
    // }

    /**
     * If Tool already has data, render link preview, otherwise insert input
     */
    if (Object.keys(this.data.meta).length) {
      if (this.regex.test(this.data.link)) {
        this.nodes.container.appendChild(this.nodes.reviewContent);
        this.showReviewPreview(this.data.meta);
      } else {
        this.nodes.container.appendChild(this.nodes.linkContent);
        this.showLinkPreview(this.data.meta);
      }
    } else {
      this.nodes.container.appendChild(this.nodes.inputHolder);
    }

    this.nodes.wrapper.appendChild(this.nodes.container);

    return this.nodes.wrapper;
  }

  /**
   * Return Block data
   *
   * @public
   *
   * @returns {LinkToolData}
   */
  save() {
    return this.data;
  }

  /**
   * Validate Block data
   * - check if given link is an empty string or not.
   *
   * @public
   *
   * @returns {boolean} false if saved data is incorrect, otherwise true
   */
  validate() {
    return this.data.link.trim() !== '';
  }

  /**
   * Stores all Tool's data
   *
   * @param {LinkToolData} data - fetch data
   */
  set data(data) {
    this._data = Object.assign({}, {
      link: data.link || this._data.link,
      meta: data.meta || this._data.meta,
    });
  }

  /**
   * Return Tool data
   *
   * @returns {LinkToolData}
   */
  get data() {
    return this._data;
  }

  /**
   * @returns {object} - Link Tool styles
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      input: this.api.styles.input,

      /**
       * Tool's classes
       */
      container: 'link-tool',
      inputEl: 'link-tool__input',
      inputHolder: 'link-tool__input-holder',
      inputError: 'link-tool__input-holder--error',
      linkContent: 'c-itemCard__item',
      // linkContentRendered: 'link-tool__content--rendered',
      linkImage: 'c-itemCard__item__pic',
      body: 'c-itemCard__item__body',
      linkTitle: 'c-itemCard__item__body__ttl',
      linkDescription: 'c-itemCard__item__body__desc',
      textArrow: 'c-itemCard__item__arrow',
      bodyInfo: 'c-itemCard__item__body__info',
      infoWeek: 'c-itemCard__item__body__info__week',
      infoPrice: 'c-itemCard__item__body__info__price',
      progress: 'link-tool__progress',
      progressLoading: 'link-tool__progress--loading',
      progressLoaded: 'link-tool__progress--loaded',

      reviewLinkContent: 'c-review__list__comment__item',
      reviewItemTop: 'c-review__list__comment__item__top',
      reviewItemTopReview: 'c-review__list__comment__item__top__review',
      reviewItemTopReviewStars: 'c-review__list__comment__item__top__review__stars',
      reviewItemTopReviewNum: 'c-review__list__comment__item__top__review__num',
      reviewItemTopInfo: 'c-review__list__comment__item__top__info',
      reviewItemTopInfoDate: 'c-review__list__comment__item__top__info__date',
      reviewItemTopInfoType: 'c-review__list__comment__item__top__info__type',
      reviewItemTtl: 'c-review__list__comment__item__ttl',
      reviewItemMessage: 'c-review__list__comment__item__message',
      reviewItemMore: 'c-review__list__comment__item__more',
      reviewItemPic: 'c-review__list__comment__item__pic',
      reviewItemPicList: 'c-review__list__comment__item__pic__list',
      reviewItemPicPrev: 'c-review__list__comment__item__pic__prev',
      reviewItemPicNext: 'c-review__list__comment__item__pic__next',
      reviewItemUser: 'c-review__list__comment__item__user',
      reviewItemUserIc: 'c-review__list__comment__item__user__ic',
      reviewItemUserInfo: 'c-review__list__comment__item__user__info',
      reviewItemUserInfoName: 'c-review__list__comment__item__user__info__name',
      reviewItemUserInfoDate: 'c-review__list__comment__item__user__info__date',
      reviewItemReply: 'c-review__list__comment__item__reply',
      reviewItemReplyTtl: 'c-review__list__comment__item__reply__ttl',
      reviewItemReplyBox: 'c-review__list__comment__item__reply__box',
      reviewItemReplyMessage: 'c-review__list__comment__item__reply__message',
      reviewItemReplyMore: 'c-review__list__comment__item__reply__more',

    };
  }

  /**
   * Prepare input holder
   *
   * @returns {object} inputHolder - make input holder
   */
  makeInputHolder() {
    const inputHolder = this.make('div', this.CSS.inputHolder);

    this.nodes.progress = this.make('label', this.CSS.progress);
    this.nodes.input = this.make('div', [this.CSS.input, this.CSS.inputEl], {
      contentEditable: !this.readOnly,
    });

    this.nodes.input.dataset.placeholder = this.api.i18n.t('Link');

    if (!this.readOnly) {
      // this.nodes.input.addEventListener('paste', (event) => {
      //  this.startFetching(event);
      // });

      this.nodes.input.addEventListener('keydown', (event) => {
        const [ENTER, A] = [13, 65];
        const cmdPressed = event.ctrlKey || event.metaKey;

        switch (event.keyCode) {
          case ENTER:
            event.preventDefault();
            event.stopPropagation();

            this.startFetching(event);
            break;
          case A:
            if (cmdPressed) {
              this.selectLinkUrl(event);
            }
            break;
        }
      });
    }

    inputHolder.appendChild(this.nodes.progress);
    inputHolder.appendChild(this.nodes.input);

    return inputHolder;
  }

  /**
   * Activates link data fetching by url
   *
   * @param {object} event - window event
   */
  startFetching(event) {
    let url = this.nodes.input.textContent;

    if (event.type === 'paste') {
      url = (event.clipboardData || window.clipboardData).getData('text');
    }

    if (this.regex.test(url)) {
      this.isReview = true;
      this.head = {
        accept: 'application/json, text/plain, */*',
        'accept-language': this.config.language,
        'x-api-key': this.config.apikey,
      };
    }
    // const testUrl = 'http://localhost:3007/v1/reviews/0c3c6345-a007-49f7-b46c-32d9c22657a2';

    this.removeErrorStyle();
    this.fetchLinkData(url);
  }

  /**
   * If previous link data fetching failed, remove error styles
   */
  removeErrorStyle() {
    this.nodes.inputHolder.classList.remove(this.CSS.inputError);
    this.nodes.inputHolder.insertBefore(this.nodes.progress, this.nodes.input);
  }

  /**
   * Select LinkTool input content by CMD+A
   *
   * @param {object} event - use keyboard event
   *
   * @returns {void}
   */
  selectLinkUrl(event) {
    event.preventDefault();
    event.stopPropagation();

    const selection = window.getSelection();
    const range = new Range();

    const currentNode = selection.anchorNode.parentNode;
    const currentItem = currentNode.closest(`.${this.CSS.inputHolder}`);
    const inputElement = currentItem.querySelector(`.${this.CSS.inputEl}`);

    range.selectNodeContents(inputElement);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Prepare link preview holder
   *
   * @returns {object} holder - return prepare render html element
   */
  prepareLinkPreview() {
    // const holder = this.make('a', this.CSS.linkContent, {
    //  target: '_blank',
    //  rel: 'nofollow noindex noreferrer',
    // });
    const holder = this.make('div', this.CSS.linkContent);

    this.nodes.anchor = this.make('a', null, {
      target: '_blank',
      rel: 'nofollow noindex noreferrer',
    });
    holder.appendChild(this.nodes.anchor);

    this.nodes.linkImage = this.make('div', this.CSS.linkImage);
    this.nodes.linkTitle = this.make('h3', this.CSS.linkTitle);
    this.nodes.linkDescription = this.make('p', this.CSS.linkDescription);
    this.nodes.textArrow = this.make('i', this.CSS.textArrow, { style: 'border-color:#0094CC;' });

    return holder;
  }

  /**
   * Prepare review preview holder
   *
   * @returns {object} holder - return prepare render review html element
   */
  prepareReviewPreview() {
    const holder = this.make('div', this.CSS.reviewLinkContent);

    this.reviewNodes.itemTop = this.make('div', this.CSS.reviewItemTop);

    this.reviewNodes.itemTopReview = this.make('div', this.CSS.reviewItemTopReview);
    this.reviewNodes.itemTopReviewStars = this.make('div', this.CSS.reviewItemTopReviewStars);
    this.reviewNodes.itemTopReviewNum = this.make('p', this.CSS.reviewItemTopReviewNum);
    this.reviewNodes.itemTopReview.appendChild(this.reviewNodes.itemTopReviewStars);
    this.reviewNodes.itemTopReview.appendChild(this.reviewNodes.itemTopReviewNum);

    this.reviewNodes.itemTopInfo = this.make('div', this.CSS.reviewItemTopInfo);
    this.reviewNodes.itemTopInfoDate = this.make('p', this.CSS.reviewItemTopInfoDate);
    this.reviewNodes.itemTopInfoType = this.make('p', this.CSS.reviewItemTopInfoType);
    this.reviewNodes.itemTopInfo.appendChild(this.reviewNodes.itemTopInfoDate);
    this.reviewNodes.itemTopInfo.appendChild(this.reviewNodes.itemTopInfoType);
    this.reviewNodes.itemTop.appendChild(this.reviewNodes.itemTopReview);
    this.reviewNodes.itemTop.appendChild(this.reviewNodes.itemTopInfo);

    this.reviewNodes.itemTtl = this.make('p', this.CSS.reviewItemTtl);

    this.reviewNodes.itemUser = this.make('div', this.CSS.reviewItemUser);
    this.reviewNodes.itemUserIc = this.make('p', this.CSS.reviewItemUserIc);
    this.reviewNodes.itemUserInfo = this.make('p', this.CSS.reviewItemUserInfo);
    this.reviewNodes.itemUserInfoName = this.make('p', this.CSS.reviewItemUserInfoName);
    this.reviewNodes.itemUserInfoDate = this.make('p', this.CSS.reviewItemUserInfoDate);
    this.reviewNodes.itemUserInfo.appendChild(this.reviewNodes.itemUserInfoName);
    this.reviewNodes.itemUserInfo.appendChild(this.reviewNodes.itemUserInfoDate);
    this.reviewNodes.itemUser.appendChild(this.reviewNodes.itemUserIc);
    this.reviewNodes.itemUser.appendChild(this.reviewNodes.itemUserInfo);

    return holder;
  }

  /**
   * Compose link preview from fetched data
   *
   * @param {metaData} meta - link meta data
   */
  showLinkPreview(meta) {
    this.nodes.container.appendChild(this.nodes.linkContent);

    if (meta.image) {
      const img = this.make('img', null, { src: meta.image });

      this.nodes.linkImage.appendChild(img);
      // this.nodes.linkImage.style.backgroundImage = 'url(' + image.url + ')';
      this.nodes.anchor.appendChild(this.nodes.linkImage);
    }

    this.nodes.bodyHolder = this.make('div', this.CSS.body);
    if (meta.title) {
      this.nodes.linkTitle.textContent = meta.title;
      this.nodes.bodyHolder.appendChild(this.nodes.linkTitle);
    }

    if (meta.description) {
      this.nodes.linkDescription.textContent = meta.description;
      this.nodes.bodyHolder.appendChild(this.nodes.linkDescription);
    }
    this.nodes.anchor.appendChild(this.nodes.bodyHolder);
    this.nodes.anchor.appendChild(this.nodes.textArrow);

    // this.nodes.linkContent.classList.add(this.CSS.linkContentRendered);
    this.nodes.anchor.setAttribute('href', this.data.link);

    // TODO if week and price
    if (meta.lowest_price_gross || meta.operating_days_of_week) {
      this.nodes.bodyInfo = this.make('div', this.CSS.bodyInfo);

      if (meta.operating_days_of_week) {
        this.nodes.infoWeek = this.make('p', this.CSS.infoWeek);
        this.nodes.infoWeek.textContent = meta.operating_days_of_week;
        this.nodes.bodyInfo.appendChild(this.nodes.infoWeek);
      }

      if (meta.lowest_price_gross) {
        this.nodes.infoPrice = this.make('p', this.CSS.infoPrice, { style: 'color:#0094CC' });
        this.nodes.infoPrice.textContent = meta.lowest_price_gross;
        this.nodes.bodyInfo.appendChild(this.nodes.infoPrice);
      }

      this.nodes.bodyHolder.appendChild(this.nodes.bodyInfo);
    }

    try {
      const getHost = (new URL(this.data.link)).hostname;

      if (!getHost) {
        console.error("can't get host name");
      }
    } catch (e) {
      this.nodes.linkText.textContent = this.data.link;
    }
  }

  /**
   * Compose review preview from fetched data
   *
   * @param {metaData} meta - review meta data
   */
  showReviewPreview(meta) {
    // new Promise((resolve) => {
    //  this.nodes.container.appendChild(this.nodes.reviewContent);

    //  if (meta.guest_language) {
    //    this.moreText = this.config.seeMoreText;
    //    this.moreCloseText = this.config.showLessText;
    //    this.participationDateText = this.config.participationDateText;
    //    this.writtenDateText = this.config.writtenDateText;
    //  }

    //  if (meta.rating) {
    //    const rate = meta.rating.replace('REVIEW_RATING_', '');

    //    for (let i = 0; i < 5; i++) {
    //      let img;

    //      if (i < rate) {
    //        img = this.make('img', null, { src: StarOn });
    //        // img = this.make('img', null, { src: 'https://michi-s4.book.stg.ntmg.com/static/images/ic_star_on.svg' });
    //        this.reviewNodes.itemTopReviewStars.appendChild(img);
    //      } else {
    //        img = this.make('img', null, { src: StarOff });
    //        // img = this.make('img', null, { src: 'https://michi-s4.book.stg.ntmg.com/static/images/ic_star_on.svg' });
    //        this.reviewNodes.itemTopReviewStars.appendChild(img);
    //      }
    //    }
    //    this.reviewNodes.itemTopReviewNum.textContent = rate;
    //  }

    //  if (meta.participation_date_time_local) {
    //    this.reviewNodes.itemTopInfoDate.textContent =
    //      this.participationDateText + ':' + meta.participation_date_time_local.substring(0, 7);
    //  }
    //  if (meta.attribution) {
    //    this.reviewNodes.itemTopInfoType.textContent = this.config.attribution[`${meta.attribution}`];
    //  }
    //  if (meta.title) {
    //    this.reviewNodes.itemTtl.textContent = meta.title;
    //  }
    //  if (meta.body) {
    //    this.reviewNodes.itemMore = this.make('div', this.CSS.reviewItemMore);
    //    this.reviewNodes.itemMoreButton = this.make('a', null);
    //    this.reviewNodes.itemMoreButton.textContent = this.moreText;
    //    this.reviewNodes.itemMoreButton.addEventListener('click', () => {
    //      this.toggleMore();
    //    });
    //    this.reviewNodes.itemMore.appendChild(this.reviewNodes.itemMoreButton);

    //    this.reviewNodes.itemMessage = this.make('p', [this.CSS.reviewItemMessage, 'newline']);
    //    this.reviewNodes.itemMessage.textContent = meta.body;
    //  }
    //  if (meta.media_items.length !== 0) {
    //    this.reviewNodes.itemPic = this.make('div', this.CSS.reviewItemPic);
    //    this.reviewNodes.itemPicList = this.make('ul', this.CSS.reviewItemPicList);
    //    this.reviewNodes.itemPicPrev = this.make('a', this.CSS.reviewItemPicPrev);
    //    this.reviewNodes.itemPicNext = this.make('a', this.CSS.reviewItemPicNext);
    //    this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicList);
    //    this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicPrev);
    //    this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicNext);

    //    meta.media_items.map(media => {
    //      const li = this.make('li');

    //      li.addEventListener('click', () => {
    //        this.showModal(media.url);
    //      });
    //      li.appendChild(this.make('img', null, { src: media.url }));
    //      this.reviewNodes.itemPicList.appendChild(li);
    //      this.pic.push(li);
    //    });
    //  }
    //  if (meta.guest_nickname) {
    //    this.reviewNodes.itemUserIc.textContent = meta.guest_nickname.substring(0, 1);
    //    this.reviewNodes.itemUserInfoName.textContent = meta.guest_nickname;
    //  }
    //  if (meta.written_date_time_utc) {
    //    const writtenDate = new Date(meta.written_date_time_utc);

    //    this.reviewNodes.itemUserInfoDate.textContent =
    //      this.writtenDateText + ':' + writtenDate.getUTCFullYear() +
    //      '/' + writtenDate.getUTCMonth() + '/' + writtenDate.getUTCDate();
    //  }
    //  if (meta.supplier_comments) {
    //    this.reviewNodes.itemReply = this.make('div', this.CSS.reviewItemReply);
    //    this.reviewNodes.itemReplyTtl = this.make('p', this.CSS.reviewItemReplyTtl);
    //    this.reviewNodes.itemReplyBox = this.make('div', this.CSS.reviewItemReplyBox);
    //    this.reviewNodes.itemReplyMessage = this.make('p', [this.CSS.reviewItemReplyMessage, 'newline']);

    //    this.reviewNodes.itemReplyMore = this.make('p', this.CSS.reviewItemReplyMore);
    //    this.reviewNodes.itemReplyMoreButton = this.make('a', null);
    //    this.reviewNodes.itemReplyMoreButton.textContent = this.moreText;
    //    this.reviewNodes.itemReplyMoreButton.addEventListener('click', () => {
    //      this.toggleReplyMore();
    //    });
    //    this.reviewNodes.itemReplyMore.appendChild(this.reviewNodes.itemReplyMoreButton);

    //    this.reviewNodes.itemReplyBox.appendChild(this.reviewNodes.itemReplyMessage);
    //    this.reviewNodes.itemReply.appendChild(this.reviewNodes.itemReplyTtl);
    //    this.reviewNodes.itemReply.appendChild(this.reviewNodes.itemReplyBox);

    //    this.reviewNodes.itemReplyMessage.textContent = meta.supplier_comments;
    //    this.reviewNodes.itemReplyTtl.textContent = this.config.supplierName;
    //  }
    //  setTimeout(resolve, 500);
    // }).then(() => {
    //  this.addReviewData(meta);
    // });

    this.nodes.container.appendChild(this.nodes.reviewContent);

    if (meta.guest_language) {
      this.moreText = this.config.seeMoreText;
      this.moreCloseText = this.config.showLessText;
      this.participationDateText = this.config.participationDateText;
      this.writtenDateText = this.config.writtenDateText;
    }

    if (meta.rating) {
      const rate = meta.rating.replace('REVIEW_RATING_', '');

      for (let i = 0; i < 5; i++) {
        let img;

        if (i < rate) {
          img = this.make('img', null, { src: StarOn });
          // img = this.make('img', null, { src: 'https://michi-s4.book.stg.ntmg.com/static/images/ic_star_on.svg' });
          this.reviewNodes.itemTopReviewStars.appendChild(img);
        } else {
          img = this.make('img', null, { src: StarOff });
          // img = this.make('img', null, { src: 'https://michi-s4.book.stg.ntmg.com/static/images/ic_star_on.svg' });
          this.reviewNodes.itemTopReviewStars.appendChild(img);
        }
      }
      this.reviewNodes.itemTopReviewNum.textContent = rate;
    }

    if (meta.participation_date_time_local) {
      this.reviewNodes.itemTopInfoDate.textContent =
       this.participationDateText + ':' + meta.participation_date_time_local.substring(0, 7);
    }
    if (meta.attribution) {
      this.reviewNodes.itemTopInfoType.textContent = this.config.attribution[`${meta.attribution}`];
    }
    if (meta.title) {
      this.reviewNodes.itemTtl.textContent = meta.title;
    }
    if (meta.body) {
      this.reviewNodes.itemMore = this.make('div', this.CSS.reviewItemMore);
      this.reviewNodes.itemMoreButton = this.make('a', null);
      this.reviewNodes.itemMoreButton.textContent = this.moreText;
      this.reviewNodes.itemMoreButton.addEventListener('click', () => {
        this.toggleMore();
      });
      this.reviewNodes.itemMore.appendChild(this.reviewNodes.itemMoreButton);

      this.reviewNodes.itemMessage = this.make('p', [this.CSS.reviewItemMessage, 'newline']);
      this.reviewNodes.itemMessage.textContent = meta.body;
    }
    if (meta.media_items.length !== 0) {
      this.reviewNodes.itemPic = this.make('div', this.CSS.reviewItemPic);
      this.reviewNodes.itemPicList = this.make('ul', this.CSS.reviewItemPicList);
      this.reviewNodes.itemPicPrev = this.make('a', this.CSS.reviewItemPicPrev);
      this.reviewNodes.itemPicNext = this.make('a', this.CSS.reviewItemPicNext);
      this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicList);
      this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicPrev);
      this.reviewNodes.itemPic.appendChild(this.reviewNodes.itemPicNext);

      // ((imgs) => {
      //  const imgCollector = () => {
      //    let count = 0;

      //    console.log(count);

      //    return () => {
      //      count++;
      //      if (imgs.length === count) {
      //        console.log('complete');
      //      }
      //    };
      //  };

      //  const image = () => {
      //    console.log('start');
      //    imgs.map(media => {
      //      const li = this.make('li');

      //      li.addEventListener('click', () => {
      //        this.showModal(media.url);
      //      });

      //      const img = this.make('img', null, { src: media.url });

      //      img.onload = () => {
      //        console.log('collect ago');
      //        imgCollector();
      //        console.log('collect lator');
      //      };
      //      li.appendChild(img);
      //      this.reviewNodes.itemPicList.appendChild(li);
      //      this.pic.push(li);
      //    });
      //  };

      //  return image;
      // })(meta.media_items);

      (() => {
        const t1 = (z) => {
          console.log('z:' + z);
        };
        const t2 = (m) => {
          console.log(m);
          m.map((s) => {
            console.log(s);
            t1(s);
          });
        };

        return t2();
      })([0, 1, 2]);

      meta.media_items.map(media => {
        const li = this.make('li');

        li.addEventListener('click', () => {
          this.showModal(media.url);
        });

        const img = this.make('img', null, { src: media.url });

        img.onload = () => {
          console.log('img');
        };
        li.appendChild(img);
        this.reviewNodes.itemPicList.appendChild(li);
        this.pic.push(li);
      });
    }
    if (meta.guest_nickname) {
      this.reviewNodes.itemUserIc.textContent = meta.guest_nickname.substring(0, 1);
      this.reviewNodes.itemUserInfoName.textContent = meta.guest_nickname;
    }
    if (meta.written_date_time_utc) {
      const writtenDate = new Date(meta.written_date_time_utc);

      this.reviewNodes.itemUserInfoDate.textContent =
       this.writtenDateText + ':' + writtenDate.getUTCFullYear() +
       '/' + writtenDate.getUTCMonth() + '/' + writtenDate.getUTCDate();
    }
    if (meta.supplier_comments) {
      this.reviewNodes.itemReply = this.make('div', this.CSS.reviewItemReply);
      this.reviewNodes.itemReplyTtl = this.make('p', this.CSS.reviewItemReplyTtl);
      this.reviewNodes.itemReplyBox = this.make('div', this.CSS.reviewItemReplyBox);
      this.reviewNodes.itemReplyMessage = this.make('p', [this.CSS.reviewItemReplyMessage, 'newline']);

      this.reviewNodes.itemReplyMore = this.make('p', this.CSS.reviewItemReplyMore);
      this.reviewNodes.itemReplyMoreButton = this.make('a', null);
      this.reviewNodes.itemReplyMoreButton.textContent = this.moreText;
      this.reviewNodes.itemReplyMoreButton.addEventListener('click', () => {
        this.toggleReplyMore();
      });
      this.reviewNodes.itemReplyMore.appendChild(this.reviewNodes.itemReplyMoreButton);

      this.reviewNodes.itemReplyBox.appendChild(this.reviewNodes.itemReplyMessage);
      this.reviewNodes.itemReply.appendChild(this.reviewNodes.itemReplyTtl);
      this.reviewNodes.itemReply.appendChild(this.reviewNodes.itemReplyBox);

      this.reviewNodes.itemReplyMessage.textContent = meta.supplier_comments;
      this.reviewNodes.itemReplyTtl.textContent = this.config.supplierName;
    }

    window.addEventListener('load', this.addReviewData(meta));

    try {
      const getHost = (new URL(this.data.link)).hostname;

      if (!getHost) {
        console.error("can't get host name");
      }
    } catch (e) {
      this.nodes.linkText.textContent = this.data.link;
    }
  }

  /**
   * Add holder
   *
   * @private
   * @param {object} meta - meta Data
   */
  addReviewData(meta) {
    // add holder
    this.nodes.reviewContent.appendChild(this.reviewNodes.itemTop);
    this.nodes.reviewContent.appendChild(this.reviewNodes.itemTtl);
    this.nodes.reviewContent.appendChild(this.reviewNodes.itemMessage);
    if (this.reviewNodes.itemMessage.scrollHeight > 70) {
      this.reviewNodes.itemMessage.classList.add('is-close');
      this.nodes.reviewContent.appendChild(this.reviewNodes.itemMore);
    }
    if (meta.media_items.length !== 0) {
      this.nodes.reviewContent.appendChild(this.reviewNodes.itemPic);

      // slider parts
      this.itemWidth = this.pic[0].getBoundingClientRect().width + 16;
      this.maxWidth = this.itemWidth * this.pic.length;
      // this.totalRight = -this.bound + this.reviewNodes.itemPicList.getBoundingClientRect().left + this.maxWidth + 16;
      this.totalRight = this.bound + this.reviewNodes.itemPicList.getBoundingClientRect().left + this.maxWidth + 16;
      this.visibleRight = this.reviewNodes.itemPicList.getBoundingClientRect().right - 16;
      this.visibleWidth =
        this.reviewNodes.itemPicList.getBoundingClientRect().right -
        this.reviewNodes.itemPicList.getBoundingClientRect().left - 32;
      this.remainWidth = this.totalRight - this.visibleRight;
      this.reviewNodes.itemPicPrev.style = 'visibility: hidden;';
      console.log(this.pic);
      console.log(this.itemWidth);
      console.log(this.totalRight);
      console.log(this.visibleRight + 16);
      if (this.totalRight < this.visibleRight + 16) {
        this.reviewNodes.itemPicNext.style = 'visibility: hidden;';
      }
      this.reviewNodes.itemPicPrev.addEventListener('click', () => {
        this.slidePrev();
      });
      this.reviewNodes.itemPicNext.addEventListener('click', () => {
        this.slideNext();
      });
    }
    this.nodes.reviewContent.appendChild(this.reviewNodes.itemUser);
    if (meta.supplier_comments) {
      this.nodes.reviewContent.appendChild(this.reviewNodes.itemReply);
      if (this.reviewNodes.itemReplyMessage.scrollHeight > 70) {
        this.reviewNodes.itemReplyBox.appendChild(this.reviewNodes.itemReplyMore);
        this.reviewNodes.itemReplyMessage.classList.add('is-close');
      }
    }
  }

  /**
   * Move image slide
   *
   * @private
   */
  slideNext() {
    if (this.totalRight <= this.visibleRight) {
      return;
    }

    const delta = Math.min(this.remainWidth, this.visibleWidth);

    this.bound =
      delta == this.remainWidth
        ? this.bound + delta
        : Math.floor((this.bound + delta) / this.itemWidth) * this.itemWidth;
    this.totalRight = -this.bound + this.reviewNodes.itemPicList.getBoundingClientRect().left + this.maxWidth + 16;
    this.remainWidth = this.totalRight - this.visibleRight;

    if (this.totalRight <= this.visibleRight) {
      this.reviewNodes.itemPicNext.style = 'visibility: hidden;';
    }

    if (this.bound > 0) {
      this.reviewNodes.itemPicPrev.removeAttribute('style');
    }
    this.pic.map(image => {
      // image.style = 'transform: translateX(-30px);';
      image.style = 'transform: translateX(' + -this.bound + 'px);';
    });
  }

  /**
   * Move image slide
   *
   * @private
   */
  slidePrev() {
    if (this.bound === 0) {
      return;
    }

    const delta = Math.min(this.bound, this.visibleWidth);

    this.bound = Math.floor((this.bound - delta) / this.itemWidth) * this.itemWidth;
    this.totalRight = -this.bound + this.reviewNodes.itemPicList.getBoundingClientRect().left + this.maxWidth + 16;
    this.remainWidth = this.totalRight - this.visibleRight;

    if (this.remainWidth > 0) {
      this.reviewNodes.itemPicNext.removeAttribute('style');
    }

    this.pic.map(image => {
      image.style = 'transform: translateX(' + -this.bound + 'px);';
    });
    if (this.bound === 0) {
      this.reviewNodes.itemPicPrev.style = 'visibility: hidden;';
    }
  }

  /**
   * Toggle Message
   *
   * @private
   */
  toggleMore() {
    if (this.isMore) {
      this.reviewNodes.itemMessage.classList.add('is-close');
      this.reviewNodes.itemMoreButton.textContent = this.moreText;
      this.isMore = false;

      return;
    }
    this.reviewNodes.itemMessage.classList.remove('is-close');
    this.reviewNodes.itemMoreButton.textContent = this.moreCloseText;
    this.isMore = true;
  }

  /**
   * Toggle Reply Message
   *
   * @private
   */
  toggleReplyMore() {
    if (this.isReplyMore) {
      this.reviewNodes.itemReplyMessage.classList.add('is-close');
      this.reviewNodes.itemReplyMoreButton.textContent = this.moreText;
      this.isReplyMore = false;

      return;
    }
    this.reviewNodes.itemReplyMessage.classList.remove('is-close');
    this.reviewNodes.itemReplyMoreButton.textContent = this.moreCloseText;
    this.isReplyMore = true;
  }

  /**
   * Show Modal
   *
   * @private
   *
   * @param {string} url - modal image url
   */
  showModal(url) {
    const modal = this.make('div', 'c-reviewPicture__modal');
    const modalContent = this.make('div', 'c-reviewPicture__modal__modal__content');
    const modalContentPick = this.make('div', 'c-reviewPicture__modal__modal__content__pic');
    const img = this.make('img', null, { src: url });

    modalContentPick.appendChild(img);
    const close = this.make('a', 'c-reviewPicture__modal__modal__content__close');

    close.addEventListener('click', () => {
      const tmp = document.getElementsByClassName('c-reviewPicture__modal');

      tmp[0].remove();
    });
    modalContent.appendChild(modalContentPick);
    modalContent.appendChild(close);
    modal.appendChild(modalContent);

    this.nodes.reviewContent.appendChild(modal);
  }

  /**
   * Show loading progressbar
   *
   * @returns {void}
   */
  showProgress() {
    this.nodes.progress.classList.add(this.CSS.progressLoading);
  }

  /**
   * Hide loading progressbar
   *
   * @returns {void}
   */
  hideProgress() {
    return new Promise((resolve) => {
      this.nodes.progress.classList.remove(this.CSS.progressLoading);
      this.nodes.progress.classList.add(this.CSS.progressLoaded);

      setTimeout(resolve, 500);
    });
  }

  /**
   * If data fetching failed, set input error style
   *
   * @returns {void}
   */
  applyErrorStyle() {
    this.nodes.inputHolder.classList.add(this.CSS.inputError);
    this.nodes.progress.remove();
  }

  /**
   * Sends to backend pasted url and receives link data
   *
   * @param {string} url - link source url
   */
  async fetchLinkData(url) {
    this.showProgress();
    this.data = { link: url };

    try {
      const { body, code } = await (ajax.get({
        url: this.isReview ? url : this.config.endpoint,
        headers: this.isReview ? this.head : null,
        data: this.isReview ? null : { url: url },
      }));

      // this.onFetch(this.testBody, code);
      this.onFetch(body, code);
    } catch (error) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t fetch the link data'));
    }
  }

  /**
   * Link data fetching callback
   *
   * @param {UploadResponseFormat} response - response data
   * @param {number} code - status code
   */
  onFetch(response, code) {
    if (code >= 400) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t get this link data, try the other one'));
      console.error(response);

      return;
    }

    const metaData = response;

    const link = response.link || this.data.link;

    this.data = {
      meta: metaData,
      link,
    };

    if (!metaData) {
      this.fetchingFailed(this.api.i18n.t('Wrong response format from the server'));

      return;
    }

    this.hideProgress().then(() => {
      this.nodes.inputHolder.remove();
      if (this.isReview) {
        this.showReviewPreview(metaData);
      } else {
        this.showLinkPreview(metaData);
      }
    });
  }

  /**
   * Handle link fetching errors
   *
   * @private
   *
   * @param {string} errorMessage - errorMessage
   */
  fetchingFailed(errorMessage) {
    this.api.notifier.show({
      message: errorMessage,
      style: 'error',
    });

    this.applyErrorStyle();
  }

  /**
   * Helper method for elements creation
   *
   * @param {string} tagName - html element name
   * @param {string} classNames - class name
   * @param {object} attributes - attribute param
   * @returns {object} - return html element
   */
  make(tagName, classNames = null, attributes = {}) {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }

    return el;
  }
}
