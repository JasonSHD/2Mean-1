var mongoose = require('mongoose');

var q = require('q');

var _ = require('lodash');

var siacoin = mongoose.model('siacoin');

var https = require('https');

function siacoinController(logger) {
  const GET_LIMIT = 10;

  /**
   * Create a siacoin.
   *
   * @param {Request}  req The Express request Object.
   * @param {Response} res The Express response Object.
   *
   * @return {Response}
   */
  function create(req, res) {
    var model = mapBodyToModel(req.body);
    
    var siacoinSearch = findsiacoinByName(model.name);

    // Make sure this isn't actually an update.
    siacoinSearch.then((results) => {
      if (results) {
        return res.status(400).send('siacoin exists');
      } else {
        logger.info('Creating siacoin ' + model.name);

        model.save(function(err) {
          if (err) {
            // TODO: This is not a specific error, but the whole mongoose error object.
            logger.error(err);

            return res.status(500).send('Internal Server Error');
          } else {
            return res.status(200).json(model);
          }
        });
      }
    });
  };


  /**
   * Show the siacoin determined by the id in the URI.
   *
   * @param {Request}  req The Express request Object.
   * @param {Response} res The Express response Object.
   *
   * @return {Response}
   */
  function readById(req, res) {
    var user = req.user;

    var siacoinId = req.params.siacoinId;

    findsiacoinById(siacoinId).then((result) => {
      return res.status(200).send(result);
    },(err) => {
      logger.error('Error looking up siacoin: ', err);

      return res.status(500).send('Internal Server Error');
    });
  };

  /**
   * Show a list of siacoin.
   *
   * @param {Request}  req The Express request Object.
   * @param {Response} res The Express response Object.
   *
   * @return {Response}
   */
  function list(req, res) {
    var user = req.user;

    var page = req.params.page;

    if (!page) {
      page = 1;
    }

    // Fire the main list query.
    siacoin
      .find({})
      .select({'name': 1})
      .sort({
        name: 1
      })
      .limit(GET_LIMIT)
      .skip(GET_LIMIT * (page - 1))
      .exec((err, results) => {
        if (err) {
          logger.error('Error retreiving list of organizations: ', err.errmsg);

          res.status(500).send('Internal Server Error');
        }

        res.status(200).send(results);
      });
  }

  /**
   * Update a siacoin.
   *
   * @param {Request}  req The Express request Object.
   * @param {Response} res The Express response Object.
   *
   * @return {Response}
   */
  function update(req, res) {
    var body = mapBodyToModel(req.body);
    
    var user = req.user;

    var model = findsiacoinById(req.body._id);

    // Make sure user has permissions to update this company.
    isAuthorized(user, req.body._id)
      .then((authorized) => {
        if (authorized) {
          model.exec((err, result) => {
            mapOverModel(body, result);

            result.save((err) => {
              if (err) {
                // TODO: This is not a specific error, but the whole mongoose error object.
                logger.error('Error updating organization', err);

                return res.status(500).send('Internal Server Error');
              }
              return res.status(200).send({data: result._id + ' updated'});
            });
          });
        } else {
          logger.info('Unauthorized attempt to modify an siacoin');
          res.status(401).send('Unauthorized');
        }
      }, (error) => {
        // TODO: This is not a specific error, but the whole mongoose error object.
        logger.error('Error finding out if user is authorized to modify organization: ', error);

        res.status(500).send('Internal Server Error');
      });
  };

  /**
   * Delete a siacoin
   *
   * @param {Request}  req The Express request Object.
   * @param {Response} res The Express response Object.
   *
   * @return {Response}
   */
  function deletesiacoin(req, res) {
    var modelId = req.params.siacoin;

    siacoin.findOne({_id: modelId})
      .exec((err, result) => {
        if (err) {
          logger.info('Error finding target siacoin to delete.', err.errmsg);

          return res.status(500).send('Internal Server Error');
        }

        result.remove(function(err) {
        if (err) {
          // This needs more robust error handling.
          logger.error('Error deleting siacoin', err.errmsg);

          return res.status(500).send('Internal Server Error');
        } else {
          res.status(200).send(result);
        }
      });
    });
  };

  /**
   * Pulls basic stats on a given nanopool address
   */
  function getStats(request, response) {
    let walletAddr = request.params.wallet || null;

    if (!walletAddr) {
      return response.status(400).send({error: 'Wallet Address is required'});
    }

    let options = {
      hostname: 'api.nanopool.org',
      port: 443,
      path: '/v1/sia/hashrate/' + walletAddr
    };

    let req = https.get(options, (res) => {
      let data = '';
      console.log('Data: ' + data);

      res.on('data', (d) => {
        data += d;
      });

      res.on('end', (c) => {
        response.status(200).send(data);
      });
    })
    .on('error', (e) => {
      logger.error('Error getting siacoin stats', e);
    });

    req.end();
  }

  /*
   * ------------------------------ Private Methods -----------------------------------
   */

  /**
   * Find an siacoin by it's Id.
   *
   * @param {string} id The id to search for.
   *
   * @param {siacoin} The mongoose model.
   */
  function findsiacoinById(id) {
    var deferred = q.defer();

    return siacoin.findOne({'_id': id});
  }

  /**
   * Checks if an siacoin exists given a name.
   *
   * @param {string} name The name of the siacoin to search for.
   *
   * @return {siacoin} The siacoin that matched or null if none did.
   */
  function findsiacoinByName(name) {
    var deferred = q.defer();

    siacoin.find({'name': name})
      .exec((err, results) => {
        if (err) {
          logger.error('Error finding organizations by name', err.errmsg);

          deferred.reject(err.errmsg);
        }
        if (results.length > 0) {
          deferred.resolve(results[0]);
        } else {
          deferred.resolve([]);
        }
      });

    return deferred.promise;
  }

  /**
   * Maps request siacoin data to a siacoin mongoose object.
   *
   * Validation, outside of what mongoose enforces, is not done!
   *
   * @param {Object} body The post vars from the request.
   *
   * @return {siacoin}
   */
  function mapBodyToModel(body) {
    var org = new siacoin();
    var schemaFields = siacoin.schema.obj;
    var index;

    if (body._id) {
      org._id = body._id;
    }

    for(index in Object.keys(schemaFields)) {
      let realIndex = Object.keys(schemaFields)[index];
      if (body[realIndex]) {
        org[realIndex] = body[realIndex];
      }
    }

    return org;
  }

  /**
   * Maps request siacoin over an existing siacoin mongoose object.
   *
   * @param {Object} The post vars from the request.
   * @param {siacoin} The mongoose object to copy the data to.
   *
   * @return {void}
   */
  function mapOverModel(body, org) {
    var schemaFields = siacoin.schema.obj;
    var index;

    for(index in Object.keys(schemaFields)) {
      let realIndex = Object.keys(schemaFields)[index];
      if (body[realIndex]) {
        org[realIndex] = body[realIndex];
      }
    }
  }

  /*
   * Hook for overriding permissions set by the Role Manager.
   *
   * @param {User}    user      The mongoose user object for the current user making the request.
   * @param {string}  resource  The resource being requested.
   *
   * @return {boolean}
   */
  function isAuthorized(user, resource) {
    // TODO: Currently set to deny any request not approved by the resource manager.
    return false;
  }

  return {
    read          : readById,
    create        : create,
    update        : update,
    list          : list,
    delete        : deletesiacoin,
    isAuthorized  : isAuthorized,
    getStats      : getStats
  };
}

module.exports = siacoinController;
