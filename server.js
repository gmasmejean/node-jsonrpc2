
// JSONRPC2 ERRORS.
var E = {
    // STANDARD ERRORS
    PARSE_ERROR:{code:-32700,message:'Parse error',data:'An error occurred on the server while parsing the JSON text.'},
    INVALID_REQUEST:{code:-32600,message:'Invalid Request',data:'The JSON sent is not a valid request object.'},
    METHOD_NOT_FOUND:{code:-32601,message:'Method not found',data:'This method not exist/not available.'},
    INVALID_PARAMS:{code:-32602,message:'Invalid params',data:'Invalid method parameters'},
    INTERNAL_ERROR:{code:-32603,message:'Internal error',data:'Internal JSON-RPC error'},    
    // SPECIFIC ERRORS:
    HTTP_METHOD_NOT_ALLOWED:{code:-32099,message:'Server error',data:'This HTTP Method is not allowed.'},
    UNCAUGHT_ERROR:{code:-32098,message:'Server error',data:'Uncaught Error...'},
    NOT_AUTHORIZED:{code:-32097,message:'Server error',data:'Not authorized'}
};

var ucfirst = function(s){ return s[0].toUpperCase()+s.slice(1); };

var extend = function( a, b){
    Object.keys(b).forEach(function(k){ a[k] = b[k]; });
    return a;
};

var error = function( err, id, data ){
    return {jsonrpc:"2.0",error:{code:err.code,message:err.message,data:data||err.data},id:id||null};
};

var result = function( result, id ){
    return {jsonrpc:"2.0",result:result,id:id||null};
};

var server = function(config){
    this.methods = {};
    this.config = extend({},this.config,config);
    this.handle = this.handle.bind(this);
};

server.prototype.errors = E;

server.prototype.config = {
    http_methods:['POST'],
    headers:{}
};

server.prototype.handle = function( request, response ){
    if( this.config.http_methods.indexOf(request.method) !== 1 ){
        if( this.config.hasAuthorization && !this.config.hasAuthorization(request).bind(this) ){
            this.sendResponse( request, response, error(E.NOT_AUTHORIZED) );
        }
        this.handleRequest( request, response);
    }else{
        this.sendResponse( request, response, error(E.HTTP_METHOD_NOT_ALLOWED) );
    }
};

server.prototype.sendResponse = function( request, response, out){
    var output = JSON.stringify(out),
        header = extend({'Content-Type':'application/json','Content-Length':output.length},this.config.headers);
    
    response.writeHead(200,header);
    response.write(output, function(){
        response.end();
    });
};

server.prototype.handleRequest = function( request, response){
    var buffer='';
    
    request.setEncoding('utf8');
    request.on('data', function(chunk){ buffer += chunk; });
    request.on('end', function() {
        this.process(buffer, this.sendResponse.bind(this,request,response));
    }.bind(this));
};

server.prototype.process = function( buffer, callback ){    
    var rpcRequest;
    try{
        rpcRequest = JSON.parse(buffer);
    }catch( e ){
        callback( error(E.PARSE_ERROR) );
    }
    
    if( typeof rpcRequest !== 'object' || !rpcRequest.method 
        || typeof rpcRequest.method !== 'string' || rpcRequest.jsonrpc !== '2.0' ){
        return callback( error(E.INVALID_REQUEST) );
    }
    
    if( !this.methods[ rpcRequest.method ]  ){
        return callback( error(E.METHOD_NOT_FOUND,rpcRequest.id) );
    }
    
    if( this.methods[rpcRequest.method].params 
        && !this.checkParameter( this.methods[rpcRequest.method].params, rpcRequest.params ) ){
        return callback( error(E.INVALID_PARAMS,rpcRequest.id) );
    }
    
    this.methods[rpcRequest.method].callback( rpcRequest.params, function(err,res){ 
        if( err ){
            return callback( error(err,rpcRequest.id) );
        }else{
            return callback( result(res,rpcRequest.id) );
        }
    });
};

server.prototype.getType = function(o){
    return Object.prototype.toString.call(o);
};

server.prototype.checkParameter = function( rules, param ){
    if( param === undefined || param === null ){
        return !!rules.optional;
    }
    
    if( typeof(rules.value) === 'string' ){
        if( this.getType(param) !== '[object '+ucfirst(rules.value)+']' )
            return false;
    }else{
        if( this.getType(param) !== this.getType(rules.value) )
            return false;
        
        if( rules.value instanceof Array ){
            return !rules.value.some(function( v, i ){
                return !this.checkParameter( v, param[i] );
            }.bind(this));
        }else{
            return !Object.keys(rules.value).some(function(k){
                return !this.checkParameter(rules.value[k], param[k]);
            }.bind(this));
        }
    }
    return true;
};

server.prototype.exposeMethod = function( method, callback, params ){
    if( method && typeof method === 'string' && typeof callback === 'function' ){
        if( params && this.getType(params)!=='[object Object]' )
            return false;
        this.methods[ method ] = { callback:callback,params:params };
    }
};

module.exports = server;
