(function($) {
  $.Pin = function(options) {
    jQuery.extend(this, {
      logoClass: 'fa-map-marker',
      idPrefix: 'pin_'
    }, options);

    this.init();
  };

  $.Pin.prototype = {
    init: function() {},

    createShape: function(initialPoint, overlay) {
      overlay.mode = 'create';
      var _this = this;
      var pathData = '';
      pathData += 'M' + initialPoint.x + ',' + initialPoint.y;
      pathData += ' Q' + initialPoint.x + ',' + (initialPoint.y - 5);
      pathData += ' ' + (initialPoint.x + 5) + ',' + (initialPoint.y - 10);
      pathData += ' A5,5 0 1 0';
      pathData += ' ' + (initialPoint.x - 5) + ',' + (initialPoint.y - 10);
      pathData += ' Q' + initialPoint.x + ',' + (initialPoint.y - 5);
      pathData += ' ' + initialPoint.x + ',' + initialPoint.y;
      var shape = new Path(pathData);
      shape.name = _this.idPrefix + (project.getItems({
        name: /_/
      }).length + 1);
      shape.strokeColor = overlay.strokeColor;
      shape.fillColor = overlay.fillColor;
      shape.fullySelected = true;
      shape.closed = true;
      return shape;
    },

    onMouseUp: function(event, overlay) {
      // Empty block.
    },

    onMouseDrag: function(event, overlay) {
      if (overlay.mode === 'translate') {
        if (overlay.path) {
          overlay.path.position.x += event.delta.x;
          overlay.path.position.y += event.delta.y;
        }
      }
    },

    onMouseMove: function(event, overlay) {
      // Empty block.
    },

    onMouseDown: function(event, overlay) {
      var hitResult = project.hitTest(event.point, overlay.hitOptions);
      if (hitResult && hitResult.item._name.toString().indexOf(this.idPrefix) != -1) {
        if (!overlay.path) {
          overlay.mode = 'translate';
          overlay.segment = null;
          overlay.path = null;
          document.body.style.cursor = "move";
        } else {
          document.body.style.cursor = "default";
        }
      } else {
        document.body.style.cursor = "default";
      }
      if (overlay.mode === '') {
        overlay.path = this.createShape(event.point, overlay);
        project.activeLayer.selected = false;
        overlay.segment = null;
        overlay.path = null;
        overlay.mode = '';
      } else if (overlay.mode === 'translate') {
        if (hitResult) {
          if (overlay.path) {
            project.activeLayer.selected = false;
            overlay.segment = null;
            overlay.path = null;
            overlay.mode = '';
          } else {
            overlay.path = hitResult.item;
          }
        }
      }
    },

    onDoubleClick: function(event, overlay) {
      // Empty block.
    }
  };
}(Mirador));