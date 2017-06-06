'use strict';

/**
 * Dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * siacoin Schema.
 *
 * @see http://mongoosejs.com/docs/guide.html - For basic schema information.
 * @see http://mongoosejs.com/docs/schematypes.html - For schema type information.
 */
var siacoinSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
});

mongoose.model('siacoin', siacoinSchema);
