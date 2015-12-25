(function($) {
  $.getTools = function() {
    if (this.svgOverlayTools) {
      return this.svgOverlayTools;
    }
    this.svgOverlayTools = [new $.Rectangle(), new $.Freehand(), new $.Polygon(), new $.Ellipse(), new $.Pin()];
    return this.svgOverlayTools;
  };

  OpenSeadragon.Viewer.prototype.svgOverlay = function(windowId) {
    if (this.svgOverlayInfo) {
      return this.svgOverlayInfo;
    }
    this.svgOverlayInfo = new $.Overlay(this, windowId);
    return this.svgOverlayInfo;
  };

  $.Overlay = function(viewer, windowId) {
    jQuery.extend(this, {
      disabled: false,
      windowId: windowId,
      mode: '', // Possible modes: 'create', 'translate', 'deform', 'edit' and '' as default.
      hoveredPath: null,
      path: null,
      segment: null,
      latestMouseDownTime: -1,
      doubleClickReactionTime: 300,
      hitOptions: {
        fill: true,
        stroke: true,
        segments: true,
        tolerance: 5
      }
    });

    // Initialization of overlay object.
    this.tools = $.getTools();
    this.currentTool = null;
    // Default colors.
    this.strokeColor = 'red';
    this.fillColor = 'green';
    this.fillColorAlpha = 0.0;
    this.viewer = viewer;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'canvas';
    // Drawing of overlay border during development.
    // this.canvas.style.border = '1px solid yellow';
    this.viewer.canvas.appendChild(this.canvas);
    this.initialZoom = this.viewer.viewport.getZoom(true);
    this.currentPinSize = this.viewer.viewport.getZoom(true);

    var _this = this;
    this.viewer.addHandler('animation', function() {
      _this.resize();
    });
    this.viewer.addHandler('open', function() {
      _this.resize();
    });
    jQuery.subscribe('toggleDrawingTool.' + _this.windowId, function(event, tool) {
      if (_this.disabled) {
        return;
      }
      _this.currentTool = null;
      for (var i = 0; i < _this.tools.length; i++) {
        if (_this.tools[i].logoClass == tool) {
          _this.currentTool = _this.tools[i];
        }
      }
    });
    jQuery.subscribe('changeBorderColor.' + _this.windowId, function(event, color) {
      _this.strokeColor = color;
      if (_this.path) {
        _this.path.strokeColor = color;
        paper.view.draw();
      }
    });
    jQuery.subscribe('changeFillColor.' + _this.windowId, function(event, color, alpha) {
      _this.fillColor = color;
      _this.fillColorAlpha = alpha;
      if (_this.path) {
        _this.path.fillColor = color;
        _this.path.fillColor.alpha = alpha;
        paper.view.draw();
      }
    });

    this.resize();
    this.show();
    this.init();
  };

  $.Overlay.prototype = {
    init: function() {
      // Initialization of Paper.js overlay.
      var _this = this;
      paper.install(window);
      paper.setup('canvas');
      var mouseTool = new Tool();
      mouseTool.overlay = this;
      mouseTool.onMouseUp = _this.onMouseUp;
      mouseTool.onMouseDrag = _this.onMouseDrag;
      mouseTool.onMouseMove = _this.onMouseMove;
      mouseTool.onMouseDown = _this.onMouseDown;
      mouseTool.onDoubleClick = _this.onDoubleClick;
    },

    onMouseUp: function(event) {
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onMouseUp(event, this.overlay);
      }
    },

    onMouseDrag: function(event) {
      this.overlay.hover(event);
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onMouseDrag(event, this.overlay);
      }
      paper.view.draw();
    },

    onMouseMove: function(event) {
      this.overlay.hover(event);
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onMouseMove(event, this.overlay);
      }
      paper.view.draw();
    },

    onMouseDown: function(event) {
      var date = new Date();
      var time = date.getTime();
      if (time - this.overlay.latestMouseDownTime < this.overlay.doubleClickReactionTime) {
        this.overlay.latestMouseDownTime = time;
        this.onDoubleClick(event);
      } else {
        this.overlay.latestMouseDownTime = time;
        this.overlay.hover(event);
        if (this.overlay.currentTool) {
          this.overlay.currentTool.onMouseDown(event, this.overlay);
        }
      }
      paper.view.draw();
    },

    onDoubleClick: function(event) {
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onDoubleClick(event, this.overlay);
      }
    },

    resize: function() {
      var pointZero = this.viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
      var scale = this.viewer.viewport.containerSize.x * this.viewer.viewport.getZoom(true);
      this.canvas.width = scale;
      this.canvas.height = scale * (this.viewer.viewport.contentSize.y / this.viewer.viewport.contentSize.x);
      var transform = 'translate(' + pointZero.x + 'px,' + pointZero.y + 'px)';
      this.canvas.style.WebkitTransform = transform;
      this.canvas.style.msTransform = transform;
      this.canvas.style.transform = transform;
      if (paper && paper.view) {
        paper.view.zoom = this.viewer.viewport.getZoom(true) / this.initialZoom;
        paper.view.center = new Size(paper.view.bounds.width / 2, paper.view.bounds.height / 2);
        paper.view.update(true);
        // Fit pins to the current zoom level.
        var items = project.getItems({
          name: /^pin_/
        });
        for (var i = 0; i < items.length; i++) {
          items[i].scale(this.currentPinSize / paper.view.zoom);
        }
        this.currentPinSize = paper.view.zoom;
      }
    },

    hover: function(event) {
      if (this.currentTool && event.item && event.item._name.toString().indexOf(this.currentTool.idPrefix) != -1) {
        if (this.hoveredPath) {
          this.hoveredPath.selected = false;
        }
        event.item.selected = true;
        this.hoveredPath = event.item;
      }
    },

    hide: function() {
      this.disabled = true;
      this.canvas.style.display = 'none';
      jQuery.publish('disableBorderColorPicker.' + this.windowId, true);
      jQuery.publish('disableFillColorPicker.' + this.windowId, true);
      this.currentTool = null;
    },

    show: function() {
      this.disabled = false;
      this.canvas.style.display = 'block';
      jQuery.publish('disableBorderColorPicker.' + this.windowId, false);
      jQuery.publish('disableFillColorPicker.' + this.windowId, false);
    },

    disable: function() {
      this.disabled = true;
      jQuery.publish('disableBorderColorPicker.' + this.windowId, true);
      jQuery.publish('disableFillColorPicker.' + this.windowId, true);
      this.currentTool = null;
    },

    enable: function() {
      this.disabled = false;
      jQuery.publish('disableBorderColorPicker.' + this.windowId, false);
      jQuery.publish('disableFillColorPicker.' + this.windowId, false);
    },

    refresh: function() {
      paper.view.update(true);
    },
  };
}(Mirador));