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
        this.svgOverlay = this.osdViewer.svgOverlay(this.parent.windowId);
      }
      this.svgOverlay.show();
      this.svgOverlay.disable();
    },

    reset: function(osdViewer) {
      this.osdViewer = osdViewer;
    },

    enterEditMode: function() {
      this.osdViewer.setMouseNavEnabled(false);
      this.osdViewer.panHorizontal = false;
      this.osdViewer.panVertical = false;
      this.osdViewer.zoomPerClick = 1;
      this.osdViewer.zoomPerScroll = 1;
      this.svgOverlay.enable();
    },

    exitEditMode: function() {
      this.osdViewer.setMouseNavEnabled(true);
      this.osdViewer.panHorizontal = true;
      this.osdViewer.panVertical = true;
      this.osdViewer.zoomPerClick = 2;
      this.osdViewer.zoomPerScroll = 1.2;
      this.svgOverlay.disable();
    }
  };
}(Mirador));