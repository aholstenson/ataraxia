'use strict';
module.exports.AbstractTransport = require('./abstract');
module.exports.Peer = require('./peer');
module.exports.addPeer = module.exports.AbstractTransport.addPeer;
module.exports.events = module.exports.AbstractTransport.events;
