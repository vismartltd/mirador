(function($) {
  OpenSeadragon.Viewer.prototype.svgOverlay = function() {
    if (this.svgOverlayInfo) {
      return this.svgOverlayInfo;
    }
    this.svgOverlayInfo = new $.Overlay(this);
    return this.svgOverlayInfo;
  };

  $.Overlay = function(viewer) {
    jQuery.extend(this, {
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
    this.freehandTool = new $.Freehand();
    this.polygonTool = new $.Polygon();
    this.ellipseTool = new $.Ellipse();
    this.rectangleTool = new $.Rectangle();
    this.currentTool = null;
    // Default colors.
    this.strokeColor = 'red';
    this.fillColor = 'green';
    this.viewer = viewer;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'canvas';
    // Drawing of overlay border during development.
    this.canvas.style.border = '1px solid yellow';
    this.viewer.canvas.appendChild(this.canvas);
    this.initialZoom = this.viewer.viewport.getZoom(true);

    var _this = this;
    this.viewer.addHandler('animation', function() {
      _this.resize();
    });
    this.viewer.addHandler('open', function() {
      _this.resize();
    });
    jQuery.subscribe('toggleDrawingTool', function(event, tool) {
      switch (tool) {
        case 'fa-pencil':
          _this.currentTool = _this.freehandTool;
          break;
        case 'fa-bookmark-o':
          _this.currentTool = _this.polygonTool;
          break;
        case 'fa-circle-o':
          _this.currentTool = _this.ellipseTool;
          break;
        case 'fa-square-o':
          _this.currentTool = _this.rectangleTool;
          break;
        default:
          _this.currentTool = null;
          break;
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
      this.canvas.style.display = 'none';
    },

    show: function() {
      this.canvas.style.display = 'block';
    },

    refresh: function() {
      paper.view.update(true);
    },
  };
}(Mirador));