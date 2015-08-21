# node-jsonrpc2

Module to build an object exposing:
 - a node http server handler method.
 - a jsonRPC2 method attacher.

Usage:
```
var jsonRPC2 = new (require('server.js'))(),
    httpServer = require('http').createServer( jsonRPC2.handle );
    
// Expose a method to JSONRPC Server ( method, callback, paramsDefinition )    
jsonrpcServer.exposeMethod(
    'send.message',
    function(params, next){
        // params contains jsonRPC2 request parameters
        ... Your stuff here ... 
        next( error, result );
    },
    {
        value:{
            message:{value:'string',optional:false},
            author:{value:'object',optional:false},
            private:{value:'boolean',optional:true},
            id:{value:'number'},
            receivers:{value:'array'}
        },
        optional: false,
    }
);

// Configuring HTTP Server
httpServer.listen( c.port );
```
