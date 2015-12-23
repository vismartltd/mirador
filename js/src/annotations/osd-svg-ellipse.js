(function($) {
  $.Ellipse = function(options) {
    jQuery.extend(this, {
      name: 'Ellipse',
      logoClass: 'fa-circle-o',
      idPrefix: 'circle_',
      ellipseSegments: []
    }, options);

    this.init();
  };

  $.Ellipse.prototype = {
    init: function() {},

    createShape: function(initialPoint, overlay) {
      overlay.mode = 'create';
      var _this = this;
      var shape = new Path.Ellipse({
        center: [initialPoint.x - 1, initialPoint.y - 1],
        radius: [1, 1]
      });
      shape.strokeColor = overlay.strokeColor;
      shape.fillColor = overlay.fillColor;
      shape.fillColor.alpha = overlay.fillColorAlpha;
      shape.name = _this.idPrefix + (project.getItems({
        name: /_/
      }).length + 1);
      for (var j = 0; j < shape.segments.length; j++) {
        if (shape.segments[j].point.x == initialPoint.x) {
          _this.ellipseSegments[0] = shape.segments[j];
        }
        if (shape.segments[j].point.y == initialPoint.y) {
          _this.ellipseSegments[1] = shape.segments[j];
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
      } else if (overlay.mode == 'deform') {
        var centerX = 0;
        var centerY = 0;
        var currIndex = -1;
        for (var j = 0; j < overlay.path.segments.length; j++) {
          centerX += overlay.path.segments[j].point.x;
          centerY += overlay.path.segments[j].point.y;
          if (overlay.path.segments[j].point.x == overlay.segment.point.x && overlay.path.segments[j].point.y == overlay.segment.point.y) {
            currIndex = j;
          }
        }
        centerX /= overlay.path.segments.length;
        centerY /= overlay.path.segments.length;
        var oldPoint = new Point(overlay.segment.point.x - centerX, overlay.segment.point.y - centerY);
        var newPoint = new Point(overlay.segment.point.x - centerX + event.delta.x, overlay.segment.point.y - centerY + event.delta.y);
        var scale = Math.sqrt(newPoint.x * newPoint.x + newPoint.y * newPoint.y) / Math.sqrt(oldPoint.x * oldPoint.x + oldPoint.y * oldPoint.y);
        var rotation = Math.atan2(newPoint.y, newPoint.x) - Math.atan2(oldPoint.y, oldPoint.x);
        rotation = rotation * (180 / Math.PI);
        overlay.path.scale(scale);
        overlay.path.rotate(rotation, new Point(centerX, centerY));
      } else if (overlay.path) {
        var cX = 0;
        var cY = 0;
        for (var l = 0; l < overlay.path.segments.length; l++) {
          cX += overlay.path.segments[l].point.x;
          cY += overlay.path.segments[l].point.y;
        }
        cX /= overlay.path.segments.length;
        cY /= overlay.path.segments.length;
        var scaleX = 1;
        for (var m = 0; m < overlay.path.segments.length; m++) {
          if (overlay.path.segments[m].point.x == this.ellipseSegments[0].point.x) {
            scaleX = (overlay.path.segments[m].point.x - cX + event.delta.x) / (overlay.path.segments[m].point.x - cX);
          }
          if (overlay.path.segments[m].point.y == this.ellipseSegments[1].point.y) {
            scaleY = (overlay.path.segments[m].point.y - cY + event.delta.y) / (overlay.path.segments[m].point.y - cY);
          }
        }
        overlay.path.scale([scaleX, scaleY]);
      }
    },

    onMouseMove: function(event, overlay) {
      // Empty block.
    },

    onMouseDown: function(event, overlay) {
      var hitResult = project.hitTest(event.point, overlay.hitOptions);
      if (hitResult && hitResult.item._name.toString().indexOf(this.idPrefix) != -1) {
        if (overlay.mode != 'deform' && overlay.mode != 'translate') {
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
      } else {
        overlay.path = this.createShape(event.point, overlay);
      }
    },

    onDoubleClick: function(event, overlay) {
      // Empty block.
    }
  };
}(Mirador));