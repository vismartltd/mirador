(function($) {

  $.Viewer = function(options) {

    jQuery.extend(true, this, {
      id:                     options.id,
      hash:                   options.id,
      data:                   null,
      element:                null,
      canvas:                 null,
      workspaceType:          null,
      layout:                 null,
      workspace:              null,
      mainMenu:               null,
      workspaceAutoSave:      null,
      windowSize:             {},
      resizeRatio:            {},
      currentWorkspaceVisible: true,
      overlayStates:          {
        'workspacePanelVisible': false,
        'manifestsPanelVisible': false,
        'optionsPanelVisible': false,
        'bookmarkPanelVisible': false
      },
      manifests:             []
    }, $.DEFAULT_SETTINGS, options);

    // get initial manifests
    this.element = this.element || jQuery('#' + this.id);

    if (this.data) {
      this.init();
    }
  };

  $.Viewer.prototype = {

    init: function() {
      var _this = this;

      //add background and positioning information on the root element that is provided in config
      var backgroundImage = _this.buildPath + _this.imagesPath + 'debut_dark.png';
      this.element.css('background-color', '#333').css('background-image','url('+backgroundImage+')').css('background-position','left top')
      .css('background-repeat','repeat');//.css('position','fixed'); //fixing the position works badly when Mirador is used withing other dynamic widgets

      //initialize i18next
      i18n.init({debug: false, getAsync: false, resGetPath: _this.buildPath + _this.i18nPath+'__lng__/__ns__.json'});

      //register Handlebars helper
      Handlebars.registerHelper('t', function(i18n_key) {
        var result = i18n.t(i18n_key);
        return new Handlebars.SafeString(result);
      });

      //check all buttons in mainMenu.  If they are all set to false, then don't show mainMenu
      var showMainMenu = false;
      jQuery.each(this.mainMenuSettings.buttons, function(key, value) {
        if (value) { showMainMenu = true; }
      });
      //even if buttons are available, developer can override and set show to false
      if (this.mainMenuSettings.show === false) {
        showMainMenu = false;
      }

      // add main menu
      if (showMainMenu) {
        this.mainMenu = new $.MainMenu({ parent: this, appendTo: this.element });
      }

      // add viewer area
      this.canvas = jQuery('<div/>')
      .addClass('mirador-viewer')
      .appendTo(this.element);

      if (!showMainMenu) {
        this.canvas.css("top", "0px");
      }

      // add workspace configuration
      this.layout = typeof this.layout !== 'string' ? JSON.stringify(this.layout) : this.layout;
      this.workspace = new $.Workspace({
        layoutDescription: this.layout.charAt(0) === '{' ? JSON.parse(this.layout) : $.layoutDescriptionFromGridString(this.layout),
        parent: this,
        appendTo: this.element.find('.mirador-viewer')
      });

      this.workspacePanel = new $.WorkspacePanel({
        appendTo: this.element.find('.mirador-viewer'),
        parent: this,
        maxRows: this.workspacePanelSettings.maxRows,
        maxColumns: this.workspacePanelSettings.maxColumns,
        preserveWindows: this.workspacePanelSettings.preserveWindows,
        workspace: this.workspace
      });

      this.manifestsPanel = new $.ManifestsPanel({ parent: this, appendTo: this.element.find('.mirador-viewer') });
      this.bookmarkPanel = new $.BookmarkPanel({ parent: this, appendTo: this.element.find('.mirador-viewer'), jsonStorageEndpoint: this.jsonStorageEndpoint });

      // set this to be displayed
      this.set('currentWorkspaceVisible', true);

      this.bindEvents();
      // retrieve manifests
      this.getManifestsData();

      if (this.windowObjects.length === 0 && this.openManifestsPage) {
        this.workspace.slots[0].addItem();
      }
    },

    bindEvents: function() {
      var _this = this;
      // check that windows are loading first to set state of slot?
      jQuery.subscribe('manifestReceived', function(event, newManifest) {
        if (_this.windowObjects) {
          var check = jQuery.grep(_this.windowObjects, function(object, index) {
            return object.loadedManifest === newManifest.uri;
          });
          jQuery.each(check, function(index, config) {
            _this.loadManifestFromConfig(config);
          });
        }
      });

    },

    get: function(prop, parent) {
      if (parent) {
        return this[parent][prop];
      }
      return this[prop];
    },

    set: function(prop, value, options) {
      var _this = this;
      if (options) {
        this[options.parent][prop] = value;
      } else {
        this[prop] = value;
      }
      jQuery.publish(prop + '.set', value);
    },

    // Sets state of overlays that layer over the UI state
    toggleOverlay: function(state) {
      var _this = this;
      // first confirm all others are off
      jQuery.each(this.overlayStates, function(oState, value) {
        if (state !== oState) {
          _this.set(oState, false, {parent: 'overlayStates'});
        }
      });
      var currentState = this.get(state, 'overlayStates');
      this.set(state, !currentState, {parent: 'overlayStates'});
    },

    toggleLoadWindow: function() {
      this.toggleOverlay('manifestsPanelVisible');
    },

    toggleWorkspacePanel: function() {
      this.toggleOverlay('workspacePanelVisible');
    },

    toggleBookmarkPanel: function() {
      this.toggleOverlay('bookmarkPanelVisible');
    },

    enterFullscreen: function() {
      var el = this.element[0];
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    },

    exitFullscreen: function() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    },

    isFullscreen: function() {
      var $fullscreen = $(fullscreenElement());
      return ($fullscreen.length > 0);
    },

    fullscreenElement: function() {
      return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
    },

    getManifestsData: function() {
      var _this = this;

      _this.data.forEach(function(manifest) {
        if (manifest.hasOwnProperty('manifestUri')) {
          var url = manifest.manifestUri;
          _this.addManifestFromUrl(url, manifest.location ? manifest.location : '');
        } else if (manifest.hasOwnProperty('collectionUri')) {
          jQuery.getJSON(manifest.collectionUri).done(function (data, status, jqXHR) {
            if (data.hasOwnProperty('manifests')){
              jQuery.each(data.manifests, function (ci, mfst) {
                _this.addManifestFromUrl(mfst['@id'], '');
              });
            }
          }).fail(function(jqXHR, status, error) {
            console.log(jqXHR, status, error);
          });
        }
      });
    },

    hasWidgets: function(collection) {
      return (
        typeof collection.widgets !== 'undefined' &&
        collection.widgets &&
        !jQuery.isEmptyObject(collection.widgets) &&
        collection.widgets.length > 0
      );
    },

    addManifestFromUrl: function(url, location) {
      var _this = this,
      manifest;

      if (!_this.manifests[url]) {
        manifest = new $.Manifest(url, location);
        _this.manifests[url] = manifest;
        _this.manifests.push(manifest);
        jQuery.publish('manifestQueued', manifest, location);
        manifest.request.done(function() {
          jQuery.publish('manifestReceived', manifest);
        });
      }
    },

    loadManifestFromConfig: function(options) {
      // check if there are available slots, otherwise don't process this object from config
      //if we have more windowObjects that slots in the layout, return
      var slotAddress = options.slotAddress ? options.slotAddress : this.workspace.getAvailableSlot() ? this.workspace.getAvailableSlot().layoutAddress : null;
      if (!slotAddress) {
        return;
      }
      var windowConfig = {
        manifest: this.manifests[options.loadedManifest],
        currentFocus : options.viewType,
        focusesOriginal : options.availableViews,
        currentCanvasID : options.canvasID,
        id : options.id,
        focusOptions : options.windowOptions,
        bottomPanelAvailable : options.bottomPanel,
        bottomPanelVisible : options.bottomPanelVisible,
        sidePanelAvailable : options.sidePanel,
        sidePanelVisible : options.sidePanelVisible,
        overlayAvailable : options.overlay,
        annotationLayerAvailable : options.annotationLayer,
        annotationCreationAvailable : options.annotationCreation,
        annotationState : options.annotationState,
        fullScreenAvailable : options.fullScreen,
        slotAddress: slotAddress,
        displayLayout : options.displayLayout,
        layoutOptions: options.layoutOptions
      };

      this.workspace.addWindow(windowConfig);
    }
  };

}(Mirador));
