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
   * @param {LinkToolData} data - previously saved data
   * @param {config} config - user config for Tool
   * @param {object} api - Editor.js API
   * @param {boolean} readOnly - read-only mode flag
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
   * @returns {HTMLDivElement}
   */
  render() {
    this.nodes.wrapper = this.make('div', this.CSS.baseClass);
    this.nodes.container = this.make('div', this.CSS.container);

    this.nodes.inputHolder = this.makeInputHolder();
    this.nodes.linkContent = this.prepareLinkPreview();

    /**
     * If Tool already has data, render link preview, otherwise insert input
     */
    if (Object.keys(this.data.meta).length) {
      this.nodes.container.appendChild(this.nodes.linkContent);
      this.showLinkPreview(this.data.meta);
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
   * @param {LinkToolData} data
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
      //linkContentRendered: 'link-tool__content--rendered',
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
    };
  }

  /**
   * Prepare input holder
   *
   * @returns {HTMLElement}
   */
  makeInputHolder() {
    const inputHolder = this.make('div', this.CSS.inputHolder);

    this.nodes.progress = this.make('label', this.CSS.progress);
    this.nodes.input = this.make('div', [this.CSS.input, this.CSS.inputEl], {
      contentEditable: !this.readOnly,
    });

    this.nodes.input.dataset.placeholder = this.api.i18n.t('Link');

    if (!this.readOnly) {
      this.nodes.input.addEventListener('paste', (event) => {
        this.startFetching(event);
      });

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
   * @param {PasteEvent} event
   */
  startFetching(event) {
    let url = this.nodes.input.textContent;

    if (event.type === 'paste') {
      url = (event.clipboardData || window.clipboardData).getData('text');
    }

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
   * @param {KeyboardEvent} event
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
   * @returns {HTMLElement}
   */
  prepareLinkPreview() {
    //const holder = this.make('a', this.CSS.linkContent, {
    //  target: '_blank',
    //  rel: 'nofollow noindex noreferrer',
    //});
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
   * Compose link preview from fetched data
   *
   * @param {metaData} meta - link meta data
   */
  showLinkPreview({ image, title, description }) {
    this.nodes.container.appendChild(this.nodes.linkContent);

    if (image && image.url) {
      const img = this.make('img', null, { src: image.url});
      this.nodes.linkImage.appendChild(img);
      //this.nodes.linkImage.style.backgroundImage = 'url(' + image.url + ')';
      this.nodes.anchor.appendChild(this.nodes.linkImage);
    }

    this.nodes.bodyHolder = this.make('div', this.CSS.body);
    if (title) {
      this.nodes.linkTitle.textContent = title;
      this.nodes.bodyHolder.appendChild(this.nodes.linkTitle);
    }

    if (description) {
      this.nodes.linkDescription.textContent = description;
      this.nodes.bodyHolder.appendChild(this.nodes.linkDescription);
    }
    this.nodes.anchor.appendChild(this.nodes.bodyHolder);
    this.nodes.anchor.appendChild(this.nodes.textArrow);

    //this.nodes.linkContent.classList.add(this.CSS.linkContentRendered);
    this.nodes.anchor.setAttribute('href', this.data.link);

    //TODO if week and price
    if (true) {
      this.nodes.bodyInfo = this.make('div', this.CSS.bodyInfo);
      this.nodes.infoWeek = this.make('p', this.CSS.infoWeek);
      this.nodes.infoPrice = this.make('p', this.CSS.infoPrice, { style: 'color:#0094CC'});

      this.nodes.infoWeek.textContent = '開催日:月,火,水,木,金,土';
      this.nodes.infoPrice.textContent = '1,200円';
      
      this.nodes.bodyInfo.appendChild(this.nodes.infoWeek);
      this.nodes.bodyInfo.appendChild(this.nodes.infoPrice);
      this.nodes.bodyHolder.appendChild(this.nodes.bodyInfo);
    }

    try {
      const getHost = (new URL(this.data.link)).hostname;
    } catch (e) {
      this.nodes.linkText.textContent = this.data.link;
    }
  }

  /**
   * Show loading progressbar
   */
  showProgress() {
    this.nodes.progress.classList.add(this.CSS.progressLoading);
  }

  /**
   * Hide loading progressbar
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
      const { body } = await (ajax.get({
        url: this.config.endpoint,
        headers: this.config.headers,
        data: {
          url,
        },
      }));

      this.onFetch(body);
    } catch (error) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t fetch the link data'));
    }
  }

  /**
   * Link data fetching callback
   *
   * @param {UploadResponseFormat} response
   */
  onFetch(response) {
    if (!response || !response.success) {
      this.fetchingFailed(this.api.i18n.t('Couldn\'t get this link data, try the other one'));

      return;
    }

    const metaData = response.meta;

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
      this.showLinkPreview(metaData);
    });
  }

  /**
   * Handle link fetching errors
   *
   * @private
   *
   * @param {string} errorMessage
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
   * @param tagName
   * @param classNames
   * @param attributes
   * @returns {HTMLElement}
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
