(function($) {
  $.getTools = function() {
    if (this.svgOverlayTools) {
      return this.svgOverlayTools;
    }
    this.svgOverlayTools = [new $.Rectangle(), new $.Freehand(), new $.Polygon(), new $.Ellipse(), new $.Pin()];
    return this.svgOverlayTools;
  };

  OpenSeadragon.Viewer.prototype.svgOverlay = function(windowObj) {
    if (this.svgOverlayInfo) {
      return this.svgOverlayInfo;
    }
    this.svgOverlayInfo = new $.Overlay(this, windowObj);
    return this.svgOverlayInfo;
  };

  $.Overlay = function(viewer, windowObj) {
    jQuery.extend(this, {
      disabled: false,
      window: windowObj,
      windowId: windowObj.windowId,
      commentPanel: null,
      mode: '', // Possible modes: 'create', 'translate', 'deform', 'edit' and '' as default.
      draftPaths: [],
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
    this.canvas.id = 'draw_canvas_' + this.windowId;
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
      if (_this.hoveredPath) {
        _this.hoveredPath.strokeColor = color;
        paper.view.draw();
      }
    });
    jQuery.subscribe('changeFillColor.' + _this.windowId, function(event, color, alpha) {
      _this.fillColor = color;
      _this.fillColorAlpha = alpha;
      if (_this.hoveredPath) {
        _this.hoveredPath.fillColor = color;
        _this.hoveredPath.fillColor.alpha = alpha;
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
      paper.setup('draw_canvas_' + _this.windowId);
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

    deselectAll: function() {
      if (paper && paper.view && paper.project) {
        paper.project.deselectAll();
        paper.view.update(true);
      }
    },

    hide: function() {
      this.canvas.style.display = 'none';
      this.currentTool = null;
      this.deselectAll();
    },

    show: function() {
      this.canvas.style.display = 'block';
    },

    disable: function() {
      this.disabled = true;
      jQuery.publish('disableBorderColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('disableFillColorPicker.' + this.windowId, this.disabled);
      this.currentTool = null;
      this.deselectAll();
    },

    enable: function() {
      this.disabled = false;
      jQuery.publish('disableBorderColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('disableFillColorPicker.' + this.windowId, this.disabled);
    },

    refresh: function() {
      paper.view.update(true);
    },

    onDrawFinish: function() {
      var shape = this.path;
      if (!shape) {
        return;
      }
      if (this.hoveredPath) {
        this.hoveredPath.selected = false;
      }
      this.hoveredPath = shape;
      this.hoveredPath.selected = true;
      this.segment = null;
      this.path = null;
      this.mode = '';
      this.draftPaths.push(shape);
      var _this = this;
      var annoTooltip = new $.AnnotationTooltip({"windowId" : _this.windowId});
      if (!_this.commentPanel) {
        _this.commentPanel = jQuery(_this.canvas.parentNode).qtip({
            content: {
              text : annoTooltip.getEditor({})
            },
            position: {
              my: 'center',
              at: 'center'
            },
            style : {
              classes : 'qtip-bootstrap'
            },
            show: {
              event: false
            },
            hide: {
              fixed: true,
              delay: 300,
              event: false
            },
            events: {
              render: function(event, api) {
                jQuery.publish('annotationEditorAvailable.'+_this.windowId);
                jQuery.publish('disableTooltips.'+_this.windowId);

                var selector = '#annotation-editor-'+_this.windowId;
                jQuery(selector).parent().parent().draggable();

                tinymce.init({
                  selector : selector+' textarea',
                  plugins: "image link media",
                  menubar: false,
                  statusbar: false,
                  toolbar_items_size: 'small',
                  toolbar: "bold italic | bullist numlist | link image media | removeformat",
                  setup : function(editor) {
                    editor.on('init', function(args) {
                      tinymce.execCommand('mceFocus', false, args.target.id);
                    });
                  }
                });

                jQuery(selector).on("submit", function(event) {
                  event.preventDefault();
                  jQuery(selector+' a.save').click();
                });

                jQuery(selector+' a.cancel').on("click", function(event) {
                  event.preventDefault();
                  var content = tinymce.activeEditor.getContent();
                  if (content) {
                    if (!window.confirm("Do you want to cancel this annotation?")) { 
                      return false;
                    }
                  }
                  api.destroy();

                  // clear draft data.
                  for (var idx = 0; idx < _this.draftPaths.length; idx++) {
                    _this.draftPaths[idx].remove();
                  }
                  _this.draftPaths = [];
                  paper.view.update(true);
                  project.activeLayer.selected = false;
                  _this.segment = null;
                  _this.path = null;
                  _this.mode = '';

                  //reenable viewer tooltips
                  jQuery.publish('enableTooltips.'+_this.windowId);
                  _this.commentPanel = null;
                });

                jQuery(selector+' a.save').on("click", function(event) {
                  event.preventDefault();
                  var tagText = jQuery(this).parents('.annotation-editor').find('.tags-editor').val(),
                  resourceText = tinymce.activeEditor.getContent(),
                  tags = [];
                  tagText = $.trimString(tagText);
                  if (tagText) {
                    tags = tagText.split(/\s+/);
                  } 

                  var bounds = _this.viewer.viewport.getBounds(true);
                  var scope = _this.viewer.viewport.viewportToImageRectangle(bounds);
                  
                  var motivation = [],
                  resource = [],
                  on;

                  var svg = "<svg xmlns='http://www.w3.org/2000/svg'>";
                  if (_this.draftPaths.length > 1) {
                    svg+= "<g>";
                    for (var i = 0; i < _this.draftPaths.length; i++) {
                      svg+= _this.draftPaths[i].exportSVG({"asString":true});
                    }
                    svg+= "</g>";
                  } else {
                    svg+= _this.draftPaths[0].exportSVG({"asString":true});
                  }
                  svg+= "</svg>";

                  if (tags && tags.length > 0) {
                   motivation.push("oa:tagging");
                   jQuery.each(tags, function(index, value) {
                    resource.push({      
                     "@type":"oa:Tag",
                     "chars":value
                    });
                   });
                  }
                  motivation.push("oa:commenting");
                  on = { "@type" : "oa:SpecificResource",
                  "source" : _this.window.parent.canvasID, 
                  "selector" : {
                    "@type" : "oa:SvgSelector",
                    "value" : svg
                  },
                  "scope": {
                    "@context" : "http://www.harvard.edu/catch/oa.json",
                    "@type" : "catch:Viewport",
                    "value" : "xywh="+Math.round(scope.x)+","+Math.round(scope.y)+","+Math.round(scope.width)+","+Math.round(scope.height) //osd bounds
                  }
                };
                resource.push( {
                  "@type" : "dctypes:Text",
                  "format" : "text/html",
                  "chars" : resourceText
                });
                var oaAnno = {
                 "@context" : "http://iiif.io/api/presentation/2/context.json",
                 "@type" : "oa:Annotation",
                 "motivation" : motivation,
                 "resource" : resource,
                 "on" : on
                };
                //save to endpoint
                jQuery.publish('annotationCreated.'+_this.windowId, [oaAnno, shape]);

                api.destroy();
                //reenable viewer tooltips
                jQuery.publish('enableTooltips.'+_this.windowId);
                _this.commentPanel = null;
                // clear draft data.
                for (var idx = 0; idx < _this.draftPaths.length; idx++) {
                  _this.draftPaths[idx].remove();
                }
                _this.draftPaths = [];
                paper.view.update(true);
                project.activeLayer.selected = false;
                _this.segment = null;
                _this.path = null;
                _this.mode = '';
                });
              }
            }
        });
        _this.commentPanel.qtip('show');
      }
    }
  };
}(Mirador));