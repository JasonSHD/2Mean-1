var siacoinModel = require('./models/siacoin.model.js');

var siacoinCtrl = require('./controllers/siacoin.controller.js');

function siacoinModule([logger]) {
  var siacoinController = new siacoinCtrl(logger);

  return siacoinController;
}

module.exports = siacoinModule;
