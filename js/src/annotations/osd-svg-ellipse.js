(function($) {
  $.Ellipse = function(options) {
    jQuery.extend(this, {
      name: 'Ellipse',
      logoClass: 'fa-circle-o',
      idPrefix: 'circle_'
    }, options);

    this.init();
  };

  $.Ellipse.prototype = {
    init: function() {},

    createShape: function(initialPoint, overlay) {
      overlay.mode = 'create';
      var segments = [];
      // point indexes
      //       1      
      //   0   ─   2  
      //     /   \    
      //  7 |     | 3 
      //     \   /    
      //   6   ─   4  
      //       5      
      segments.push(new Point(initialPoint.x - 2, initialPoint.y - 2));
      segments.push(new Point(initialPoint.x - 1, initialPoint.y - Math.sqrt(2) - 1));
      segments.push(new Point(initialPoint.x, initialPoint.y - 2));
      segments.push(new Point(initialPoint.x + Math.sqrt(2) - 1, initialPoint.y - 1));
      segments.push(new Point(initialPoint.x, initialPoint.y));
      segments.push(new Point(initialPoint.x - 1, initialPoint.y + Math.sqrt(2) - 1));
      segments.push(new Point(initialPoint.x - 2, initialPoint.y));
      segments.push(new Point(initialPoint.x - Math.sqrt(2) - 1, initialPoint.y - 1));
      var _this = this;
      var shape = new Path({
        segments: segments,
        fullySelected: true,
        name: _this.idPrefix + (project.getItems({
          name: /_/
        }).length + 1)
      });
      shape.strokeColor = overlay.strokeColor;
      shape.fillColor = overlay.fillColor;
      shape.fillColor.alpha = overlay.fillColorAlpha;
      shape.closed = true;
      shape.smooth();
      shape.data.rotation = 0;
      overlay.segment = shape.segments[4];
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
      } else if (overlay.mode == 'create' || overlay.mode == 'deform') {
        var idx = -1;
        for (var l = 0; l < overlay.path.segments.length; l++) {
          if (overlay.path.segments[l] == overlay.segment) {
            idx = l;
            break;
          }
        }
        if (overlay.mode == 'deform' && idx % 2 == 1) {
          var oldPoint = new Point(overlay.segment.point.x - overlay.path.position.x, overlay.segment.point.y - overlay.path.position.y);
          var newPoint = new Point(overlay.segment.point.x - overlay.path.position.x + event.delta.x, overlay.segment.point.y - overlay.path.position.y + event.delta.y);
          var scale = Math.sqrt(newPoint.x * newPoint.x + newPoint.y * newPoint.y) / Math.sqrt(oldPoint.x * oldPoint.x + oldPoint.y * oldPoint.y);
          var rotation = Math.atan2(newPoint.y, newPoint.x) - Math.atan2(oldPoint.y, oldPoint.x);
          rotation = rotation * (180 / Math.PI);
          overlay.path.scale(scale);
          overlay.path.rotate(rotation, overlay.path.position);
          overlay.path.data.rotation += rotation;
        } else {
          var oldRotPoint = new Point(overlay.segment.point.x - overlay.path.position.x, overlay.segment.point.y - overlay.path.position.y);
          var newRotPoint = new Point(overlay.segment.point.x - overlay.path.position.x + event.delta.x, overlay.segment.point.y - overlay.path.position.y + event.delta.y);
          var rot = overlay.path.data.rotation;
          oldRotPoint = oldRotPoint.rotate(-rot);
          newRotPoint = newRotPoint.rotate(-rot);
          var rotScale = new Point(newRotPoint.x / oldRotPoint.x, newRotPoint.y / oldRotPoint.y);
          overlay.path.rotate(-rot, overlay.path.position);
          overlay.path.scale(rotScale);
          overlay.path.rotate(rot, overlay.path.position);
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
            var segments = hitResult.item.segments;
            for (var idx = 0; idx < segments.length; idx++) {
              if (segments[idx] == hitResult.segment) {
                if (idx % 2 === 0) {
                  document.body.style.cursor = "move";
                } else {
                  document.body.style.cursor = "url('../images/rotate.png') 12 12, auto";
                }
              }
            }
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
        overlay.onDrawFinish();
      } else {
        overlay.path = this.createShape(event.point, overlay);
      }
    },

    onDoubleClick: function(event, overlay) {
      // Empty block.
    }
  };
}(Mirador));