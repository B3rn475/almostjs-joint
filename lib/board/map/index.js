// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    joint = require('joint'),
    createPreview = require('./preview').Preview,
    createViewport = require('./viewport').Viewport;

function Map(options) {
    if (!(this instanceof Map)) { return new Map(options); }
    options = options || {};

    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is Mandatory'); }
    if (!options.paper || typeof options.paper !== 'object' || !(options.paper instanceof joint.dia.Paper)) { throw new Error('paper option is Mandatory'); }
    if (!options.linkConnectionPoint || typeof options.linkConnectionPoint !== 'function') { throw new Error('linkConnectionPoint option is Mandatory'); }
    if (!options.el) { throw new Error('el option is Mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }

    var self = this,
        el = $($(options.el)[0]),
        paper = options.paper,
        linkConnectionPoint = options.linkConnectionPoint,
        mapContainer = (function () {var container = $(require('./preview.html')); el.append(container); return container; }()),
        viewportContainer = (function () {var container = $(require('./viewport.html')); el.append(container); return container; }()),
        model = options.model,
        preview = createPreview({el: mapContainer, model: model, linkConnectionPoint: linkConnectionPoint}),
        viewport = createViewport({el: viewportContainer}),
        autoRefreshEnabled = true;

    model.on('change:position change:size change:angle change:parent add remove', function (element) {
        if (model.hasActiveBatch('add') || model.hasActiveBatch('clear')) { return; }
        if (!autoRefreshEnabled) { return; }
        if (element.isLink()) { return; }
        if (element.get('parent')) { return; }
        _.defer(function () { self.refresh(); });
    });
    model.on('batch:stop', function (e) {
        if ((e.batchName !== 'add' && e.batchName !== 'clear') || model.hasActiveBatch('add') || model.hasActiveBatch('clear')) { return; }
        _.defer(function () { self.refresh(); });
    });

    self.refresh = function () {
        var bbox,
            width,
            height,
            minLocal,
            maxLocal;
        if (model.getElements().length === 0) {
            width = el.width();
            height = el.height();
            minLocal = paper.clientToLocalPoint(joint.g.point(0, 0));
            maxLocal = paper.clientToLocalPoint(joint.g.point(width, height));
            bbox = joint.g.rect(minLocal.x, minLocal.y, maxLocal.x - minLocal.x, maxLocal.y - minLocal.y);
        } else {
            bbox = model.getBBox(model.getElements(), {useModelGeometry: true});
            bbox = joint.g.rect(bbox.x - 10, bbox.y - 10, bbox.width + 20, bbox.height + 20);
        }
        preview.setBBox(bbox);
        viewport.setBBox(bbox);
    };

    self.disableAutorefresh = function () {
        autoRefreshEnabled = false;
    };

    self.enableAutorefresh = function () {
        autoRefreshEnabled = true;
    };

    self.setViewport = function (bbox) {
        viewport.setViewport(bbox);
    };

    self.download = function () {
        preview.download();
    };

    self.refresh();
}

exports.Map = Map;
