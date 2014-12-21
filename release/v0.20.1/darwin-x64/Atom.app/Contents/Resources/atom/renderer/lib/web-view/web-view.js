// Generated by CoffeeScript 1.7.1
(function() {
  var WebViewImpl, getNextId, guestViewInternal, listener, nextId, registerBrowserPluginElement, registerWebViewElement, remote, useCapture, v8Util, webFrame, webViewConstants,
    __slice = [].slice;

  v8Util = process.atomBinding('v8_util');

  guestViewInternal = require('./guest-view-internal');

  webViewConstants = require('./web-view-constants');

  webFrame = require('web-frame');

  remote = require('remote');

  nextId = 0;

  getNextId = function() {
    return ++nextId;
  };

  WebViewImpl = (function() {
    function WebViewImpl(webviewNode) {
      var shadowRoot;
      this.webviewNode = webviewNode;
      v8Util.setHiddenValue(this.webviewNode, 'internal', this);
      this.attached = false;
      this.pendingGuestCreation = false;
      this.elementAttached = false;
      this.beforeFirstNavigation = true;
      this.contentWindow = null;
      this.on = {};
      this.browserPluginNode = this.createBrowserPluginNode();
      shadowRoot = this.webviewNode.createShadowRoot();
      this.setupWebViewAttributes();
      this.setupFocusPropagation();
      this.setupWebviewNodeProperties();
      this.viewInstanceId = getNextId();
      guestViewInternal.registerEvents(this, this.viewInstanceId);
      shadowRoot.appendChild(this.browserPluginNode);
    }

    WebViewImpl.prototype.createBrowserPluginNode = function() {
      var browserPluginNode;
      browserPluginNode = new WebViewImpl.BrowserPlugin();
      v8Util.setHiddenValue(browserPluginNode, 'internal', this);
      return browserPluginNode;
    };

    WebViewImpl.prototype.reset = function() {
      if (this.guestInstanceId) {
        guestViewInternal.destroyGuest(this.guestInstanceId);
        this.guestInstanceId = void 0;
        this.beforeFirstNavigation = true;
        this.attributes[webViewConstants.ATTRIBUTE_PARTITION].validPartitionId = true;
        this.contentWindow = null;
      }
      return this.internalInstanceId = 0;
    };

    WebViewImpl.prototype.setRequestPropertyOnWebViewNode = function(request) {
      return Object.defineProperty(this.webviewNode, 'request', {
        value: request,
        enumerable: true
      });
    };

    WebViewImpl.prototype.setupFocusPropagation = function() {
      if (!this.webviewNode.hasAttribute('tabIndex')) {
        this.webviewNode.setAttribute('tabIndex', -1);
      }
      this.webviewNode.addEventListener('focus', (function(_this) {
        return function(e) {
          return _this.browserPluginNode.focus();
        };
      })(this));
      return this.webviewNode.addEventListener('blur', (function(_this) {
        return function(e) {
          return _this.browserPluginNode.blur();
        };
      })(this));
    };

    WebViewImpl.prototype.setupWebviewNodeProperties = function() {
      return Object.defineProperty(this.webviewNode, 'contentWindow', {
        get: (function(_this) {
          return function() {
            if (_this.contentWindow != null) {
              return _this.contentWindow;
            }
            return window.console.error(webViewConstants.ERROR_MSG_CONTENTWINDOW_NOT_AVAILABLE);
          };
        })(this),
        enumerable: true
      });
    };

    WebViewImpl.prototype.handleWebviewAttributeMutation = function(attributeName, oldValue, newValue) {
      if (!this.attributes[attributeName] || this.attributes[attributeName].ignoreMutation) {
        return;
      }
      return this.attributes[attributeName].handleMutation(oldValue, newValue);
    };

    WebViewImpl.prototype.handleBrowserPluginAttributeMutation = function(attributeName, oldValue, newValue) {
      if (attributeName === webViewConstants.ATTRIBUTE_INTERNALINSTANCEID && !oldValue && !!newValue) {
        this.browserPluginNode.removeAttribute(webViewConstants.ATTRIBUTE_INTERNALINSTANCEID);
        this.internalInstanceId = parseInt(newValue);
        if (!this.guestInstanceId) {
          return;
        }
        return guestViewInternal.attachGuest(this.internalInstanceId, this.guestInstanceId, this.buildAttachParams(), (function(_this) {
          return function(w) {
            return _this.contentWindow = w;
          };
        })(this));
      }
    };

    WebViewImpl.prototype.onSizeChanged = function(webViewEvent) {
      var height, maxHeight, maxWidth, minHeight, minWidth, newHeight, newWidth, node, width;
      newWidth = webViewEvent.newWidth;
      newHeight = webViewEvent.newHeight;
      node = this.webviewNode;
      width = node.offsetWidth;
      height = node.offsetHeight;
      maxWidth = this.attributes[webViewConstants.ATTRIBUTE_MAXWIDTH].getValue() | width;
      maxHeight = this.attributes[webViewConstants.ATTRIBUTE_MAXHEIGHT].getValue() | width;
      minWidth = this.attributes[webViewConstants.ATTRIBUTE_MINWIDTH].getValue() | width;
      minHeight = this.attributes[webViewConstants.ATTRIBUTE_MINHEIGHT].getValue() | width;
      if (!this.attributes[webViewConstants.ATTRIBUTE_AUTOSIZE].getValue() || (newWidth >= minWidth && newWidth <= maxWidth && newHeight >= minHeight && newHeight <= maxHeight)) {
        node.style.width = newWidth + 'px';
        node.style.height = newHeight + 'px';
        return this.dispatchEvent(webViewEvent);
      }
    };

    WebViewImpl.prototype.createGuest = function() {
      var params;
      if (this.pendingGuestCreation) {
        return;
      }
      params = {
        storagePartitionId: this.attributes[webViewConstants.ATTRIBUTE_PARTITION].getValue()
      };
      guestViewInternal.createGuest('webview', params, (function(_this) {
        return function(guestInstanceId) {
          _this.pendingGuestCreation = false;
          if (!_this.elementAttached) {
            guestViewInternal.destroyGuest(guestInstanceId);
            return;
          }
          return _this.attachWindow(guestInstanceId);
        };
      })(this));
      return this.pendingGuestCreation = true;
    };

    WebViewImpl.prototype.dispatchEvent = function(webViewEvent) {
      return this.webviewNode.dispatchEvent(webViewEvent);
    };

    WebViewImpl.prototype.setupEventProperty = function(eventName) {
      var propertyName;
      propertyName = 'on' + eventName.toLowerCase();
      return Object.defineProperty(this.webviewNode, propertyName, {
        get: (function(_this) {
          return function() {
            return _this.on[propertyName];
          };
        })(this),
        set: (function(_this) {
          return function(value) {
            if (_this.on[propertyName]) {
              _this.webviewNode.removeEventListener(eventName, _this.on[propertyName]);
            }
            _this.on[propertyName] = value;
            if (value) {
              return _this.webviewNode.addEventListener(eventName, value);
            }
          };
        })(this),
        enumerable: true
      });
    };

    WebViewImpl.prototype.onLoadCommit = function(baseUrlForDataUrl, currentEntryIndex, entryCount, processId, url, isTopLevel) {
      var newValue, oldValue;
      this.baseUrlForDataUrl = baseUrlForDataUrl;
      this.currentEntryIndex = currentEntryIndex;
      this.entryCount = entryCount;
      this.processId = processId;
      oldValue = this.webviewNode.getAttribute(webViewConstants.ATTRIBUTE_SRC);
      newValue = url;
      if (isTopLevel && (oldValue !== newValue)) {
        return this.attributes[webViewConstants.ATTRIBUTE_SRC].setValueIgnoreMutation(newValue);
      }
    };

    WebViewImpl.prototype.onAttach = function(storagePartitionId) {
      return this.attributes[webViewConstants.ATTRIBUTE_PARTITION].setValue(storagePartitionId);
    };

    WebViewImpl.prototype.buildAttachParams = function() {
      var attribute, attributeName, params, _ref;
      params = {
        instanceId: this.viewInstanceId,
        userAgentOverride: this.userAgentOverride
      };
      _ref = this.attributes;
      for (attributeName in _ref) {
        attribute = _ref[attributeName];
        params[attributeName] = attribute.getValue();
      }
      return params;
    };

    WebViewImpl.prototype.attachWindow = function(guestInstanceId) {
      var params;
      this.guestInstanceId = guestInstanceId;
      params = this.buildAttachParams();
      if (!this.internalInstanceId) {
        return true;
      }
      return guestViewInternal.attachGuest(this.internalInstanceId, this.guestInstanceId, params, (function(_this) {
        return function(w) {
          return _this.contentWindow = w;
        };
      })(this));
    };

    return WebViewImpl;

  })();

  registerBrowserPluginElement = function() {
    var proto;
    proto = Object.create(HTMLObjectElement.prototype);
    proto.createdCallback = function() {
      this.setAttribute('type', 'application/browser-plugin');
      this.setAttribute('id', 'browser-plugin-' + getNextId());
      this.style.width = '100%';
      return this.style.height = '100%';
    };
    proto.attributeChangedCallback = function(name, oldValue, newValue) {
      var internal;
      internal = v8Util.getHiddenValue(this, 'internal');
      if (!internal) {
        return;
      }
      return internal.handleBrowserPluginAttributeMutation(name, oldValue, newValue);
    };
    proto.attachedCallback = function() {
      var unused;
      return unused = this.nonExistentAttribute;
    };
    WebViewImpl.BrowserPlugin = webFrame.registerEmbedderCustomElement('browserplugin', {
      "extends": 'object',
      prototype: proto
    });
    delete proto.createdCallback;
    delete proto.attachedCallback;
    delete proto.detachedCallback;
    return delete proto.attributeChangedCallback;
  };

  registerWebViewElement = function() {
    var createHandler, m, methods, proto, _i, _len;
    proto = Object.create(HTMLObjectElement.prototype);
    proto.createdCallback = function() {
      return new WebViewImpl(this);
    };
    proto.attributeChangedCallback = function(name, oldValue, newValue) {
      var internal;
      internal = v8Util.getHiddenValue(this, 'internal');
      if (!internal) {
        return;
      }
      return internal.handleWebviewAttributeMutation(name, oldValue, newValue);
    };
    proto.detachedCallback = function() {
      var internal;
      internal = v8Util.getHiddenValue(this, 'internal');
      if (!internal) {
        return;
      }
      internal.elementAttached = false;
      return internal.reset();
    };
    proto.attachedCallback = function() {
      var internal;
      internal = v8Util.getHiddenValue(this, 'internal');
      if (!internal) {
        return;
      }
      if (!internal.elementAttached) {
        internal.elementAttached = true;
        return internal.attributes[webViewConstants.ATTRIBUTE_SRC].parse();
      }
    };
    methods = ["getUrl", "getTitle", "isLoading", "isWaitingForResponse", "stop", "reload", "reloadIgnoringCache", "canGoBack", "canGoForward", "canGoToOffset", "goBack", "goForward", "goToIndex", "goToOffset", "isCrashed", "setUserAgent", "executeJavaScript", "insertCSS", "openDevTools", "closeDevTools", "isDevToolsOpened", "send", "getId"];
    createHandler = function(m) {
      return function() {
        var args, internal, _ref;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        internal = v8Util.getHiddenValue(this, 'internal');
        return (_ref = remote.getGuestWebContents(internal.guestInstanceId))[m].apply(_ref, args);
      };
    };
    for (_i = 0, _len = methods.length; _i < _len; _i++) {
      m = methods[_i];
      proto[m] = createHandler(m);
    }
    window.WebView = webFrame.registerEmbedderCustomElement('webview', {
      prototype: proto
    });
    delete proto.createdCallback;
    delete proto.attachedCallback;
    delete proto.detachedCallback;
    return delete proto.attributeChangedCallback;
  };

  useCapture = true;

  listener = function(event) {
    if (document.readyState === 'loading') {
      return;
    }
    registerBrowserPluginElement();
    registerWebViewElement();
    return window.removeEventListener(event.type, listener, useCapture);
  };

  window.addEventListener('readystatechange', listener, true);

  module.exports = WebViewImpl;

}).call(this);