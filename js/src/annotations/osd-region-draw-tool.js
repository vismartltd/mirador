(function($) {
  $.OsdRegionDrawTool = function(options) {
    jQuery.extend(this, {
      osdViewer: null,
      parent: null,
      osd: null,
      list: null,
      annotationsToShapesMap: {},
      inEditOrCreateMode: false
    }, options);

    this.init();
    this.bindEvents();
  };

  $.OsdRegionDrawTool.prototype = {

    init: function() {
      this.svgOverlay = this.osdViewer.svgOverlay(this.parent);
      this.svgOverlay.show();
      this.svgOverlay.disable();
    },

    enterEditMode: function() {
      this.osdViewer.setMouseNavEnabled(false);
      this.svgOverlay.show();
      this.svgOverlay.enable();
    },

    exitEditMode: function(showAnnotations) {
      this.osdViewer.setMouseNavEnabled(true);
      this.svgOverlay.disable();
      if (showAnnotations) {
        this.svgOverlay.show();
      } else {
        this.svgOverlay.hide();
      }
    },

    // replaces paper.js objects with the required properties only.
    replaceShape: function(shape, annotation) {
      var cloned = new this.svgOverlay.paperScope.Path({
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
      cloned.data.rotation = 0;
      cloned.data.annotation = annotation;
      if (cloned.name.toString().indexOf('pin_') != -1) { // pin shapes with fixed size.
        cloned.scale(1 / this.svgOverlay.paperScope.view.zoom);
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
      var svgTag = this.svgOverlay.paperScope.project.importSVG(svg);
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
      this.svgOverlay.paperScope.view.update(true);
      return paperItems;
    },

    render: function() {
      this.svgOverlay.paperScope.project.clear();
      var _this = this;
      _this.annotationsToShapesMap = {};
      var deferreds = jQuery.map(this.list, function(annotation) {
        var deferred = jQuery.Deferred();
        if (typeof annotation.on === 'object') {
          _this.annotationsToShapesMap[$.genUUID()] = _this.parseSVG(annotation.on.selector.value, annotation);
        }
        return deferred;
      });
      jQuery.when.apply(jQuery, deferreds).done(function() {
        jQuery.publish('overlaysRendered.' + _this.parent.windowId);
      });

      this.tooltips = jQuery(this.osdViewer.element).qtip({
        overwrite: false,
        content: {
          text: ''
        },
        position: {
          target: 'mouse',
          my: 'center',
          at: 'center',
          adjust: {
            mouse: false,
            method: 'shift'
          },
          container: _this.parent.parent.parent.element,
          viewport: _this.parent.parent.parent.element
        },
        style: {
          classes: 'qtip-bootstrap qtip-viewer'
        },
        show: {
          event: false
        },
        hide: {
          fixed: true,
          delay: 300,
          event: false
        }
      });
      var api = jQuery(this.osdViewer.element).qtip('api');
      api.cache.annotations = [];
      api.cache.hidden = true;
    },

    setTooltipContent: function(api, annotations) {
      var _this = this;
      var annoTooltip = new $.AnnotationTooltip({"windowId": _this.parent.windowId});
      api.set({'content.text': annoTooltip.getViewer(annotations)});
      jQuery.publish('tooltipViewerSet.' + _this.parent.windowId);
    },

    showTooltipsFromMousePosition: function(event, location, absoluteLocation) {
      var _this = this;
      var annotations = [];
      for (var key in _this.annotationsToShapesMap) {
        if (_this.annotationsToShapesMap.hasOwnProperty(key)) {
          var shapeArray = _this.annotationsToShapesMap[key];
          for (var idx = 0; idx < shapeArray.length; idx++) {
            if (shapeArray[idx].contains(location)) {
              annotations.push(shapeArray[idx].data.annotation);
              break;
            }
          }
        }
      }
      var api = jQuery(this.osdViewer.element).qtip('api');
      if (api) {
        if (annotations.length === 0) {
          var cursorWithinTooltip = true;
          if (api.elements.tooltip) {
            var leftSide = api.elements.tooltip.offset().left;
            var rightSide = api.elements.tooltip.offset().left + api.elements.tooltip.width();
            if (absoluteLocation.x < leftSide || rightSide < absoluteLocation.x) {
              cursorWithinTooltip = false;
            }
            var topSide = api.elements.tooltip.offset().top;
            var bottomSide = api.elements.tooltip.offset().top + api.elements.tooltip.height();
            if (absoluteLocation.y < topSide || bottomSide < absoluteLocation.y) {
              cursorWithinTooltip = false;
            }
          }
          if (!api.cache.hidden && !cursorWithinTooltip) {
            api.disable(false);
            api.hide(event);
            api.cache.annotations = [];
            api.cache.hidden = true;
            api.disable(true);
          }
        } else {
          var oldAnnotations = api.cache.annotations;
          var isTheSame = oldAnnotations.length == annotations.length;
          if (isTheSame) {
            for (var i = 0; i < annotations.length; i++) {
              if (oldAnnotations[i] != annotations[i]) {
                isTheSame = false;
                break;
              }
            }
          }
          if (api.cache.hidden || !isTheSame) {
            api.disable(false);
            this.setTooltipContent(api, annotations);
            api.cache.origin = event;
            api.reposition(event, true);
            api.show(event);
            api.cache.annotations = annotations;
            api.cache.hidden = false;
            api.disable(true);
          }
        }
      }
    },

    bindEvents: function() {
      var _this = this;

      jQuery.subscribe('updateTooltips.' + _this.parent.windowId, function(event, location, absoluteLocation) {
        if (!_this.inEditOrCreateMode) {
          _this.showTooltipsFromMousePosition(event, location, absoluteLocation);
        }
      });

      this.osdViewer.addHandler('zoom', $.debounce(function() {
        jQuery('.qtip-viewer').qtip('hide');
      }, 200, true));

      jQuery.subscribe('removeTooltips.' + _this.parent.windowId, function() {
        jQuery(_this.osdViewer.canvas).find('.annotation').qtip('destroy', true);
      });

      jQuery.subscribe('disableTooltips.' + _this.parent.windowId, function() {
        _this.inEditOrCreateMode = true;
      });

      jQuery.subscribe('enableTooltips.' + _this.parent.windowId, function() {
        _this.inEditOrCreateMode = false;
      });
    }
  };
}(Mirador));