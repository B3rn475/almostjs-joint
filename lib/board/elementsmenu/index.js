// Copyright (c) 2016, the ALMOsT project authors. Please see the
// AUTHORS file for details. All rights reserved. Use of this source code is
// governed by the MIT license that can be found in the LICENSE file.
/*jslint node: true, nomen: true */
"use strict";

var _ = require('lodash'),
    $ = require('jquery');

function ElementsMenu(options) {
    if (!(this instanceof ElementsMenu)) { return new ElementsMenu(options); }
    options = options || {};

    if (!options.container) { throw new Error('container option is mandatory'); }
    if ($(options.container).length === 0) { throw new Error('invalid container option'); }
    if (!options.template) { throw new Error('template option is mandatory'); }
    if (typeof options.template !== 'string') { throw new Error('invalid template option'); }
    if ($(options.template).length === 0) { throw new Error('invalid template option'); }
    if (!Array.isArray(options.builders)) { throw new Error('builders options is mandatory'); }
    if (!options.createItemDragger) { throw new Error('createItemDragger option is Mandatory'); }
    if (typeof options.createItemDragger !== 'function') { throw new Error('invalid createItemDragger option'); }
    if (typeof options.width !== 'number') { throw new Error('width option is mandatory and has to be a number'); }
    if (options.minHeight !== undefined && typeof options.minHeight !== 'number') { throw new Error('width option is mandatory and has to be a number'); }
    if (options.padding !== undefined && typeof options.padding !== 'number') { throw new Error('width option is mandatory and has to be a number'); }

    var container = $(_.head($(options.container))),
        builders = options.builders,
        createItemDragger = options.createItemDragger,
        template = $(options.template),
        width = options.width,
        minHeight = options.minHeight || 50,
        padding = options.padding || 0;

    if (padding < 0) { throw new Error('padding cannot be less than zero'); }
    if (width < 2 * padding) { throw new Error('width cannot be less than zero (or 2 time padding)'); }
    if (minHeight < 2 * padding) { throw new Error('minHeight cannot be less than zero (or 2 time padding)'); }

    _.each(builders, function (builder) {
        var item = template.clone();
        container.append(item);
        if (!item.hasClass('almost-place-holder')) {
            item = item.find('.almost-place-holder');
        }
        createItemDragger({el: item, createElements: builder, width: width, minHeight: minHeight, padding: padding});
    });
}

exports.ElementsMenu = ElementsMenu;
