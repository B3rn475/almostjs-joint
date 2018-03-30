// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true */
"use strict";

var $ = require('jquery'),
    joint = require('joint'),
    ViewportOutline = require('./viewportoutline').ViewportOutline;

function Viewport(options) {
    if (!(this instanceof Viewport)) { return new Viewport(options); }
    options = options || {};

    if (!options.el) { throw new Error('el options is Mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el options'); }

    var self = this,
        el = $($(options.el)[0]),
        model = new joint.dia.Graph(),
        paper = new joint.dia.Paper({
            el: el,
            width: el.width(),
            height: el.height(),
            model: model,
            interactive: false
        }),
        viewport = new ViewportOutline({
            position: joint.g.point(0, 0),
            size: { width: 1, height: 1 }
        });

    model.addCells([viewport]);

    self.setBBox = function (bbox) {
        // it is similar to paper.scaleContentToFit(); but i require to do it manually to change even the origin
        var width = el.width(),
            height = el.height(),
            scaleX = width / bbox.width,
            scaleY = height / bbox.height,
            scale = Math.min(scaleX, scaleY),
            ox = (width - bbox.width * scale) / 2 - bbox.x * scale,
            oy = (height - bbox.height * scale) / 2 - bbox.y * scale;

        paper.scale(scale, scale);
        paper.setOrigin(ox, oy);
    };

    self.setViewport = function (bbox) {
        viewport.position(bbox.x, bbox.y);
        viewport.resize(bbox.width, bbox.height);
    };
}

exports.Viewport = Viewport;
