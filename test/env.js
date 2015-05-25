'use strict';

var should = require('should');
var quick = require('../lib');
var P = quick.Promise;
P.longStackTraces();
var logger = quick.logger.getLogger('test', __filename);

var env = {};

Object.defineProperty(env, 'dbConfig', {
    get : function(){
        return {
            shardId : 's1',
            backend : {engine : 'mongodb', url : 'mongodb://localhost/quick-pomelo-test'},
            locking : {host : '127.0.0.1', port : 6379, db : 1},
            event : {host : '127.0.0.1', port : 6379, db : 1},
            slave : {host : '127.0.0.1', port : 6379, db : 1},
            modelsPath : 'lib/models',
        };
    }
});

env.dropDatabase = function(dbConfig, cb){
    if(typeof(dbConfig) === 'function'){
        cb = dbConfig;
        dbConfig = env.dbConfig;
    }

    logger.debug('start dropDatabase');
    return P.try(function(){
        return env.dropRedis(dbConfig.locking);
    })
    .then(function(){
        return env.dropRedis(dbConfig.event);
    })
    .then(function(){
        return env.dropRedis(dbConfig.slave);
    })
    .then(function(){
        return env.dropMongo(dbConfig.backend);
    })
    .then(function(){
        logger.debug('done dropDatabase');
    })
    .nodeify(cb);
};

env.dropRedis = function(redisConfig){
    var client = require('redis').createClient(redisConfig.port, redisConfig.host);
    client.select(redisConfig.db);
    return P.try(function(){
        return P.promisify(client.flushdb, client)();
    })
    .then(function(){
        client.quit();
    });
};

env.dropMongo = function(mongoConfig){
    var db = null;
    return P.try(function(){
        var client = require('mongodb').MongoClient;
        return P.promisify(client.connect, client)(mongoConfig.url, mongoConfig.options);
    })
    .then(function(ret){
        db = ret;
        return P.promisify(db.dropDatabase, db)();
    })
    .then(function(){
        return P.promisify(db.close, db)();
    });
};

module.exports = env;
