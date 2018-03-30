// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint');

function ZoomReactor(options) {
    if (!(this instanceof ZoomReactor)) { return new ZoomReactor(options); }
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }
    if (typeof options.minScale !== 'number') { throw new Error('minScale option is mandatory and has to be a number'); }
    if (typeof options.maxScale !== 'number') { throw new Error('maxScale option is mandatory and has to be a number'); }
    if (options.minScale < 0) { throw new Error('minScale cannot be less than zero'); }
    if (options.minScale > options.maxScale) { throw new Error('maxScale cannot be less the minScale'); }

    var self = this,
        el = $($(options.el)[0]),
        paper = options.paper,
        model = options.model,
        minScale = options.minScale,
        maxScale = options.maxScale,
        paddingZoomE = {width: 50, height: 50};

    function normalizeScale(scale) {
        return Math.min(Math.max(scale, minScale), maxScale);
    }

    function mousewheel(e, delta) {
        var x = e.clientX,
            y = e.clientY,
            left = el.offset().left,
            top = el.offset().top,
            width = el.width(),
            height = el.height(),
            topLeft = joint.g.point(left, top),
            bottomRight = joint.g.point(left + width, top + height),
            current = joint.g.point(x, y),
            minLocal = paper.clientToLocalPoint(topLeft),
            maxLocal = paper.clientToLocalPoint(bottomRight),
            startLocal = paper.clientToLocalPoint(current),
            scale = {x: width / (maxLocal.x - minLocal.x), y: height / (maxLocal.y - minLocal.y)},
            offsetClient,
            origin;
        scale = normalizeScale(scale.x * Math.pow(1.1, delta));
        paper.scale(scale, scale);
        minLocal = paper.clientToLocalPoint(topLeft);
        maxLocal = paper.clientToLocalPoint(bottomRight);
        scale = joint.g.point(width / (maxLocal.x - minLocal.x), height / (maxLocal.y - minLocal.y));
        offsetClient = joint.g.point(startLocal.x * scale.x, startLocal.y * scale.y);
        origin = joint.g.point(x - offsetClient.x, y - offsetClient.y);

        paper.setOrigin(origin.x - left, origin.y - top);

        e.preventDefault();
    }

    function pointerdblclick() {
        if (model.getElements().length === 0) { return; }
        // it is similar to paper.scaleContentToFit(); but i require to do it manually to change even the origin
        var width = el.width() - paddingZoomE.width * 2,
            height = el.height() - paddingZoomE.height * 2,
            bbox = model.getBBox(model.getElements(), {useModelGeometry: true}),
            scaleX = width / bbox.width,
            scaleY = height / bbox.height,
            scale = Math.max(Math.min(scaleX, scaleY, maxScale), minScale),
            ox = (width - bbox.width * scale) / 2 - bbox.x * scale,
            oy = (height - bbox.height * scale) / 2 - bbox.y * scale;

        paper.scale(scale, scale);
        paper.setOrigin(ox + paddingZoomE.width, oy + paddingZoomE.height);
    }

    paper.on('blank:pointerdblclick', pointerdblclick);
    paper.on('blank:mousewheel', _.rearg(mousewheel, 0, 3));
    paper.on('cell:mousewheel', _.rearg(mousewheel, 1, 4));

    self.zoomE = function () {
        pointerdblclick();
    };
}

exports.ZoomReactor = ZoomReactor;
