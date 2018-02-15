// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by a MIT-style license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    backbone = require('backbone'),
    joint = require('joint'),
    window = require('window'),
    createMap = require('./map').Map,
    createItemDragger = require('./itemdragger').ItemDragger,
    createPanReactor = require('./panreactor').PanReactor,
    createZoomReactor = require('./zoomreactor').ZoomReactor,
    createManipulationReactor = require('./manipulationreactor').ManipulationReactor,
    createEmbeddingReactor = require('./embeddingreactor').EmbeddingReactor,
    createUndoReactor = require('./undoreactor').UndoReactor,
    createElementsMenu = require('./elementsmenu').ElementsMenu,
    createModalEdit = require('./modaledit').ModalEdit,
    linkConnectionPoint = require('./linkconnectionpoint').linkConnectionPoint,
    validateConnection = require('./validateconnection').validateConnection;

function Board(options) {
    if (!(this instanceof Board)) { return new Board(options); }
    _.extend(this, backbone.Events);
    options = options || {};

    if (!options.model || typeof options.model !== 'object') { throw new Error('model option is mandatory'); }
    if (options.actions && !Array.isArray(options.actions)) { throw new Error('actions option should be an Array'); }
    if (!options.defaultLink || typeof options.defaultLink !== 'function') { throw new Error('defaultLink option is mandatory'); }
    if (!options.el) { throw new Error('el option is mandatory'); }
    if ($(options.el).length === 0) { throw new Error('invalid el option'); }

    var self = this,
        el = $($(options.el).addClass('almost-joint-paper')[0]),
        model = options.model,
        gridSize = 10,
        paper = new joint.dia.Paper({
            el: el,
            width: el.width(),
            height: el.height(),
            model: model,
            gridSize: gridSize,
            defaultLink: options.defaultLink,
            multiLinks: false,
            linkConnectionPoint: linkConnectionPoint,
            linkPinning: false,
            validateConnection: validateConnection,
            interactive: !options.readonly,
        }),
        map = createMap({
            paper: paper,
            el: el,
            model: model,
            linkConnectionPoint: linkConnectionPoint
        }),
        undoReactor = createUndoReactor({
            paper: paper,
            el: el,
            model: model
        }),
        zoomReactor = createZoomReactor({
            paper: paper,
            el: el,
            model: model,
            minScale: options.minScale || 0.01,
            maxScale: options.maxScale || 2
        }),
        manipulationReactor = createManipulationReactor({
            paper: paper,
            el: el,
            model: model,
            gridSize: gridSize,
            actions: options.actions,
            resize: options.resize,
            rotate: options.rotate,
            magnetize: options.magnetize,
            undoReactor: undoReactor
        }),
        embeddingReactor = createEmbeddingReactor({
            paper: paper,
            model: model,
            undoReactor: undoReactor
        });



    _.noop(embeddingReactor);

    el[0].addEventListener('mousedown', function (evt) {
        if ($(evt.target).hasClass('almost-joint-no-grip')) {
            evt.stopPropagation();
            var p = paper.snapToGrid({x: evt.clientX, y: evt.clientY});
            createPanReactor({paper: paper, el: el, x: p.x, y: p.y});
        }
    }, true);

    manipulationReactor.on('all', this.trigger, this);

    paper.on('all', this.trigger, this);

    paper.on('blank:pointerdown', function (evt, x, y) {
        _.noop(evt);
        createPanReactor({paper: paper, el: el, x: x, y: y});
    });

    function updateViewport() {
        var left = el.offset().left,
            top = el.offset().top,
            width = el.width(),
            height = el.height(),
            topLeft = joint.g.point(left, top),
            bottomRight = joint.g.point(left + width, top + height),
            min = paper.clientToLocalPoint(topLeft),
            max = paper.clientToLocalPoint(bottomRight);
        map.setViewport({x: min.x, y: min.y, width: max.x - min.x, height: max.y - min.y});
    }

    $(window).resize(function () {
        el.css('width', '').css('height', '');
        paper.setDimensions(el.width(), el.height());
        updateViewport();
    });

    paper.on('translate', updateViewport);
    paper.on('scale', updateViewport);
    model.once('add', updateViewport);

    self.zoomE = function () {
        zoomReactor.zoomE();
    };

    self.paper = function () {
        return paper;
    };

    self.download = function () {
        map.download();
    };

    self.clearHistory = function () {
        undoReactor.clear();
    };

    self.createItemDragger = function (options) {
        options = options || {};
        return createItemDragger({
            paper: paper,
            el: options.el,
            model: model,
            gridSize: gridSize,
            createElements: options.createElements,
            width: options.width,
            minHeight: options.minHeight,
            padding: options.padding,
            linkConnectionPoint: linkConnectionPoint,
            undoReactor: undoReactor
        });
    };

    self.createElementsMenu = function (options) {
        options = options || {};
        return createElementsMenu({
            container: options.container,
            template: options.template,
            builders: options.builders,
            createItemDragger: self.createItemDragger,
            width: options.width
        });
    };

    self.createModalEdit = function (options) {
        options = options || {};
        return createModalEdit({
            cell: options.cell,
            undoReactor: undoReactor
        });
    };
}

exports.Board = Board;
