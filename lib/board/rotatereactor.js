// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint');

function RotateReactor(options) {
    if (!(this instanceof RotateReactor)) { return new RotateReactor(options); }
    options = options || {};

    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is mandatory'); }
    if (!options.view || typeof options.view !== 'object') { throw new Error('view option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }
    if (typeof options.angleStep !== 'number') { throw new Error('angleStep option is mandatory and has to be a number'); }
    if (options.angleStep < 0) { throw new Error('angleStep cannot be less than zero'); }

    var el = $($(options.el)[0]),
        paper = options.paper,
        element = options.view.model,
        angleStep = options.angleStep,
        mouseout;

    function mousemove(e) {
        var client = paper.clientToLocalPoint({x: e.clientX, y: e.clientY}),
            bbox = element.getBBox({useModelGeometry: true}),
            center = bbox.center(),
            rad = Math.atan2(client.y - center.y, client.x - center.x);
        element.rotate(Math.round(joint.g.toDeg(rad) / angleStep) * angleStep, true);
    }

    function terminate() {
        el.off('mouseup', terminate);
        el.off('mouseout', mouseout);
        el.off('mousemove', mousemove);
        el.removeClass('almost-joint-manipulating');
    }

    mouseout = function (e) {
        if (e.target === el.get(0)) {
            terminate();
        }
    };

    el.on('mouseup', terminate);
    el.on('mouseout', mouseout);
    el.on('mousemove', mousemove);

    el.addClass('almost-joint-manipulating');
}

exports.RotateReactor = RotateReactor;
