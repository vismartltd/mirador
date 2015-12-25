(function($) {

  $.AnnotationsLayer = function(options) {

    jQuery.extend(true, this, {
      parent:            null,
      annotationsList:   null,
      viewer:            null,
      renderer:          null,
      drawTool:          null,
      selected:          null,
      hovered:           null,
      windowId:          null,
      mode:              'default',
      element:           null
    }, options);

    this.init();
  };

  $.AnnotationsLayer.prototype = {

    init: function() {
      var _this = this;
      jQuery.unsubscribe(('modeChange.' + _this.windowId));
      jQuery.unsubscribe(('annotationListLoaded.' + _this.windowId));

      this.createRenderer();
      this.bindEvents();
    },

    bindEvents: function() {
      var _this = this;

      jQuery.subscribe('modeChange.' + _this.windowId, function(event, modeName) {
        _this.mode = modeName;
        _this.modeSwitch();
      });

      jQuery.subscribe('annotationListLoaded.' + _this.windowId, function(event) {
        _this.annotationsList = _this.parent.parent.annotationsList;
        _this.updateRenderer();
      });
    },

    createRenderer: function() {
      var _this = this;
      this.renderer = new $.OsdCanvasRenderer({
        osd: $.OpenSeadragon,
        osdViewer: _this.viewer,
        list: _this.annotationsList, // must be passed by reference.
        visible: false,
        parent: _this
      });
      this.modeSwitch();
    },
    
    updateRenderer: function() {
      this.renderer.list = this.annotationsList;
      this.modeSwitch();
    },
    
    modeSwitch: function() {
      if (this.mode === 'displayAnnotations') { this.enterDisplayAnnotations(); }
      else if (this.mode === 'editingAnnotations') { this.enterEditAnnotations(); }
      else if (this.mode === 'default') { this.enterDefault(); }
      else {}
    },


    enterDisplayAnnotations: function() {
      var _this = this;
      if (this.drawTool) {
        this.drawTool.exitEditMode();
        this.drawTool.showAnnotations();
      }
      this.renderer.render();
    },

    enterEditAnnotations: function() {
      var _this = this;
      if (!this.drawTool) {
        this.drawTool = new $.OsdRegionDrawTool({
          osdViewer: _this.viewer,
          parent: _this
        });
      } else {
        this.drawTool.reset(_this.viewer);
      }
      this.renderer.render();
      this.drawTool.enterEditMode();
    },

    enterDefault: function() {
      if (this.drawTool) {
        this.drawTool.exitEditMode();
        this.drawTool.hideAnnotations();
      }
      this.renderer.hideAll();
    }

  };

}(Mirador));
