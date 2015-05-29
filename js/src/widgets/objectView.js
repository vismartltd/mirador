(function($) {
    
    $.ObjectView = function(options) {

    jQuery.extend(this, {
      windowId:         null,
      canvasID:         null,
      canvasIndex:      0,
      mode:             'ThumbnailsView',
      imagesList:       [],
      element:          null,
      elemOsd:          null,
      parent:           null,
      manifest:         null,
      osd:              null,
      fullscreen:       null,
      osdOptions: {
        osdBounds:      null,
        zoomLevel:      null
      },
      osdCls:          'mirador-osd',
      elemAnno:         null,
      annoCls:          'annotation-canvas',
      annotationLayerAvailable: null 
    }, options);

    this.init();
  };
    $.ObjectView.prototype = {
        // ----------
        init: function() {
            var _this = this,
            uniqueID = $.genUUID(),
            osdID = 'mirador-osd-' + uniqueID;

            if (this.canvasID !== null) {
                this.canvasIndex = $.getImageIndexById(this.imagesList, this.canvasID);
            }

            this.element = jQuery(this.template()).appendTo(this.appendTo);
            this.elemOsd = jQuery('<div/>').addClass(this.osdCls).attr('id', osdID).appendTo(this.element);
            jQuery('<div/>').addClass('scroll-cover viewer-position').append(jQuery('<div/>').addClass('scroll-inner')).appendTo(this.element);

            this.hud = new $.Hud({
                parent: this,
                element: this.element,
                bottomPanelAvailable: this.bottomPanelAvailable,
                windowId: this.windowId,
                annotationLayerAvailable: this.annotationLayerAvailable,
                annoEndpointAvailable: this.annoEndpointAvailable
            });

            //TODO: should not be hardcoded
            this.pageBuffer = 0.05;
            this.bigBuffer = 0.2;

            this.tileSources = [];
            jQuery.each(this.imagesList, function(index, value) {
                _this.tileSources.push($.Iiif.getImageUrl(value) + '/info.json');
            });
            this.pages = this.createPages();

            this.osd = $.OpenSeadragon({
                id: osdID,
                autoResize: false,
                showHomeControl: false,
                tileSources: this.tileSources,
                'uniqueID' : uniqueID
            });

            this.osd.addHandler('open', function() {
                _this.elemOsd = jQuery(_this.osd.element);

                jQuery.each(_this.pages, function(i, v) {
                    v.setTiledImage(_this.osd.world.getItemAt(i));
                    v.addDetails();
                });

                _this.setMode({
                    mode: _this.mode,
                    immediately: true
                });

                _this.osd.addHandler('canvas-drag', function() {
                    if (_this.mode === 'ScrollView') {
                        var result = _this.hitTest(_this.osd.viewport.getCenter());
                        if (result) {
                            _this.canvasIndex = result.index;
                            _this.update();
                        }
                    }
                });

                _this.osd.addHandler('zoom', function(event) {
                    _this.applyConstraints();
                });

                _this.osd.addHandler('pan', function(event) {
                    _this.applyConstraints();
                });
            });

            this.details = jQuery('.details')
                .prop('checked', true)
                .change(function() {
                    if (_this.details.prop('checked')) {
                        _this.showDetails();
                    } else {
                        _this.hideDetails();
                    }
                });

            jQuery(window).keyup(function(event) {
                if (_this.mode === 'ThumbnailsView') {
                    return;
                }

                if (event.which === 39) { // Right arrow
                    _this.next();
                } else if (event.which === 37) { // Left arrow
                    _this.previous();
                }
            });

            this.scrollInner = jQuery('.scroll-inner');

            this.scrollCover = jQuery('.scroll-cover')
                .scroll(function(event) {
                    var info = _this.getScrollInfo();
                    if (!info || _this.ignoreScroll) {
                        return;
                    }

                    var pos = new OpenSeadragon.Point(info.thumbBounds.getCenter().x,
                        info.thumbBounds.y + (info.viewportHeight / 2) +
                        (info.viewportMax * info.scrollFactor));

                    _this.osd.viewport.panTo(pos, true);
                })
                .mousemove(function(event) {
                    var pixel = new OpenSeadragon.Point(event.clientX, event.clientY);
                    pixel.y -= _this.scrollCover.position().top;
                    var result = _this.hitTest(_this.osd.viewport.pointFromPixel(pixel));
                    _this.updateHover(result ? result.index : -1);
                })
                .click(function(event) {
                    var pixel = new OpenSeadragon.Point(event.clientX, event.clientY);
                    pixel.y -= _this.scrollCover.position().top;
                    var result = _this.hitTest(_this.osd.viewport.pointFromPixel(pixel));
                    if (result) {
                        _this.parent.toggleObjectView(_this.imagesList[result.index]['@id'], 'ImageView');
                        /*_this.setMode({
                            mode: 'ImageView',
                            canvasIndex: result.index
                        });*/
                    }
                });

            var svgNode = this.osd.svgOverlay();

            this.highlight = d3.select(svgNode).append("rect")
                .style('fill', 'none')
                .style('stroke', '#08f')
                .style('opacity', 0)
                .style('stroke-width', 0.05)
                .attr("pointer-events", "none");

            this.hover = d3.select(svgNode).append("rect")
                .style('fill', 'none')
                .style('stroke', '#08f')
                .style('opacity', 0)
                .style('stroke-width', 0.05)
                .attr("pointer-events", "none");

            jQuery(window).resize(function() {
                var newSize = new OpenSeadragon.Point(_this.elemOsd.width(), _this.elemOsd.height());
                _this.osd.viewport.resize(newSize, false);
                _this.setMode({
                    mode: _this.mode,
                    immediately: true
                });

                _this.osd.forceRedraw();

                _this.osd.svgOverlay('resize');
            });

            this.update();
        },

        template: Handlebars.compile([
           '<div class="object-view">',
           '</div>'
           ].join('')),

        // ----------
        next: function() {
            var canvasIndex = this.canvasIndex + (this.mode === 'BookView' ? 2 : 1);
            if (this.mode === 'BookView' && canvasIndex % 2 === 0 && canvasIndex !== 0) {
                canvasIndex --;
            }

            this.goToPage({
                canvasIndex: canvasIndex
            });
        },

        // ----------
        previous: function() {
            var canvasIndex = this.canvasIndex - (this.mode === 'BookView' ? 2 : 1);
            if (this.mode === 'BookView' && canvasIndex % 2 === 0 && canvasIndex !== 0) {
                canvasIndex --;
            }

            this.goToPage({
                canvasIndex: canvasIndex
            });
        },

        // ----------
        hideDetails: function() {
            jQuery.each(this.pages, function(i, v) {
                v.removeDetails();
            });
        },

        // ----------
        showDetails: function() {
            jQuery.each(this.pages, function(i, v) {
                v.addDetails();
            });
        },

        // ----------
        hitTest: function(pos) {
            var count = this.pages.length;
            var page, box;

            for (var i = 0; i < count; i++) {
                page = this.pages[i];
                box = page.getBounds();
                if (pos.x > box.x && pos.y > box.y && pos.x < box.x + box.width &&
                        pos.y < box.y + box.height) {
                    return {
                        index: i
                    };
                }
            }

            return null;
        },

        // ----------
        getScrollInfo: function() {
            if (!this.thumbBounds) {
                return null;
            }

            var output = {};

            var viewerWidth = this.elemOsd.width();
            var viewerHeight = this.elemOsd.height();
            var scrollTop = this.scrollCover.scrollTop();
            output.scrollMax = this.scrollInner.height() - this.scrollCover.height();
            output.scrollFactor = (output.scrollMax > 0 ? scrollTop / output.scrollMax : 0);

            output.thumbBounds = this.thumbBounds;
            output.viewportHeight = output.thumbBounds.width * (viewerHeight / viewerWidth);
            output.viewportMax = Math.max(0, output.thumbBounds.height - output.viewportHeight);
            return output;
        },

        // ----------
        update: function() {
            var _this = this;

            if (this.mode === 'ThumbnailsView') {
                this.hud.hideAll();
            } else if (this.mode === 'ScrollView') {
                //hide annotations
                this.hud.hideAnnotations();

                //show zooming
                this.hud.showPanZoom();

                //TODO: hide image manipulation

                //hide next/previous
                this.hud.hidePrevious();
                this.hud.hideNext();

                //hide full screen
                this.hud.hideFullScreen();

                //hide bottom panel
                this.hud.hideBottomPanel();
            } else if (this.mode === 'ImageView') {
                //show annotations
                this.hud.showAnnotations();

                //show zooming
                this.hud.showPanZoom();

                //TODO: show image manipulation

                //show full screen
                this.hud.showFullScreen();

                //show next/previous, if needed
                if (this.canvasIndex === 0) {
                    this.hud.hidePrevious();
                    this.hud.showNext();
                } else if (this.canvasIndex === this.imagesList.length-1) {
                    this.hud.hideNext();
                    this.hud.showPrevious();
                } else {
                    this.hud.showNext();
                    this.hud.showPrevious();
                }

                //TODO: show bottom panel, if requested
                this.hud.showBottomPanel();
            } else if (this.mode === 'BookView') {
                //hide annoations
                this.hud.hideAnnotations();

                //show zooming
                this.hud.showPanZoom();

                //TODO: show image manipulation

                //show full screen
                this.hud.showFullScreen();

                //show next/previous, if needed
                if (this.canvasIndex === 0) {
                    this.hud.hidePrevious();
                    this.hud.showNext();
                } else if (this.canvasIndex === this.imagesList.length-1) {
                    this.hud.hideNext();
                    this.hud.showPrevious();
                } else {
                    this.hud.showNext();
                    this.hud.showPrevious();
                }

                //TODO: show bottom panel, if requested
                this.hud.showBottomPanel();
            }

            // TODO: alternates menu
            if (this.alternates) {
                this.alternates.remove();
                this.alternates = null;
            }

            var page = this.pages[this.canvasIndex];
            if (page && page.alternates && page.alternates.length) {
                this.alternates = jQuery('<select>')
                    .change(function() {
                        page.selectAlternate(parseInt(_this.alternates.val(), 10));
                    })
                    .appendTo('.nav');

                jQuery('<option>')
                    .attr('value', -1)
                    .text(page.label || 'Default')
                    .appendTo(_this.alternates);

                jQuery.each(page.alternates, function(i, v) {
                    if (v.label) {
                        jQuery('<option>')
                            .attr('value', i)
                            .text(v.label)
                            .appendTo(_this.alternates);
                    }
                });

                this.alternates.val(page.alternateIndex);
            }
        },

        // ----------
        applyConstraints: function() {
            if (this.mode === 'ThumbnailsView') {
                return;
            }

            if (this.panBounds && !this.inZoomConstraints) {
                var changed = false;
                var viewBounds = this.osd.viewport.getBounds();
                var panBounds = this.panBounds.clone();

                if (viewBounds.x < panBounds.x - 0.00001) {
                    viewBounds.x = panBounds.x;
                    changed = true;
                }

                if (viewBounds.y < panBounds.y - 0.00001) {
                    viewBounds.y = panBounds.y;
                    changed = true;
                }

                if (viewBounds.width > panBounds.width + 0.00001) {
                    viewBounds.width = panBounds.width;
                    changed = true;
                }

                if (viewBounds.height > panBounds.height + 0.00001) {
                    viewBounds.height = panBounds.height;
                    changed = true;
                }

                if (viewBounds.x + viewBounds.width > panBounds.x + panBounds.width + 0.00001) {
                    viewBounds.x = (panBounds.x + panBounds.width) - viewBounds.width;
                    changed = true;
                }

                if (viewBounds.y + viewBounds.height > panBounds.y + panBounds.height + 0.00001) {
                    viewBounds.y = (panBounds.y + panBounds.height) - viewBounds.height;
                    changed = true;
                }

                if (changed) {
                    this.inZoomConstraints = true;
                    this.osd.viewport.fitBounds(viewBounds);
                    this.inZoomConstraints = false;
                }
            }

            var zoom = this.osd.viewport.getZoom();
            var maxZoom = 2;

            var zoomPoint = this.osd.viewport.zoomPoint || this.osd.viewport.getCenter();
            var info = this.hitTest(zoomPoint);
            if (info) {
                var page = this.pages[info.index];
                var tiledImage = page.hitTest(zoomPoint);
                if (tiledImage) {
                    maxZoom = this.osd.maxZoomLevel;
                    if (!maxZoom) {
                        var imageWidth = tiledImage.getContentSize().x;
                        var viewerWidth = this.elemOsd.width();
                        maxZoom = imageWidth * this.osd.maxZoomPixelRatio / viewerWidth;
                        maxZoom /= tiledImage.getBounds().width;
                    }
                }
            }

            if (zoom > maxZoom) {
                this.osd.viewport.zoomSpring.target.value = maxZoom;
            }
        },

        // ----------
        setMode: function(config) {
            var _this = this;

            this.mode = config.mode;

            if (config.canvasIndex !== undefined) {
                this.canvasIndex = config.canvasIndex; // Need to do this before layout
            }
            if (config.canvasID !== undefined) {
                this.canvasIndex = $.getImageIndexById(this.imagesList, config.canvasID);
            }

            this.ignoreScroll = true;
            this.thumbBounds = null;

            var layout = this.createLayout();

            if (this.mode === 'ThumbnailsView') {
                this.osd.gestureSettingsMouse.scrollToZoom = false;
                this.osd.zoomPerClick = 1;
                this.osd.panHorizontal = false;
                this.osd.panVertical = false;
                var viewerWidth = this.elemOsd.width();
                var width = layout.bounds.width + (this.bigBuffer * 2);
                var height = layout.bounds.height + (this.bigBuffer * 2);
                var newHeight = viewerWidth * (height / width);
                this.scrollCover.show();
                this.scrollInner
                    .css({
                        height: newHeight
                    });
            } else {
                this.osd.gestureSettingsMouse.scrollToZoom = true;
                this.osd.zoomPerClick = 2;
                this.osd.panHorizontal = true;
                this.osd.panVertical = true;
                this.scrollCover.hide();
            }

            this.setLayout({
                layout: layout,
                immediately: config.immediately
            });

            if (this.mode === 'ThumbnailsView') {
                // Set up thumbBounds
                this.thumbBounds = this.osd.world.getHomeBounds();
                this.thumbBounds.x -= this.bigBuffer;
                this.thumbBounds.y -= this.bigBuffer;
                this.thumbBounds.width += (this.bigBuffer * 2);
                this.thumbBounds.height += (this.bigBuffer * 2);

                // Scroll to the appropriate location
                var info = this.getScrollInfo();

                var viewportBounds = this.thumbBounds.clone();
                viewportBounds.y += info.viewportMax * info.scrollFactor;
                viewportBounds.height = info.viewportHeight;

                var pageBounds = this.pages[this.canvasIndex].getBounds();
                var top = pageBounds.y - this.bigBuffer;
                var bottom = top + pageBounds.height + (this.bigBuffer * 2);

                var normalY;
                if (top < viewportBounds.y) {
                    normalY = top - this.thumbBounds.y;
                } else if (bottom > viewportBounds.y + viewportBounds.height) {
                    normalY = (bottom - info.viewportHeight) - this.thumbBounds.y;
                }

                if (normalY !== undefined) {
                    var viewportFactor = normalY / info.viewportMax;
                    this.scrollCover.scrollTop(info.scrollMax * viewportFactor);
                }
            }

            this.goHome({
                immediately: config.immediately
            });

            this.osd.viewport.minZoomLevel = this.osd.viewport.getZoom();

            this.update();
            this.updateHighlight();
            this.updateHover(-1);

            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(function() {
                _this.ignoreScroll = false;
            }, this.osd.animationTime * 1000);
        },

        // ----------
        updateHighlight: function() {
            if (this.mode !== 'ThumbnailsView') {
                this.highlight.style('opacity', 0);
                return;
            }

            var page = this.pages[this.canvasIndex];
            var box = page.getBounds();

            this.highlight
                .style('opacity', 1)
                .attr("x", box.x)
                .attr("width", box.width)
                .attr("y", box.y)
                .attr("height", box.height);
        },

        // ----------
        updateHover: function(canvasIndex) {
            if (canvasIndex === -1 || this.mode !== 'ThumbnailsView') {
                this.hover.style('opacity', 0);
                this.scrollCover.css({
                    'cursor': 'default'
                });

                return;
            }

            this.scrollCover.css({
                'cursor': 'pointer'
            });

            var page = this.pages[canvasIndex];
            var box = page.getBounds();

            this.hover
                .style('opacity', 0.3)
                .attr("x", box.x)
                .attr("width", box.width)
                .attr("y", box.y)
                .attr("height", box.height);
        },

        // ----------
        goToPage: function(config) {
            var _this = this;

            var pageCount = this.pages.length;
            this.canvasIndex = Math.max(0, Math.min(pageCount - 1, config.canvasIndex));

            var viewerWidth = this.elemOsd.width();
            var viewerHeight = this.elemOsd.height();
            var bounds = this.pages[this.canvasIndex].getBounds();
            var x = bounds.x;
            var y = bounds.y;
            var width = bounds.width;
            var height = bounds.height;
            var box;

            //TODO: needs to work for different combinations of pages (including r-to-l)
            if (this.mode === 'BookView') {
                var page;
                if (this.canvasIndex % 2) { // First in a pair
                    if (this.canvasIndex < this.pages.length - 1) {
                        page = this.pages[this.canvasIndex + 1];
                        width += page.getBounds().width;
                    }
                } else {
                    if (this.canvasIndex > 0) {
                        page = this.pages[this.canvasIndex - 1];
                        box = page.getBounds();
                        x -= box.width;
                        width += box.width;
                    }
                }
            }

            x -= this.pageBuffer;
            y -= this.pageBuffer;
            width += (this.pageBuffer * 2);
            height += (this.pageBuffer * 2);

            if (this.mode === 'ScrollView') {
                if (this.canvasIndex === 0) {
                    x = bounds.x - this.pageBuffer;
                    width = height * (viewerWidth / viewerHeight);
                } else if (this.canvasIndex === this.pages.length - 1) {
                    width = height * (viewerWidth / viewerHeight);
                    x = (bounds.x + bounds.width + this.pageBuffer) - width;
                }
            }

            this.panBounds = null;

            box = new OpenSeadragon.Rect(x, y, width, height);
            this.osd.viewport.fitBounds(box, config.immediately);

            var setPanBounds = function() {
                if (_this.mode === 'ImageView' || _this.mode === 'BookView') {
                    _this.panBounds = box;
                } else if (_this.mode === 'ScrollView') {
                    _this.panBounds = _this.pages[0].getBounds()
                        .union(_this.pages[pageCount - 1].getBounds());

                    _this.panBounds.x -= _this.pageBuffer;
                    _this.panBounds.y -= _this.pageBuffer;
                    _this.panBounds.width += (_this.pageBuffer * 2);
                    _this.panBounds.height += (_this.pageBuffer * 2);
                }
            };

            clearTimeout(this.panBoundsTimeout);
            if (config.immediately) {
                setPanBounds();
            } else {
                this.panBoundsTimeout = setTimeout(setPanBounds, this.osd.animationTime * 1000);
            }

            this.osd.viewport.minZoomLevel = this.osd.viewport.getZoom();

            this.update();
        },

        // ----------
        createLayout: function() {
            var viewerWidth = this.elemOsd.width();
            var viewerHeight = this.elemOsd.height();
            var layoutConfig = {};

            if (this.mode === 'ThumbnailsView') {
                layoutConfig.columns = Math.floor(viewerWidth / 150);
                layoutConfig.buffer = this.bigBuffer;
                layoutConfig.sameWidth = true;
            } else if (this.mode === 'ScrollView') {
                layoutConfig.buffer = this.pageBuffer;
            } else if (this.mode === 'BookView' || this.mode === 'ImageView') {
                layoutConfig.book = (this.mode === 'BookView');
                var height = 1 + (this.pageBuffer * 2);
                // Note that using window here is approximate, but that's close enough.
                // We can't use viewer, because it may be stretched for the thumbs view.
                layoutConfig.buffer = (height * (jQuery(window).width() / jQuery(window).height())) / 2;
            }

            var layout = {
                bounds: null,
                specs: []
            };

            var count = this.pages.length;
            var x = 0;
            var y = 0;
            var offset = new OpenSeadragon.Point();
            var rowHeight = 0;
            var box, page;
            for (var i = 0; i < count; i++) {
                page = this.pages[i];
                box = page.getBounds();

                if (i === this.canvasIndex) {
                    offset = box.getTopLeft().minus(new OpenSeadragon.Point(x, y));
                }

                box.x = x;
                box.y = y;
                if (layoutConfig.sameWidth) {
                    box.height = box.height / box.width;
                    box.width = 1;
                } else {
                    box.width = box.width / box.height;
                    box.height = 1;
                }

                rowHeight = Math.max(rowHeight, box.height);

                layout.specs.push({
                    page: page,
                    bounds: box
                });

                if (layoutConfig.columns && i % layoutConfig.columns === layoutConfig.columns - 1) {
                    x = 0;
                    y += rowHeight + layoutConfig.buffer;
                    rowHeight = 0;
                } else {
                    if (!layoutConfig.book || i % 2 === 0) {
                        x += layoutConfig.buffer;
                    }

                    x += box.width;
                }
            }

            var pos, spec;
            for (i = 0; i < count; i++) {
                spec = layout.specs[i];
                pos = spec.bounds.getTopLeft().plus(offset);
                spec.bounds.x = pos.x;
                spec.bounds.y = pos.y;

                if (layout.bounds) {
                    layout.bounds = layout.bounds.union(spec.bounds);
                } else {
                    layout.bounds = spec.bounds.clone();
                }
            }

            return layout;
        },

        // ----------
        setLayout: function(config) {
            var spec;

            for (var i = 0; i < config.layout.specs.length; i++) {
                spec = config.layout.specs[i];
                spec.page.place(spec.bounds, config.immediately);
            }
        },

        // ----------
        goHome: function(config) {
            var viewerWidth = this.elemOsd.width();
            var viewerHeight = this.elemOsd.height();
            var layoutConfig = {};

            if (this.mode === 'ThumbnailsView') {
                var info = this.getScrollInfo();
                var box = this.thumbBounds.clone();
                box.height = box.width * (viewerHeight / viewerWidth);
                box.y += info.viewportMax * info.scrollFactor;
                this.osd.viewport.fitBounds(box, config.immediately);
            } else {
                this.goToPage({
                    canvasIndex: this.canvasIndex,
                    immediately: config.immediately
                });
            }
        },

        // ----------
        createPages: function() {
            if (this.tileSources) {
                return jQuery.map(this.tileSources, function(v, i) {
                    return new $.Page({
                        canvasIndex: i,
                        tileSource: v
                    });
                });
            }

            return [];
        }
    };
})(Mirador);
