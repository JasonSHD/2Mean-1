/**
 * Database handle.
 */
var mongoose = require('mongoose');

/**
 * User model.
 */
var Users = mongoose.model('User');

/**
 * Key model.
 */
var Keys = mongoose.model('Keys');

/**
 * Q promise library.
 */
var q = require('q');

/**
 * Main business logic for handling requests.
 */
function authenticationModule(logger) {
  // Key, 8 hours TTL
  var keyTTL = 1000 * 60 * 60 * 8;

  // Check if Database has been populated yet.  If not, inject default user.
  Users.count({}, (err, c) => {
    if (c < 1) {
      let newUser = new Users();
      logger.info('Users collection is empty, adding default user...');

      newUser.firstName = 'Admin';
      newUser.lastName = 'User';
      newUser.displayName = 'Squarehook';
      newUser.email = 'support@squarehook.com';
      newUser.username = 'squarehook';
      newUser.password = '12345';
      newUser.roles = [ 'user', 'admin' ];

      newUser.save((err, data) => {
        if (err) {
          logger.error(err);
        }
      });
    }
  });

  // --------------------------- Public Function Definitions ----------------------------

  /**
   * Validation for API keys.  Will store the user in req.user and the apikey details in req.auth.
   */
  function validateAPIKey(req, res, next) {
    if (!req.cookies || !req.cookies.apikey) {
      return res.status(400).send('Unauthorized');
    }

    Keys.findOne({value: req.cookies.apikey})
      .then((data) => {
        // Store auth information for downstream logic.
        req.auth = data;

        // Look up user.
        Users.findOne({_id: data.user})
          .then((user) => {
            // Store user for downstream logic.
            req.user = user;
            return next();
          }, (err) => {
            if (err) {
              logger.error('Authenteication error looking up user referenced in key', err);
            }
          });
      }, (error) => {
        logger.error('Authentication error looking up a key', error);
        return res.status(400).send('Unauthorized');
      });
  }


  /**
   * The main login logic.
   */
  function login(req, res, next) {
    var deferred = q.defer();
    var creds = req.body;
    logger.info('Login Request found');

    if (!creds.username || !creds.password) {
      deferred.reject({
        code: 400,
        error: 'Username or Password missing!'
      });
    } else {
      Users.findOne({username: creds.username})
        .then((user) => {
          // Create new key (even if valid one exists).
          let key = new Keys();

          let apikey = {
            value: createKey(16),
            created: new Date()
          };

          if (creds.password !== user.password) {
            deferred.reject({
              code: 401,
              error: 'Incorrect Username/Password'
            });
          }

          // Remove the old key from the Keys collection.
          if (user.apikey && user.apikey.value) {
            Keys.findOne({value: user.apikey.value})
              .then((data) => {
                data.remove();
              }, (err) => {
                logger.error('Error finding old key to remove', err);
              });
          }

          // Update users reference to the key.
          user.apikey.value = apikey.value;
          user.apikey.created = apikey.created;

          user.save((err, data) => {
            if (err) {
              logger.error(err);
            }
          });

          // Save the new key.
          key.value = apikey.value;
          key.created = apikey.created;
          key.user = user._id;
          key.roles = user.roles;

          key.save((err, data) => {
            if (err) {
              logger.error(err);
            }
          });

          deferred.resolve({
            code: 200,
            data: {
              apikey: user.apikey.value,
              user: sanitizeUser(user)
            }
          });
        }, (error) => {
          logger.error('Auth Module error: Hit error querying for user.', error);

          deferred.reject({
            code: 500,
            error: 'Error retrieving user information.'
          });
        });
    }

    deferred.promise.then((data) => {
      // TODO !!!! This needs to be set to environment vars.
      res.cookie('apikey', data.data.apikey, {
        expires: new Date(Date.now() + keyTTL),
        domain: 'localhost'
      });

      res.status(data.code).send(data.data);
    }, (error) => {
      logger.error('Error resolving Auth request', error);
      res.status(error.code).send(error.error);
    });
  }

  function getUserInfo(req, res, next) {

  }

  // --------------------------- Private Function Definitions ----------------------------

  /**
   * Given a key object, checks that it is still a valid key or not.
   *
   * @param {object} key The key object from the user model.
   *
   * @return {boolean}
   */
  function isKeyExpired(key) {
    var timeElapsed;

    if (!key) {
      return true;
    }

    timeElapsed = (new Date()).getTime() - key.created.getTime();

    // Check if key is expired.
    if (timeElapsed > keyTTL) {
      return true;
    }

    return false;
  }

  /**
   * Generates a key of specified length.
   *
   * @param {number} len The length of the key to generate.
   *
   * @return {string} The key.
   */
  function createKey(len) {
    var buf = []
      , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      , charlen = chars.length;

    for (var i = 0; i < len; ++i) {
      buf.push(chars[Math.random() * charlen | 0]);
    }

    return buf.join('');
  };

  /**
   * Given a full user object, this will return an object without the sensitive parts.
   *
   * @param {Users} user The mongoose Users object representing the user.
   *
   * @return {Object} A generic object stripped of the sensitive parts.
   */
  function sanitizeUser(user) {
    return {
      id: user._id,
      apikey: user.apikey,
      created: user.created,
      displayName: user.displayName,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageURL: user.profileImageURL,
      roles: user.roles,
      username: user.username
    }
  }

  // --------------------------- Revealing Module Section ----------------------------

  return {
    login: login,
    getUserInfo: getUserInfo,
    validateAPIKey: validateAPIKey
  }
};

module.exports = authenticationModule;
