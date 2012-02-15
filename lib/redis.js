var redis = require("redis");
var async = require('async');

var Queue = function( port, host ){
    var self = this;
    self.client = redis.createClient( port || 6379, host || '127.0.0.1' );
    self.client.select(12);
    self.client.on('ready', function(){
        self.client.select(12);
    })
};

Queue.prototype.enqueue = function(queue, task){
    this.client.lpush( queue, JSON.stringify( task ) );
};

Queue.prototype.dequeue = function(queue, cb){
    var self = this;
    this.client.rpop(queue, function (err, obj){
        try {
            cb( JSON.parse( obj ) );
        } catch (e){
            console.log( e );
            process.nextTick(function () {
                self.dequeue( queue, cb );
            });
        }
    });
};

Queue.prototype.flush = function(queue){
    this.client.del(queue);
};

Queue.prototype.state = function(callback){
    var self = this;
    this.client.keys('*', function(err, result){
        async.map(result, function(key, cb){
            self.client.llen(key, function(e, r){
                cb(undefined, {queue:key, length:r});
            });
        }, function(e, results){
            var result = {};
            results.forEach(function(c){
                result[ c.queue ] = { length: c.length };
            });
            callback( result );
        });
    });
};

Queue.prototype.length = function(queue, cb){
    this.client.llen(queue, function (err, obj){
        cb(obj || 0);
    });
};

module.exports = Queue;