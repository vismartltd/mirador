paper.install(window);

describe('Freehand', function() {
  beforeAll(function() {
    this.canvas = jQuery('<canvas></canvas>');
    this.canvas.attr('id', 'paperId');
    jasmine.getFixtures().set(this.canvas);
    paper.setup(this.canvas.attr('id'));
    this.freehand = new Mirador.Freehand();
  });
  afterAll(function() {
    delete this.freehand;
  });

  it('should create freehand shape', function() {
    var initialPoint = {
      'x': 123,
      'y': 456
    };
    var overlay = {
      'paperScope': paper,
      'strokeColor': '#ff0000'
    };
    var shape = this.freehand.createShape(initialPoint, overlay);

    expect(overlay.mode).toBe('create');

    expect(shape.strokeColor.red).toBe(1);
    expect(shape.strokeColor.green).toBe(0);
    expect(shape.strokeColor.blue).toBe(0);

    expect(shape.closed).toBe(false);

    expect(shape.fullySelected).toBe(true);

    expect(shape.name).toBe(this.freehand.idPrefix + '1');

    expect(shape.segments.length).toBe(1);

    expect(shape.segments[0].point.x).toBe(initialPoint.x);
    expect(shape.segments[0].point.y).toBe(initialPoint.y);
  });

  describe('Freehand Mouse Tool', function() {
    var overlay;

    beforeEach(function() {
      overlay = {
        'paperScope': paper,
        'strokeColor': '#ff0000',
        'fillColor': '#00ff00',
        'fillColorAlpha': 1.0,
        'mode': '',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      this.freehand = new Mirador.Freehand();
      this.initialPoint = {
        'x': 987,
        'y': 654
      };
      this.shape = this.freehand.createShape(this.initialPoint, overlay);
      var point = {
        'x': this.initialPoint.x + 5,
        'y': this.initialPoint.y
      };
      this.shape.add(point);
      point = {
        'x': this.initialPoint.x,
        'y': this.initialPoint.y + 5
      };
      this.shape.add(point);
    });

    afterEach(function() {
      delete this.shape;
      delete this.freehand;
    });

    it('should do nothing', function() {
      var event = {
        'delta': {
          'x': 100,
          'y': 100
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': '',
        'path': null,
        'segment': null
      };
      var localCenterPoint = {
        'x': this.initialPoint.x - 1,
        'y': this.initialPoint.y - 1
      };
      var expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': null,
        'segment': null
      };
      this.freehand.onMouseDrag(event, overlay);

      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }
    });

    it('should edit the whole freehand shape', function() {
      var event = {
        'delta': {
          'x': 3,
          'y': -3
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': this.shape,
        'segment': null
      };
      var expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x + event.delta.x,
          'y': this.shape.segments[idx].point.y + event.delta.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      var selectedPointIndex = 1;
      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': this.shape,
        'segment': this.shape.segments[selectedPointIndex]
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        if (idx == selectedPointIndex) {
          var point = {
            'x': this.shape.segments[idx].point.x + event.delta.x,
            'y': this.shape.segments[idx].point.y + event.delta.y
          };
          expected.push(point);
        } else {
          var point = {
            'x': this.shape.segments[idx].point.x,
            'y': this.shape.segments[idx].point.y
          };
          expected.push(point);
        }
      }
      this.freehand.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': 100,
          'y': 100
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'create',
        'path': this.shape,
        'segment': null
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      expected.push(event.point);
      this.freehand.onMouseDrag(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }
    });

    it('should select freehand shape', function() {
      var event = {
        'point': {
          'x': this.initialPoint.x - 100,
          'y': this.initialPoint.y - 100
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': '',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      this.freehand.onMouseDown(event, overlay);

      expect(overlay.mode).toBe('create');
      expect(overlay.segment).toBeNull();
      expect(overlay.path).not.toBe(this.shape);
      expect(document.body.style.cursor).toBe('default');

      event = {
        'point': {
          'x': this.initialPoint.x - 100,
          'y': this.initialPoint.y - 100
        },
        'modifiers': {
          'shift': null
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'create',
        'path': this.shape,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      var expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      expect(document.body.style.cursor).toBe('default');

      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      this.freehand.onMouseDown(event, overlay);

      expect(overlay.segment.point.x).toBe(event.point.x);
      expect(overlay.segment.point.y).toBe(event.point.y);

      expect(overlay.path).not.toBe(this.shape);
      expect(document.body.style.cursor).toBe('move');

      overlay = {
        'paperScope': paper,
        'mode': 'translate',
        'path': this.shape,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      this.freehand.onMouseDown(event, overlay);

      event = {
        'point': {
          'x': this.initialPoint.x + 5,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': 'selected'
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': '',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        if (point.x != event.point.x || point.y != event.point.y) {
          expected.push(point);
        }
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': this.initialPoint.x + 3,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': 'selected'
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': '',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': this.initialPoint.x + 3,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': null
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': this.shape,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': this.initialPoint.x + 3,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': null
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': true,
          'segments': true,
          'tolerance': 0
        },
        onDrawFinish: function() {}
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': this.initialPoint.x + 100,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': null
        }
      };
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }

      event = {
        'point': {
          'x': this.initialPoint.x,
          'y': this.initialPoint.y
        },
        'modifiers': {
          'shift': null
        }
      };
      overlay = {
        'paperScope': paper,
        'mode': 'edit',
        'path': null,
        'segment': null,
        'hitOptions': {
          'fill': true,
          'stroke': false,
          'segments': false,
          'tolerance': 5
        },
        onDrawFinish: function() {}
      };
      this.shape.closed = true;
      this.shape.fillColor = '#0000ff';
      expected = [];
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        var point = {
          'x': this.shape.segments[idx].point.x,
          'y': this.shape.segments[idx].point.y
        };
        expected.push(point);
      }
      this.freehand.onMouseDown(event, overlay);

      expect(this.shape.segments.length).toBe(expected.length);
      for (var idx = 0; idx < this.shape.segments.length; idx++) {
        expect(this.shape.segments[idx].point.x).toBeCloseTo(expected[idx].x, 6);
        expect(this.shape.segments[idx].point.y).toBeCloseTo(expected[idx].y, 6);
      }
    });
  });
});