(function($) {
  $.OsdRegionDrawTool = function(options) {
    jQuery.extend(this, {
      osdViewer: null,
      parent: null
    }, options);

    this.init();
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
      this.svgOverlay.enable();
    },

    exitEditMode: function() {
      this.osdViewer.setMouseNavEnabled(true);
      this.svgOverlay.disable();
    },

    hideAnnotations: function() {
      this.svgOverlay.hide();
    },

    showAnnotations: function() {
      this.svgOverlay.show();
    }
  };
}(Mirador));