(function($) {
  $.OsdRegionDrawTool = function(options) {
    jQuery.extend(this, {
      osdViewer: null,
      parent: null,
      osd:       null,
      elements:  null,
      list:      null,
      annoTooltips: {},
      tooltips:  null,
      overlays:  [],
      inEditOrCreateMode:   false
    }, options);

    this.init();
    this.bindEvents();
  };

  $.OsdRegionDrawTool.prototype = {

    init: function() {
      if (!this.svgOverlay) {
        this.svgOverlay = this.osdViewer.svgOverlay(this.parent);
      }
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
    replaceShape: function(shape) {
      var cloned = new Path({
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
      if (cloned.name.toString().indexOf('pin_') != -1) { // pin shapes with fixed size.
        cloned.scale(1 / paper.view.zoom);
      }
      shape.remove();
    },

    parseSVG: function(svg) {
      var svgParser = new DOMParser();
      var svgDOM = svgParser.parseFromString(svg, "text/xml");
      if (svgDOM.documentElement.nodeName == "parsererror") {
        return; // if svg is not valid XML structure - backward compatibility.
      }
      var svgTag = project.importSVG(svg);
      // removes SVG tag which is the root object of comment SVG segment.
      var body = svgTag.removeChildren()[0];
      svgTag.remove();
      if (body.className == 'Group') {
        // removes group tag which wraps the set of objects of comment SVG segment.
        var items = body.removeChildren();
        for (var itemIdx = 0; itemIdx < items.length; itemIdx++) {
          this.replaceShape(items[itemIdx]);
        }
        body.remove();
      } else {
        this.replaceShape(body);
      }
      paper.view.update(true);
    },

    getOsdFrame: function(url) {
      var regionString;
      if (typeof url === 'object') {
        regionString = url.selector.value;
      } else {
        regionString = url.split('#')[1];
      }
      var region = [-1000, -1000, 0, 0];
      this.parseSVG(regionString);
      return this.osdViewer.viewport.imageToViewportRectangle(region[0],region[1],region[2],region[3]);
    },

    render: function() {
      var _this = this;
      this.overlays = [];

      project.clear();

      var deferreds = jQuery.map(this.list, function(annotation) {
        var deferred = jQuery.Deferred(),
        osdOverlay = document.createElement('div');
        osdOverlay.className = 'annotation';
        osdOverlay.id = annotation['@id'];
        _this.osdViewer.addHandler("add-overlay", function() {
          deferred.resolve();
        });
        _this.osdViewer.addOverlay({
          element: osdOverlay,
          location: _this.getOsdFrame(annotation.on)
        });
        _this.overlays.push(jQuery(osdOverlay));
        return deferred;
      });
      //this still doesn't take into account the actual appending of the overlays to the DOM
      //so not quite there yet
      jQuery.when.apply(jQuery, deferreds).done(function() {
        jQuery.publish('overlaysRendered.' + _this.parent.windowId);        
      });

      this.tooltips = jQuery(this.osdViewer.element).qtip({
            overwrite : false,
            content: {
             text : ''
             },
             position : {
              target : 'mouse',
              my: 'bottom left',
              at: 'top right',
              adjust : {
                mouse: false,
                method: 'shift'
              },
              container: _this.parent.parent.parent.element, //window's element
              viewport: _this.parent.parent.parent.element //window's element
             },
             style : {
              classes : 'qtip-bootstrap qtip-viewer'
             },
             show: {
              delay: 20,
              event: false
             },
             hide: {
                fixed: true,
                delay: 50,
                event: false
             },
             events: {
               show: function(event, api) {
                 _this.setTooltipContent(event, api);               
               },
               visible: function(event, api) {
                 _this.removeAnnotationEvents(event, api);
                 _this.annotationEvents(event, api);
              },
               move: function(event, api) {
                 _this.removeAnnotationEvents(event, api);
                 _this.annotationEvents(event, api);
                 _this.annotationSaveEvent(event, api);
               },
               hidden: function(event, api) {
                 if (jQuery('.qtip:visible').length === 0) {
                  jQuery(_this.osdViewer.canvas).find('.annotation').removeClass('hovered');//.css('border-color', 'deepSkyBlue');
                 }
               }
             }
      });
    },

    setTooltipContent: function(event, api) {
      var overlays = this.getOverlaysFromElement(jQuery(event.originalEvent.currentTarget), event.originalEvent),
      _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}), //pass permissions
      annotations = [];

      jQuery.each(overlays, function(index, overlay) {
       annotations.push(_this.getAnnoFromRegion(overlay.id)[0]);
     });
      api.set({'content.text' : annoTooltip.getViewer(annotations)});
      jQuery.publish('tooltipViewerSet.'+_this.parent.windowId);
    },

    getAnnoFromRegion: function(regionId) {
      return this.list.filter(function(annotation) {
        return annotation['@id'] === regionId;
      });
    },

    showTooltipsFromMousePosition: function(event) {
      var overlays = this.getOverlaysFromMousePosition(event);
      var api = jQuery(this.osdViewer.element).qtip('api');
      if (api) {
        if (overlays.length === 0) {
          api.hide(event);
        } else if (api.elements.tooltip && api.elements.tooltip.is(':visible')) {
          this.setTooltipContent(event, api);
          api.cache.origin = event;
          api.reposition(event, true);
        } else {
          api.show(event);
        }
      }
    },

    getOverlaysFromMousePosition: function(event) {
      var position = OpenSeadragon.getMousePosition(event);
      var _this = this,
      overlays = jQuery(_this.osdViewer.canvas).find('.annotation').map(function() {
        var self = jQuery(this),
        offset = self.offset(),
        l = offset.left,
        t = offset.top,
        h = self.height(),
        w = self.width(),
        x = position.x,
        y = position.y,
        maxx = l+w,
        maxy = t+h;
        return (y <= maxy && y >= t) && (x <= maxx && x >= l) ? this : null;
      });
      return overlays;
    },
    getOverlaysFromElement: function(element, event) {
      var _this = this,
      overlays = this.getOverlaysFromMousePosition(event);
      jQuery(_this.osdViewer.canvas).find('.annotation.hovered').removeClass('hovered');
      overlays.addClass('hovered');
      return overlays;
    },

    bindEvents: function() {
      var _this = this;

      jQuery(this.osdViewer.canvas).parent().on('mousemove', $.throttle(function(event) { 
        if (!_this.inEditOrCreateMode) {
          _this.showTooltipsFromMousePosition(event);
        }
       }, 200, true));

     this.osdViewer.addHandler('zoom', $.debounce(function(){
          _this.hideVisibleTooltips();
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

      jQuery.subscribe('removeOverlay.' + _this.parent.windowId, function(event, annoId) {
        _this.osdViewer.removeOverlay(jQuery(_this.osdViewer.element).find(".annotation#"+annoId)[0]);
      });

    },

    hideVisibleTooltips: function() {
      jQuery('.qtip-viewer').qtip('hide');
    },

    //change content of this tooltip, and disable hiding it, until user clicks save or cancel
    //disable all other qtips until editing this is done
    freezeQtip: function(api, oaAnno, annoTooltip) {
      this.inEditOrCreateMode = true;
      jQuery.publish('disableRectTool.'+this.parent.windowId);
        api.set({'content.text' : annoTooltip.getEditor(oaAnno),
        'hide.event' : false});
        jQuery.publish('annotationEditorAvailable.'+this.parent.windowId);
        //add rich text editor
        tinymce.init({
                  selector : 'form.annotation-tooltip textarea',
                  plugins: "image link media",
                  menubar: false,
                  statusbar: false,
                  toolbar_items_size: 'small',
                  toolbar: "bold italic | bullist numlist | link image media | removeformat",
                  setup : function(editor) {
                    editor.on('init', function(args) {
                      tinymce.execCommand('mceFocus', false, args.target.id); //make sure tinymce focuses on the editor after initialization                    
                    });
                  }
                });
        jQuery(api.elements.tooltip).removeClass("qtip-viewer"); //so it is not affected by zoom event raised in OSD
        this.osdViewer.zoomPerClick = 1;
        this.osdViewer.zoomPerScroll = 1;
    },
    
    //reenable all other qtips
    //update content of this qtip to make it a viewer, not editor
    //and reset hide event       
    unFreezeQtip: function(api, oaAnno, annoTooltip) {
      this.inEditOrCreateMode = false;
      jQuery.publish('enableRectTool.'+this.parent.windowId);
      api.set({'content.text' : annoTooltip.getViewer([oaAnno]),
          'hide.event' : 'mouseleave'}).hide();
      jQuery(api.elements.tooltip).addClass("qtip-viewer"); //re-add class so it is affected by zoom event raised in OSD
      this.osdViewer.zoomPerClick = 2;
      this.osdViewer.zoomPerScroll = 1.2;
    },
    
    removeAnnotationEvents: function(tooltipevent, api) {
      var _this = this,
      editorSelector = '#annotation-editor-'+_this.parent.windowId,
      viewerSelector = '#annotation-viewer-'+_this.parent.windowId;
      jQuery(viewerSelector+' a.delete').off("click");
      jQuery(viewerSelector+' a.edit').off("click");
      jQuery(editorSelector+' a.save').off("click");
      jQuery(editorSelector+' a.cancel').off("click");
    },

    annotationEvents: function(tooltipevent, api) {
      var _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}),
      selector = '#annotation-viewer-'+_this.parent.windowId;
      jQuery(selector+' a.delete').on("click", function(event) {
        event.preventDefault();
        
        if (!window.confirm("Do you want to delete this annotation?")) { 
          return false;
        }

        var display = jQuery(this).parents('.annotation-display'),
        id = display.attr('data-anno-id');
        jQuery.publish('annotationDeleted.'+_this.parent.windowId, [id]);
        
        api.hide();
        display.remove();
      });

      jQuery(selector+' a.edit').on("click", function(event) {
        event.preventDefault();
        
        var display = jQuery(this).parents('.annotation-display'),
        id = display.attr('data-anno-id'),
        oaAnno = _this.getAnnoFromRegion(id)[0];
       
        _this.freezeQtip(api, oaAnno, annoTooltip);
      });
    },
    
    annotationSaveEvent: function(event, api) {
      var _this = this,
      annoTooltip = new $.AnnotationTooltip({"windowId" : _this.parent.windowId}),
      selector = '#annotation-editor-'+_this.parent.windowId;
      
      jQuery(selector).on("submit", function(event) {
        event.preventDefault();
        jQuery(selector+' a.save').click();
      });

      jQuery(selector+' a.save').on("click", function(event) {
        event.preventDefault();
                  
        var display = jQuery(this).parents('.annotation-tooltip'),
        id = display.attr('data-anno-id'),
        oaAnno = _this.getAnnoFromRegion(id)[0];

        var tagText = jQuery(this).parents('.annotation-editor').find('.tags-editor').val(),
        resourceText = tinymce.activeEditor.getContent(),
        tags = [];
        tagText = $.trimString(tagText);
        if (tagText) {
            tags = tagText.split(/\s+/);
        }

        var bounds = _this.osdViewer.viewport.getBounds(true);
        var scope = _this.osdViewer.viewport.viewportToImageRectangle(bounds);
        //bounds is giving negative values?
        //update scope
        oaAnno.on.scope.value = "xywh="+Math.round(scope.x)+","+Math.round(scope.y)+","+Math.round(scope.width)+","+Math.round(scope.height); //osd bounds
                  
        var motivation = [],
        resource = [];
                  
        //remove all tag-related content in annotation
        oaAnno.motivation = jQuery.grep(oaAnno.motivation, function(value) {
            return value !== "oa:tagging";
        });
        oaAnno.resource = jQuery.grep(oaAnno.resource, function(value) {
            return value["@type"] !== "oa:Tag";
        });
        //re-add tagging if we have them
        if (tags.length > 0) {
            oaAnno.motivation.push("oa:tagging");
            jQuery.each(tags, function(index, value) {
                oaAnno.resource.push({      
                    "@type":"oa:Tag",
                     "chars":value
                });
            });
        }
        jQuery.each(oaAnno.resource, function(index, value) {
            if (value["@type"] === "dctypes:Text") {
                value.chars = resourceText;
            }
        });
        //save to endpoint
        jQuery.publish('annotationUpdated.'+_this.parent.windowId, [oaAnno]);

        _this.unFreezeQtip(api, oaAnno, annoTooltip);
        });
        
        jQuery(selector+' a.cancel').on("click", function(event) {
          event.preventDefault();
          var display = jQuery(this).parents('.annotation-tooltip'),
          id = display.attr('data-anno-id'),
          oaAnno = _this.getAnnoFromRegion(id)[0];
   
        _this.unFreezeQtip(api, oaAnno, annoTooltip);
        });

    }
  };
}(Mirador));