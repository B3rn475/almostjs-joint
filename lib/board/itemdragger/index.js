// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    backbone = require('backbone'),
    joint = require('joint'),
    document = require('document');

function clone(model, items) {
    var mapping = model.cloneCells(items);
    return _.map(items, function (i) { return mapping[i.id]; });
}

function wrapItems(paper, elements, size, minHeight, gridSize) {
    var bbox = _(elements).map(function (cell) {
            return paper.findViewByModel(cell).getBBox();
        }).reduce(function (memo, bbox) {
            return memo.union(bbox);
        }),
        maxsize = Math.max(bbox.width, bbox.height) + gridSize * 2,
        scale = Math.max(1, maxsize / size),
        actualwidth = size * scale,
        actualheight = Math.max(bbox.height + gridSize * 2, minHeight * scale),
        left = (actualwidth - bbox.width) / 2,
        top = (actualheight - bbox.height) / 2,
        position = joint.g.point(joint.g.snapToGrid(bbox.x - left, gridSize), joint.g.snapToGrid(bbox.y - top, gridSize)),
        containerItem = new joint.shapes.basic.Rect({
            position: position,
            size: { width: actualwidth, height: actualheight},
            attrs: { rect: { fill: 'transparent', stroke: 'transparent' } }
        });

    return containerItem;
}

function removeHandlers(paper, items) {
    _.each(items, function (item) {
        paper.findViewByModel(item).$el.css('pointer-events', 'none');
    });
}

function ItemDragger(options) {
    if (!(this instanceof ItemDragger)) { return new ItemDragger(options); }
    _.extend(this, backbone.Events);

    options = options || {};

    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (!options.paper || typeof options.paper !== 'object') { throw new Error('paper option is mandatory'); }
    if (!options.createElements || typeof options.createElements !== 'function') { throw new Error('createElements option is mandatory'); }
    if (!options.linkConnectionPoint || typeof options.linkConnectionPoint !== 'function') { throw new Error('linkConnectionPoint option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el options'); }
    if (typeof options.gridSize !== 'number') { throw new Error('gridSize option is mandatory and has to be a number'); }
    if (options.gridSize < 0) { throw new Error('gridSize cannot be less than zero'); }
    if (typeof options.width !== 'number') { throw new Error('width option is mandatory and has to be a number'); }
    if (options.width < 0) { throw new Error('width cannot be less than zero'); }
    if (options.minHeight < 0) { throw new Error('minHeight cannot be less than zero'); }
    if (!options.undoReactor || typeof options.undoReactor !== 'object') { throw new Error('model option is mandatory'); }

    var self = this,
        gridSize = options.gridSize,
        createElements = options.createElements,
        linkConnectionPoint = options.linkConnectionPoint,
        el = $($(options.el)[0]),
        paper = options.paper,
        model = options.model,
        minHeight = options.minHeight,
        paperWidth = options.width - gridSize * 2,
        undoReactor = options.undoReactor,
        overlayitems = createElements(),
        mainitem,
        mainposition,
        size,
        preview = (function () {
            var container = $(require('./dragger.html'));
            $(document.body).append(container);
            return container;
        }()),
        baseScale,
        paperHeight,
        overlaymodel = new joint.dia.Graph(),
        overlaypaper = new joint.dia.Paper({
            el: preview,
            width: paperWidth,
            model: overlaymodel,
            linkConnectionPoint: linkConnectionPoint,
            gridSize: gridSize
        });
    //add elements
    overlaymodel.addCells(overlayitems);
    //compute bbox
    mainitem = wrapItems(overlaypaper, overlayitems, paperWidth, minHeight, gridSize);
    overlaymodel.addCell(mainitem);
    //resize paper
    mainposition = mainitem.position();
    size = mainitem.get('size');
    baseScale = paperWidth / size.width;
    paperHeight = size.height * baseScale;
    overlaypaper.scale(baseScale, baseScale);
    overlaypaper.setDimensions(paperWidth, paperHeight);
    //for rendering
    el.append(preview);
    //remove handlers
    removeHandlers(overlaypaper, overlayitems);
    _.each(overlayitems, function (item) {
        if (item.get('parent')) { return; }
        mainitem.embed(item);
    });
    mainitem.translate(-mainposition.x, -mainposition.y);

    overlaypaper.on('cell:pointerdown', function (cellView, e, x, y) {
        _.noop(cellView);
        var overlay = $(require('./overlay.html')),
            container = $(paper.el),
            spacer = $('<div></div>').css('height', preview.height() + 2 * gridSize),
            left = container.offset().left,
            top = container.offset().top,
            width = container.width(),
            height = container.height(),
            topLeft = joint.g.point(left, top),
            bottomRight = joint.g.point(left + width, top + height),
            current = joint.g.point(e.clientX, e.clientY),
            minLocal = paper.clientToLocalPoint(topLeft),
            maxLocal = paper.clientToLocalPoint(bottomRight),
            startPoint = paper.clientToLocalPoint(current),
            scale = joint.g.point(width / (maxLocal.x - minLocal.x), height / (maxLocal.y - minLocal.y)),
            startPosition = joint.g.point(joint.g.snapToGrid(startPoint.x - x, gridSize), joint.g.snapToGrid(startPoint.y - y, gridSize));

        container.append(overlay);
        overlay.append(preview);
        el.append(spacer);

        overlaypaper.setDimensions(width, height);
        overlaypaper.scale(scale.x, scale.y);
        overlaypaper.setOrigin(-minLocal.x * scale.x, -minLocal.y * scale.y);
        mainitem.translate(startPosition.x, startPosition.y);

        function pointermove() {
            mainitem.translate(-startPosition.x, -startPosition.y);
        }

        overlaypaper.once('cell:pointermove', pointermove);

        overlaypaper.on('cell:pointerup', function pointerup(cellView, e, x, y) {
            _.noop(cellView, e);
            overlaypaper.off('cell:pointermove', pointermove);
            var position = mainitem.position(),
                paperBBox = joint.g.rect(0, 0, paper.options.width, paper.options.height),
                releasePoint = paper.localToPaperPoint(paper.clientToLocalPoint(overlaypaper.localToClientPoint(joint.g.point(x, y)))),
                items,
                overlaytopitems;
            if (paperBBox.containsPoint(releasePoint)) {
                overlaytopitems = _.filter(overlayitems, function (i) { return i.get('parent') === mainitem.id; });
                _.each(overlaytopitems, function (item) { mainitem.unembed(item); });
                items = clone(overlaymodel, overlayitems);
                _.each(items, function (item) { item.unset('z'); });
                undoReactor.start();
                model.addCells(items);
                undoReactor.stop();
                _.each(overlaytopitems, function (item) { mainitem.embed(item); });
            }
            spacer.remove();
            el.append(preview);
            overlay.remove();

            mainitem.translate(-position.x, -position.y);
            overlaypaper.setDimensions(paperWidth, paperHeight);
            overlaypaper.scale(baseScale, baseScale);
            overlaypaper.setOrigin(0, 0);

            overlaypaper.off('cell:pointerup', pointerup);
            self.trigger('drag:end');
        });

        self.trigger('drag:start');
    });
}

ItemDragger.prototype = Object.create(ItemDragger.prototype);

exports.ItemDragger = ItemDragger;
