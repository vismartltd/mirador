(function($) {

  $.ContextControls = function(options) {

    jQuery.extend(this, {
      parent: null,  //hud
      element: null,
      container: null,
      mode: null,
      windowId: null,
      annoEndpointAvailable: false,
      annotationCreationAvailable: true
    }, options);

    this.init();
  };

  $.ContextControls.prototype = {

    init: function() {    
      var allTools = $.getTools();
      this.availableTools = [];
      for ( var i = 0; i < $.viewer.availableAnnotationDrawingTools.length; i++) {
        for ( var j = 0; j < allTools.length; j++) {
          if ($.viewer.availableAnnotationDrawingTools[i] == allTools[j].name) {
            this.availableTools.push(allTools[j].logoClass);
          }
        }
      }
      var _this = this;
      this.element = jQuery(this.template({
        tools : _this.availableTools,
        showEdit : this.annotationCreationAvailable
      })).appendTo(this.container);
      _this.container.find(".borderColorPicker").spectrum({
        showInput: true,
        showInitial: true,
        showPalette: true,
        showSelectionPalette: true,
        preferredFormat: "rgb",
        change: function(color) {
          jQuery.publish('changeBorderColor.'+_this.windowId, color.toHexString());
        },
        palette: [
          ["black", "red", "green", "blue"],
          ["white", "cyan", "magenta", "yellow"]
        ]
      });
      _this.container.find(".fillColorPicker").spectrum({
        showInput: true,
        showInitial: true,
        showAlpha: true,
        showPalette: true,
        showSelectionPalette: true,
        preferredFormat: "rgb",
        change: function(color) {
          jQuery.publish('changeFillColor.'+_this.windowId, [color.toHexString(), color.getAlpha()]);
        },
        palette: [
          ["black", "red", "green", "blue"],
          ["white", "cyan", "magenta", "yellow"]
        ]
      });
      this.hide();
      this.bindEvents();
    },

    show: function() {
      this.element.fadeIn("200");
    },

    hide: function(complete) {
      this.element.fadeOut("200", complete);
    },

    bindEvents: function() {
      var _this = this;

      this.container.find('.fa-times').on('click', function() {
        jQuery.publish('toggleDrawingTool.'+_this.windowId, 'default');
      });
      this.container.find('.fa-edit').on('click', function() {
        jQuery.publish('toggleDrawingTool.'+_this.windowId, '');
      });

      function make_handler(shapeMode) {
        return function () {
          jQuery.publish('toggleDrawingTool.'+_this.windowId, shapeMode);
        };
      }
      for (var value in _this.availableTools) {
        this.container.find('.' + _this.availableTools[value]).on('click', make_handler(_this.availableTools[value]));
      }

      jQuery.subscribe('initBorderColor.' + _this.windowId, function(event, color) {
        _this.container.find('.borderColorPicker').spectrum('set', color);
      });
      jQuery.subscribe('initFillColor.' + _this.windowId, function(event, color, alpha) {
        _this.container.find('.fillColorPicker').spectrum('set', jQuery.extend(tinycolor(color), {'a': alpha}));
      });
      jQuery.subscribe('disableBorderColorPicker.'+_this.windowId, function(event, disablePicker) {
        if(disablePicker) {
          _this.container.find('.borderColorPicker').spectrum("disable");
        }else{
          _this.container.find('.borderColorPicker').spectrum("enable");
        }
      });
      jQuery.subscribe('disableFillColorPicker.'+_this.windowId, function(event, disablePicker) {
        if(disablePicker) {
          _this.container.find('.fillColorPicker').spectrum("disable");
        }else{
          _this.container.find('.fillColorPicker').spectrum("enable");
        }
      });
      jQuery.subscribe('showDrawTools.'+_this.windowId, function(event) {
        _this.container.find('.draw-tool').show();
      });
      jQuery.subscribe('hideDrawTools.'+_this.windowId, function(event) {
        _this.container.find('.draw-tool').hide();
      });

      this.container.find('.mirador-osd-close').on('click', function() {
        _this.parent.annoState.displayOff();
      });
      
      this.container.find('.mirador-osd-back').on('click', function() {
        _this.element.remove();
        _this.element = jQuery(_this.template()).appendTo(_this.container);
        _this.bindEvents();
      });
      
      this.container.find('.mirador-osd-edit-mode').on('click', function() {
        if (_this.parent.annoState.current === 'annoOnCreateOff') {
          _this.parent.annoState.createOn();
        } else if (_this.parent.annoState.current === 'annoOnCreateOn') {
          _this.parent.annoState.createOff();
        }
      });
      this.container.find('.mirador-osd-refresh-mode').on('click', function() {
        //update annotation list from endpoint
        jQuery.publish('updateAnnotationList.'+_this.windowId);
      });
      
    },

    template: Handlebars.compile([
                                 '<div class="mirador-osd-context-controls hud-container">',
                                   '<a class="mirador-osd-close hud-control">',
                                   '<i class="fa fa-lg fa-times"></i>',
                                   '</a>',
                                   '{{#if showEdit}}',
                                   '<a class="mirador-osd-edit-mode hud-control">',
                                   '<i class="fa fa-lg fa-edit"></i>',
                                   '</a>',
                                   '<a class="mirador-osd-edit-mode hud-control draw-tool" style="color:#abcdef;">',
                                   '|',
                                   '</a>',
                                   '{{#each tools}}',
                                   '<a class="mirador-osd-{{this}}-mode hud-control draw-tool">',
                                   '<i class="fa fa-lg {{this}}"></i>',
                                   '</a>',
                                   '{{/each}}',
                                   '<a class="mirador-osd-edit-mode hud-control draw-tool" style="color:#abcdef;">',
                                   '|',
                                   '</a>',
                                   '<a class="mirador-osd-edit-mode hud-control draw-tool">',
                                   '<input type="text" class="borderColorPicker"/>',
                                   '</a>',
                                   '<a class="mirador-osd-edit-mode hud-control draw-tool">',
                                   '<input type="text" class="fillColorPicker"/>',
                                   '</a>',
                                   '{{/if}}',
                                   /*'<a class="mirador-osd-list hud-control">',
                                   '<i class="fa fa-lg fa-list"></i>',
                                   '</a>',*/
                                   /*'<a class="mirador-osd-search hud-control">',
                                   '<i class="fa fa-lg fa-search"></i>',
                                   '</a>',*/
                                   /*'<a class="mirador-osd-rect-tool hud-control">',
                                   '<i class="fa fa-lg fa-gear"></i>',
                                   '</a>',*/
                                 '</div>'
    ].join('')),

    editorTemplate: Handlebars.compile([
                                 '<div class="mirador-osd-context-controls hud-container">',
                                   '<a class="mirador-osd-back hud-control">',
                                   '<i class="fa fa-lg fa-arrow-left"></i>',
                                   '</a>',
                                   '<a class="mirador-osd-rect-tool hud-control">',
                                   '<i class="fa fa-lg fa-pencil-square"></i>',
                                   '</a>',
                                   '<a class="mirador-osd-rect-tool hud-control">',
                                   '<i class="fa fa-lg fa-ellipsis-h"></i>',
                                   '</a>',
                                   '<a class="mirador-osd-rect-tool hud-control">',
                                   '<i class="fa fa-lg fa-gear"></i>',
                                   '</a>',
                                 '</div>'
    ].join(''))
  };
}(Mirador));
