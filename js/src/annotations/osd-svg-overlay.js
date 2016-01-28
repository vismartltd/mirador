(function($) {
  $.getTools = function() {
    if (this.svgOverlayTools) {
      return this.svgOverlayTools;
    }
    this.svgOverlayTools = [new $.Rectangle(), new $.Freehand(), new $.Polygon(), new $.Ellipse(), new $.Pin()];
    return this.svgOverlayTools;
  };

  OpenSeadragon.Viewer.prototype.svgOverlay = function(windowObj) {
    return new $.Overlay(this, windowObj);
  };

  $.Overlay = function(viewer, windowObj) {
    jQuery.extend(this, {
      disabled: false,
      window: windowObj,
      windowId: windowObj.windowId,
      commentPanel: null,
      mode: '', // Possible modes: 'create', 'translate', 'deform', 'edit' and '' as default.
      draftPaths: [],
      editedPaths: [],
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
    this.fillColorAlpha = 0.5;
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
      jQuery(_this.viewer.canvas).parents('.slot').find('.draw-tool').css('opacity', '');
      for (var i = 0; i < _this.tools.length; i++) {
        if (_this.tools[i].logoClass == tool) {
          _this.currentTool = _this.tools[i];
          jQuery(_this.viewer.canvas).parents('.slot').find('.' + tool).parent('.draw-tool').css('opacity', '1');
        }
      }
    });
    jQuery.subscribe('changeBorderColor.' + _this.windowId, function(event, color) {
      _this.strokeColor = color;
      if (_this.hoveredPath) {
        _this.hoveredPath.strokeColor = color;
        _this.paperScope.view.draw();
      }
    });
    jQuery.subscribe('changeFillColor.' + _this.windowId, function(event, color, alpha) {
      _this.fillColor = color;
      _this.fillColorAlpha = alpha;
      if (_this.hoveredPath && _this.hoveredPath.closed) {
        _this.hoveredPath.fillColor = color;
        _this.hoveredPath.fillColor.alpha = alpha;
        _this.paperScope.view.draw();
      }
    });
    jQuery.publish('initBorderColor.' + _this.windowId, _this.strokeColor);
    jQuery.publish('initFillColor.' + _this.windowId, [_this.fillColor, _this.fillColorAlpha]);

    this.resize();
    this.show();
    this.init();
  };

  $.Overlay.prototype = {
    init: function() {
      // Initialization of Paper.js overlay.
      var _this = this;
      this.paperScope = new paper.PaperScope();
      this.paperScope.setup('draw_canvas_' + _this.windowId);
      var mouseTool = new this.paperScope.Tool();
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
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onMouseDrag(event, this.overlay);
      }
      this.overlay.paperScope.view.draw();
    },

    onMouseMove: function(event) {
      if (this.overlay.currentTool) {
        this.overlay.currentTool.onMouseMove(event, this.overlay);
      } else {
        var absolutePoint = {
          'x': event.event.clientX,
          'y': event.event.clientY
        };
        jQuery.publish('updateTooltips.' + this.overlay.windowId, [event.point, absolutePoint]);
      }
      this.overlay.paperScope.view.draw();
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
          if (this.overlay.mode == 'translate' || this.overlay.mode == 'deform' || this.overlay.mode == 'edit') {
            if (this.overlay.path && this.overlay.path.data.annotation) {
              var inArray = false;
              for (var i = 0; i < this.overlay.editedPaths.length; i++) {
                if (this.overlay.editedPaths[i].name == this.overlay.path.name) {
                  inArray = true;
                  break;
                }
              }
              if (!inArray) {
                this.overlay.editedPaths.push(this.overlay.path);
              }
            }
          }
        }
      }
      this.overlay.paperScope.view.draw();
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
      var transform = 'translate(0px,0px)';
      this.canvas.style.WebkitTransform = transform;
      this.canvas.style.msTransform = transform;
      this.canvas.style.transform = transform;
      this.canvas.style.marginLeft = pointZero.x + "px";
      this.canvas.style.marginTop = pointZero.y + "px";
      if (this.paperScope && this.paperScope.view) {
        this.paperScope.view.viewSize = new this.paperScope.Size(this.canvas.width, this.canvas.height);
        this.paperScope.view.zoom = this.viewer.viewport.getZoom(true) / this.initialZoom;
        this.paperScope.view.center = new this.paperScope.Size(this.paperScope.view.bounds.width / 2, this.paperScope.view.bounds.height / 2);
        this.paperScope.view.update(true);
        // Fit pins to the current zoom level.
        var items = this.paperScope.project.getItems({
          name: /^pin_/
        });
        for (var i = 0; i < items.length; i++) {
          items[i].scale(this.currentPinSize / this.paperScope.view.zoom);
        }
        this.currentPinSize = this.paperScope.view.zoom;
      }
    },

    hover: function(event) {
      if (this.currentTool && event.item && event.item._name.toString().indexOf(this.currentTool.idPrefix) != -1) {
        this.removeFocus();
        event.item.selected = true;
        this.hoveredPath = event.item;
      }
    },

    removeFocus: function() {
      if (this.hoveredPath) {
        this.hoveredPath.selected = false;
        this.hoveredPath = null;
      }
    },

    restoreEditedShapes: function() {
      this.editedPaths = [];
      this.removeFocus();
    },

    // replaces paper.js objects with the required properties only.
    replaceShape: function(shape, annotation) {
      var cloned = new this.paperScope.Path({
        segments: shape.segments,
        name: shape.name
      });
      cloned.strokeColor = shape.strokeColor;
      if (shape.fillColor) {
        cloned.fillColor = shape.fillColor;
        if (shape.fillColor.alpha) {
          cloned.fillColor.alpha = shape.fillColor.alpha;
        }
      }
      cloned.closed = shape.closed;
      cloned.data.rotation = shape.data.rotation;
      cloned.data.annotation = annotation;
      if (cloned.name.toString().indexOf('pin_') != -1) { // pin shapes with fixed size.
        cloned.scale(1 / this.paperScope.view.zoom);
      }
      shape.remove();
      return cloned;
    },

    parseSVG: function(svg, annotation) {
      var paperItems = [];
      var svgParser = new DOMParser();
      var svgDOM = svgParser.parseFromString(svg, "text/xml");
      if (svgDOM.documentElement.nodeName == "parsererror") {
        return; // if svg is not valid XML structure - backward compatibility.
      }
      var svgTag = this.paperScope.project.importSVG(svg);
      // removes SVG tag which is the root object of comment SVG segment.
      var body = svgTag.removeChildren()[0];
      svgTag.remove();
      if (body.className == 'Group') {
        // removes group tag which wraps the set of objects of comment SVG segment.
        var items = body.removeChildren();
        for (var itemIdx = 0; itemIdx < items.length; itemIdx++) {
          paperItems.push(this.replaceShape(items[itemIdx], annotation));
        }
        body.remove();
      } else {
        paperItems.push(this.replaceShape(body, annotation));
      }
      this.paperScope.view.update(true);
      return paperItems;
    },

    // Restore latest view before rendering.
    restoreLastView: function(shapeArray) {
      for (var i = 0; i < this.editedPaths.length; i++) {
        for (var idx = 0; idx < shapeArray.length; idx++) {
          if (shapeArray[idx].name == this.editedPaths[i].name) {
            shapeArray[idx].segments = this.editedPaths[i].segments;
            shapeArray[idx].name = this.editedPaths[i].name;
            shapeArray[idx].strokeColor = this.editedPaths[i].strokeColor;
            if (this.editedPaths[i].fillColor) {
              shapeArray[idx].fillColor = this.editedPaths[i].fillColor;
              if (this.editedPaths[i].fillColor.alpha) {
                shapeArray[idx].fillColor.alpha = this.editedPaths[i].fillColor.alpha;
              }
            }
            shapeArray[idx].closed = this.editedPaths[i].closed;
            shapeArray[idx].data.rotation = this.editedPaths[i].data.rotation;
            shapeArray[idx].data.annotation = this.editedPaths[i].data.annotation;
            if (shapeArray[idx].name.toString().indexOf('pin_') != -1) { // pin shapes with fixed size.
              shapeArray[idx].scale(1 / this.paperScope.view.zoom);
            }
          }
        }
      }
    },

    deselectAll: function() {
      if (this.paperScope && this.paperScope.view && this.paperScope.project) {
        this.paperScope.project.deselectAll();
        this.paperScope.view.update(true);
        this.destroyCommentPanel();
      }
    },

    hide: function() {
      this.canvas.style.display = 'none';
      jQuery.publish('toggleDrawingTool.' + this.windowId, '');
      this.deselectAll();
    },

    show: function() {
      this.canvas.style.display = 'block';
    },

    disable: function() {
      this.disabled = true;
      jQuery.publish('hideDrawTools.' + this.windowId);
      jQuery.publish('disableBorderColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('disableFillColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('enableTooltips.' + this.windowId);
      jQuery.publish('toggleDrawingTool.' + this.windowId, '');
      this.deselectAll();
    },

    enable: function() {
      this.disabled = false;
      jQuery.publish('showDrawTools.' + this.windowId);
      jQuery.publish('disableBorderColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('disableFillColorPicker.' + this.windowId, this.disabled);
      jQuery.publish('disableTooltips.' + this.windowId);
    },

    refresh: function() {
      this.paperScope.view.update(true);
    },

    destroyCommentPanel: function() {
      jQuery(this.canvas).parents('.mirador-osd').qtip('destroy', true);
      this.commentPanel = null;
    },

    getName: function(tool) {
      return tool.idPrefix + $.genUUID();
    },

    getSVGString: function(shapes) {
      var svg = "<svg xmlns='http://www.w3.org/2000/svg'>";
      if (shapes.length > 1) {
        svg += "<g>";
        for (var i = 0; i < shapes.length; i++) {
          if (shapes[i].name.toString().indexOf('pin_') != -1) {
            shapes[i].scale(this.currentPinSize);
          }
          var anno = shapes[i].data.annotation;
          shapes[i].data.annotation = null;
          svg += shapes[i].exportSVG({
            "asString": true
          });
          shapes[i].data.annotation = anno;
        }
        svg += "</g>";
      } else {
        if (shapes[0].name.toString().indexOf('pin_') != -1) {
          shapes[0].scale(this.currentPinSize);
        }
        var annoSingle = shapes[0].data.annotation;
        shapes[0].data.annotation = null;
        svg += shapes[0].exportSVG({
          "asString": true
        });
        shapes[0].data.annotation = annoSingle;
      }
      svg += "</svg>";
      return svg;
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
      var annoTooltip = new $.AnnotationTooltip({
        "windowId": _this.windowId
      });
      if (!_this.commentPanel) {
        _this.commentPanel = jQuery(_this.canvas).parents('.mirador-osd').qtip({
          content: {
            text: annoTooltip.getEditor({})
          },
          position: {
            my: 'center',
            at: 'center'
          },
          style: {
            classes: 'qtip-bootstrap'
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
              jQuery.publish('annotationEditorAvailable.' + _this.windowId);
              jQuery.publish('disableTooltips.' + _this.windowId);

              var selector = '#annotation-editor-' + _this.windowId;
              jQuery(selector).parent().parent().draggable();

              tinymce.init({
                selector: selector + ' textarea',
                plugins: "image link media",
                menubar: false,
                statusbar: false,
                toolbar_items_size: 'small',
                toolbar: "bold italic | bullist numlist | link image media | removeformat",
                setup: function(editor) {
                  editor.on('init', function(args) {
                    tinymce.execCommand('mceFocus', false, args.target.id);
                  });
                }
              });

              jQuery(selector).on("submit", function(event) {
                event.preventDefault();
                jQuery(selector + ' a.save').click();
              });

              jQuery(selector + ' a.cancel').on("click", function(event) {
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
                _this.paperScope.view.update(true);
                _this.paperScope.project.activeLayer.selected = false;
                _this.segment = null;
                _this.path = null;
                _this.mode = '';

                //reenable viewer tooltips
                jQuery.publish('enableTooltips.' + _this.windowId);
                _this.commentPanel = null;
              });

              jQuery(selector + ' a.save').on("click", function(event) {
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

                var svg = _this.getSVGString(_this.draftPaths);

                if (tags && tags.length > 0) {
                  motivation.push("oa:tagging");
                  jQuery.each(tags, function(index, value) {
                    resource.push({
                      "@type": "oa:Tag",
                      "chars": value
                    });
                  });
                }
                motivation.push("oa:commenting");
                on = {
                  "@type": "oa:SpecificResource",
                  "source": _this.window.parent.canvasID,
                  "selector": {
                    "@type": "oa:SvgSelector",
                    "value": svg
                  },
                  "scope": {
                    "@context": "http://www.harvard.edu/catch/oa.json",
                    "@type": "catch:Viewport",
                    "value": "xywh=" + Math.round(scope.x) + "," + Math.round(scope.y) + "," + Math.round(scope.width) + "," + Math.round(scope.height) //osd bounds
                  }
                };
                resource.push({
                  "@type": "dctypes:Text",
                  "format": "text/html",
                  "chars": resourceText
                });
                var oaAnno = {
                  "@context": "http://iiif.io/api/presentation/2/context.json",
                  "@type": "oa:Annotation",
                  "motivation": motivation,
                  "resource": resource,
                  "on": on
                };
                //save to endpoint
                jQuery.publish('annotationCreated.' + _this.windowId, [oaAnno, shape]);

                api.destroy();
                //reenable viewer tooltips
                jQuery.publish('enableTooltips.' + _this.windowId);
                _this.commentPanel = null;
                // clear draft data.
                for (var idx = 0; idx < _this.draftPaths.length; idx++) {
                  _this.draftPaths[idx].remove();
                }
                _this.draftPaths = [];
                _this.paperScope.view.update(true);
                _this.paperScope.project.activeLayer.selected = false;
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