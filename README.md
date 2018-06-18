# almostjs-joint
__ALMOsT__ is an **A**gi**L**e **MO**del **T**ransformation framework for JavaScript

[![NPM Version][npm-image]][npm-url]
[![MIT licensed][license-image]][license-url]

__ALMOsT_Joint__ is an opinionated plug-in for [JointJs][joint-url] which facilitates the development of __Model Editors__.

__ALMOsT_Joint__ is built on top of __JointJs__ concepts like:
 - __Graph__: the structure of the diagram [see][joint-graph-url]
 - __Cell__: a component of the diagram [see][joint-cell-url]
 - __Element__: a __Cell__ with position, size and a graphical representation  [see][joint-element-url]
 - __Link__: a __Cell__ with a line-ish graphical representation (line, arrow, ...) connecting two elements [see][joint-link-url]

It just adds the concept of __Board__, an abstraction over the [Paper][joint-paper-url] concept in __JoinJs__ which provides you a set of functionalities out of the box.

The minimum required code is the following:
```JavaScript
var model = new joint.dia.Graph(),
var board = almost.plugins.joint.createBoard({
    el: '#board',
    model: model
});
```
This will create a __Graph__ and initialize a board.

The `createBoard` constructor function has the following options:
- `el: [dom node, jquery collection, a jquery selector string]` the dom element in the page where the board will be created.
- `model: [joint.dia.Graph]` the __Graph__ which contains the displayed diagram.
- _optional_ `isValidParent: [function (elementView, parentElementView)]` a function which validates the parent/child relationship between elements, a negative response will reject the previous operation by the user.
  The __parent__ can be `undefined` if the element is in a free area of the __Board__, at least one element must have no parent.
- _optional_ `defaultLink: [function (elementView, magnet)]` this function serves the same functionality as the [JointJs counterpart][joint-defaultlink-url].

[npm-image]: https://img.shields.io/npm/v/almost-joint.svg
[npm-url]: https://npmjs.org/package/almost-joint
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://raw.githubusercontent.com/B3rn475/almostjs-joint/master/LICENSE
[joint-url]: https://jointjs.com
[joint-graph-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Graph
[joint-cell-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Cell
[joint-element-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Element
[joint-link-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Link
[joint-paper-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Paper
[joint-defaultlink-url]: http://resources.jointjs.com/docs/jointjs/v2.1/joint.html#dia.Paper.prototype.options.defaultLink
