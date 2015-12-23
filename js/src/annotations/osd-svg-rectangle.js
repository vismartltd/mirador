(function($) {
  $.Rectangle = function(options) {
    jQuery.extend(this, {
      name: 'Rectangle',
      logoClass: 'fa-square-o',
      idPrefix: 'rectangle_'
    }, options);

    this.init();
  };

  $.Rectangle.prototype = {
    init: function() {},

    createShape: function(initialPoint, overlay) {
      overlay.mode = 'create';
      var _this = this;
      var shape = new Path.Rectangle({
        point: [initialPoint.x - 1, initialPoint.y - 1],
        size: [1, 1]
      });
      shape.strokeColor = overlay.strokeColor;
      shape.fillColor = overlay.fillColor;
      shape.fillColor.alpha = 0.0;
      shape.name = _this.idPrefix + (project.getItems({
        name: /_/
      }).length + 1);
      for (var i = 0; i < shape.segments.length; i++) {
        if (shape.segments[i].point.x == initialPoint.x && shape.segments[i].point.y == initialPoint.y) {
          overlay.segment = shape.segments[i];
        }
      }
      return shape;
    },

    onMouseUp: function(event, overlay) {
      // Empty block.
    },

    onMouseDrag: function(event, overlay) {
      if (overlay.mode == 'translate') {
        for (var i = 0; i < overlay.path.segments.length; i++) {
          overlay.path.segments[i].point.x += event.delta.x;
          overlay.path.segments[i].point.y += event.delta.y;
        }
      } else if (overlay.mode == 'deform' || overlay.mode == 'create') {
        var x = overlay.segment.point.x;
        var y = overlay.segment.point.y;
        for (var k = 0; k < overlay.path.segments.length; k++) {
          if (overlay.path.segments[k].point.x == x) {
            overlay.path.segments[k].point.x += event.delta.x;
          }
          if (overlay.path.segments[k].point.y == y) {
            overlay.path.segments[k].point.y += event.delta.y;
          }
        }
      }
    },

    onMouseMove: function(event, overlay) {
      // Empty block.
    },

    onMouseDown: function(event, overlay) {
      var hitResult = project.hitTest(event.point, overlay.hitOptions);
      if (hitResult && hitResult.item._name.toString().indexOf(this.idPrefix) != -1) {
        if (overlay.mode != 'deform' && overlay.mode != 'translate' && overlay.mode != 'create') {
          if (hitResult.type == 'segment') {
            overlay.mode = 'deform';
            overlay.segment = null;
            overlay.path = null;
            document.body.style.cursor = "move";
          } else {
            overlay.mode = 'translate';
            overlay.segment = null;
            overlay.path = null;
            document.body.style.cursor = "move";
          }
        } else {
          document.body.style.cursor = "default";
        }
      }
      if (overlay.mode == 'translate') {
        if (overlay.path) {
          project.activeLayer.selected = false;
          overlay.segment = null;
          overlay.path = null;
          overlay.mode = '';
        } else {
          overlay.path = hitResult.item;
        }
      } else if (overlay.mode == 'deform') {
        if (overlay.path) {
          project.activeLayer.selected = false;
          overlay.segment = null;
          overlay.path = null;
          overlay.mode = '';
        } else {
          overlay.path = hitResult.item;
          overlay.segment = hitResult.segment;
        }
      } else if (overlay.path) {
        project.activeLayer.selected = false;
        overlay.segment = null;
        overlay.path = null;
        overlay.mode = '';
      } else {
        overlay.path = this.createShape(event.point, overlay);
      }
    },

    onDoubleClick: function(event, overlay) {
      // Empty block.
    }
  };
}(Mirador));