paper.install(window);

describe('Rectangle', function() {

  function getEvent(delta, point) {
    return {
      'delta': delta,
      'point': point
    };
  }

  function getOverlay(paperScope, strokeColor, fillColor, fillColorAlpha, mode, path, segment) {
    return {
      'paperScope': paperScope,
      'strokeColor': strokeColor,
      'fillColor': fillColor,
      'fillColorAlpha': fillColorAlpha,
      'mode': mode,
      'path': path,
      'segment': segment,
      'hitOptions': {
        'fill': true,
        'stroke': true,
        'segments': true,
        'tolerance': 0
      },
      onDrawFinish: function() {
      },
      getName: function(tool) {
        return tool.idPrefix + '1';
      }
    };
  }

  beforeAll(function() {
    this.canvas = jQuery('<canvas></canvas>');
    this.canvas.attr('id', 'paperId');
    jasmine.getFixtures().set(this.canvas);
    paper.setup(this.canvas.attr('id'));
    this.rect = new Mirador.Rectangle();
  });
  afterAll(function() {
    delete this.rect;
  });

  it('should create rectangular shape', function() {
    var initialPoint = {
      'x': 123,
      'y': 456
    };
    var overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, null, null, null);
    var shape = this.rect.createShape(initialPoint, overlay);

    expect(overlay.mode).toBe('create');

    expect(overlay.segment).toBe(shape.segments[4]);

    expect(shape.strokeColor.red).toBe(1);
    expect(shape.strokeColor.green).toBe(0);
    expect(shape.strokeColor.blue).toBe(0);

    expect(shape.fillColor.red).toBe(0);
    expect(shape.fillColor.green).toBe(1);
    expect(shape.fillColor.blue).toBe(0);

    expect(shape.fillColor.alpha).toBe(overlay.fillColorAlpha);

    expect(shape.closed).toBe(true);

    expect(shape.data.rotation).toBe(0);

    expect(shape.fullySelected).toBe(true);

    expect(shape.name).toBe(this.rect.idPrefix + '1');

    expect(shape.segments.length).toBe(8);

    expect(shape.segments[0].point.x).toBe(initialPoint.x - 2);
    expect(shape.segments[0].point.y).toBe(initialPoint.y - 2);

    expect(shape.segments[1].point.x).toBe(initialPoint.x - 1);
    expect(shape.segments[1].point.y).toBe(initialPoint.y - 2);

    expect(shape.segments[2].point.x).toBe(initialPoint.x);
    expect(shape.segments[2].point.y).toBe(initialPoint.y - 2);

    expect(shape.segments[3].point.x).toBe(initialPoint.x);
    expect(shape.segments[3].point.y).toBe(initialPoint.y - 1);

    expect(shape.segments[4].point.x).toBe(initialPoint.x);
    expect(shape.segments[4].point.y).toBe(initialPoint.y);

    expect(shape.segments[5].point.x).toBe(initialPoint.x - 1);
    expect(shape.segments[5].point.y).toBe(initialPoint.y);

    expect(shape.segments[6].point.x).toBe(initialPoint.x - 2);
    expect(shape.segments[6].point.y).toBe(initialPoint.y);

    expect(shape.segments[7].point.x).toBe(initialPoint.x - 2);
    expect(shape.segments[7].point.y).toBe(initialPoint.y - 1);
  });

  describe('Rectangle Mouse Tool', function() {
    var overlay;

    beforeEach(function() {
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', null, null);
      this.rect = new Mirador.Rectangle();
      this.initialPoint = {
        'x': 987,
        'y': 654
      };
      this.shape = this.rect.createShape(this.initialPoint, overlay);
    });

    afterEach(function() {
      delete this.shape;
      delete this.rect;
    });

    it('should do nothing', function() {
      var event = getEvent({
        'x': 100,
        'y': 100
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', null, null);
      var expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.rect.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }
    });

    it('should translate the whole rectangular shape', function() {
      var event = getEvent({
        'x': 3,
        'y': -3
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, 'translate', this.shape, null);
      this.rect.onMouseDrag(event, overlay);

      expect(this.shape.segments[0].point.x - event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[0].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[1].point.x - event.delta.x).toBe(this.initialPoint.x - 1);
      expect(this.shape.segments[1].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[2].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[2].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[3].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[3].point.y - event.delta.y).toBe(this.initialPoint.y - 1);

      expect(this.shape.segments[4].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[4].point.y - event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[5].point.x - event.delta.x).toBe(this.initialPoint.x - 1);
      expect(this.shape.segments[5].point.y - event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[6].point.x - event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[6].point.y - event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[7].point.x - event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[7].point.y - event.delta.y).toBe(this.initialPoint.y - 1);
    });

    it('should resize the whole rectangular shape', function() {
      var event = getEvent({
        'x': 10,
        'y': -100
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, 'deform', this.shape, this.shape.segments[2]);
      this.rect.onMouseDrag(event, overlay);

      expect(this.shape.segments[0].point.x + event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[0].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[1].point.x).toBe(this.initialPoint.x - 1);
      expect(this.shape.segments[1].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[2].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[2].point.y - event.delta.y).toBe(this.initialPoint.y - 2);

      expect(this.shape.segments[3].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[3].point.y).toBe(this.initialPoint.y - 1);

      expect(this.shape.segments[4].point.x - event.delta.x).toBe(this.initialPoint.x);
      expect(this.shape.segments[4].point.y + event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[5].point.x).toBe(this.initialPoint.x - 1);
      expect(this.shape.segments[5].point.y + event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[6].point.x + event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[6].point.y + event.delta.y).toBe(this.initialPoint.y);

      expect(this.shape.segments[7].point.x + event.delta.x).toBe(this.initialPoint.x - 2);
      expect(this.shape.segments[7].point.y).toBe(this.initialPoint.y - 1);
    });

    function rotatePoint(point, initialPoint, angle) {
      var angleRad = angle * Math.PI / 180.0;
      return {
        x: Math.cos(angleRad) * (point.x - initialPoint.x) - Math.sin(angleRad) * (point.y - initialPoint.y) + initialPoint.x,
        y: Math.sin(angleRad) * (point.x - initialPoint.x) + Math.cos(angleRad) * (point.y - initialPoint.y) + initialPoint.y
      };
    }

    function scalePoint(point, initialPoint, scale) {
      return {
        x: scale * (point.x - initialPoint.x) + initialPoint.x,
        y: scale * (point.y - initialPoint.y) + initialPoint.y
      };
    }

    it('should rotate and scale the whole rectangular shape', function() {
      var size = {
        'x': 1,
        'y': 1
      };
      var scale = 2;
      var rotationAngle = -90;
      // -90 degrees rotation + scale
      var event = getEvent({
        'x': -size.x * scale,
        'y': size.y
      });
      var localCenterPoint = {
        'x': this.initialPoint.x - size.x,
        'y': this.initialPoint.y - size.y
      };
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, 'deform', this.shape, this.shape.segments[1]);
      var expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = this.shape.segments[idx].point;
        point = scalePoint(point, localCenterPoint, scale);
        point = rotatePoint(point, localCenterPoint, rotationAngle);
        expected.push(point);
      }
      this.rect.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }
    });

    it('should select rectangular shape', function() {
      var event = getEvent({}, {
        'x': this.initialPoint.x - 1,
        'y': this.initialPoint.y - 1
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', null, null);
      this.rect.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('translate');
      expect(overlay.segment).toBeNull();
      expect(overlay.path).toBe(this.shape);
      expect(document.body.style.cursor).toBe('move');

      this.rect.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('');
      expect(overlay.segment).toBeNull();
      expect(overlay.path).toBeNull();

      event = getEvent({}, {
        'x': this.initialPoint.x,
        'y': this.initialPoint.y
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', null, null);
      this.rect.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('deform');
      expect(overlay.segment).toBe(this.shape.segments[4]);
      expect(overlay.path).toBe(this.shape);
      expect(document.body.style.cursor).toBe('move');

      this.rect.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('');
      expect(overlay.segment).toBeNull();
      expect(overlay.path).toBeNull();

      event = getEvent({}, {
        'x': this.initialPoint.x,
        'y': this.initialPoint.y - 1
      });
      this.rect.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('deform');
      expect(overlay.segment).toBe(this.shape.segments[3]);
      expect(overlay.path).toBe(this.shape);
      expect(document.body.style.cursor).toContain('rotate.png');

      event = getEvent({}, {
        'x': this.initialPoint.x - 1,
        'y': this.initialPoint.y - 1
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, 'translate', null, null);
      this.rect.onMouseDown(event, overlay);

      expect(document.body.style.cursor).toBe('default');

      event = getEvent({}, {
        'x': this.initialPoint.x + 100,
        'y': this.initialPoint.y + 100
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', null, null);
      this.rect.onMouseDown(event, overlay);

      expect(document.body.style.cursor).toBe('default');

      event = getEvent({}, {
        'x': this.initialPoint.x - 100,
        'y': this.initialPoint.y - 100
      });
      overlay = getOverlay(paper, '#ff0000', '#00ff00', 1.0, '', this.shape, null);
      this.rect.onMouseDown(event, overlay);

      expect(document.body.style.cursor).toBe('default');
    });
  });
});