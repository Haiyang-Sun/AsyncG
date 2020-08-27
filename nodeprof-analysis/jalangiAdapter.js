// DO NOT INSTRUMENT

J$ ={
    adapter: nodeprofAdapter,
};

let GLOBAL = this;

J$.deprecatedIIDUsed = false;
/*
 * J$.nativeLog(msg, logLevel)
 * - print the message string using the logger (i.e., System.out/err) inside the engine
 * - default log level is INFO
 * - consider using this function instead of console.log in the analysis in case you
 *   want to dump messages while instrumenting some internal library or builtins
 */
J$.nativeLog = function(str, logLevel) {
    J$.adapter.nativeLog(...arguments);
}
J$.nativeLog.DEBUG = 0;
J$.nativeLog.INFO = 1;
J$.nativeLog.WARNING = 2;
J$.nativeLog.ERROR = 3;
J$.iidToLocation = function(iid, _deprecatedIID){
    if(_deprecatedIID) {
        if(!J$.deprecatedIIDUsed){
            J$.deprecatedIIDUsed = true;
            console.trace("Warning! In NodeProf, iidToLocation only needs the iid (without sid). The iids as you get from the callbacks are unique across files.");
        }
        return J$.adapter.iidToLocation(_deprecatedIID);
    }
    return J$.adapter.iidToLocation(iid);
};
J$.iidToSourceObject = function(iid) {
    return J$.adapter.iidToSourceObject(iid);
}
J$.iidToCode = function(iid) {
    return J$.adapter.iidToCode(iid);
}
J$.getGlobalIID = function(iid) {
    return iid;
};
J$.enableAnalysis = function() {
    return J$.adapter.instrumentationSwitch(true);
}
J$.disableAnalysis = function() {
    return J$.adapter.instrumentationSwitch(false);
}

/**
 * divide the analysis into different events
 */
J$.unsupportedCallbacks = ["forinObject",
    "instrumentCodePre", "instrumentCode", 
    "onReady", 
    "runInstrumentedFunctionBody", "scriptEnter", "scriptExit", "_throw", "_with"];
J$.ignoredCallbacks = [
    "endExecution"
];
J$.todo = ["newSource"];
J$.extraCallbacks = ["builtinEnter", "builtinExit", "evalPre", "evalPost", "evalFunctionPre", "evalFunctionPost", "awaitPre", "awaitPost", "asyncFunctionEnter", "asyncFunctionExit", "startStatement", "endStatement"];
J$.supportedCallbacks = ["functionEnter", "functionExit", "invokeFunPre", "invokeFun", "literal", "declarePre", "declare", "read", "write", "getFieldPre", "getField", "putFieldPre", "putField", "unaryPre", "unary", "binaryPre", "binary", "conditional", "forObject", "_return", "startExpression", "endExpression"];

J$.endExecution = function(){
    for(var i = 0; i < J$.analyses.length; i++){
        var analysis = J$.analyses[i];
        if(analysis.endExecution && (typeof analysis.endExecution == 'function')){
            analysis.endExecution();
        }
    }
}

// old-style Jalangi analysis
Object.defineProperty(J$, 'analysis', {
    get:function () {
        return J$.analyses;
    },
    set:function (a) {
        J$.addAnalysis(a);
    }
});

J$.addAnalysis = function(analysis, config) {
    if (!analysis)
        return;
    let convertedAnalysis = {};
    for (let event of ['unary', 'binary', 'var_read', 'var_write', 'property_read', 'property_write', 'element_read', 'element_write', 'invoke', 'new', 'literal', 'declare', 'root', 'expression', 'cf_branch', 'builtin', 'cf_root', 'cf_block', 'eval', 'statement', 'return', 'await']) {
        switch (event) {
            case 'unary': {
                if (analysis.unaryPre || analysis.unary) {
                    convertedAnalysis.unary = {};
                    if (analysis.unaryPre) {
                        convertedAnalysis.unary.pre = (iid, operator, operand) => {
                            analysis.unaryPre(iid, operator, operand);
                        }
                    }
                    if (analysis.unary) {
                        convertedAnalysis.unary.post = (iid, operator, operand, result) => {
                            analysis.unary(iid, operator, operand, result);
                        }
                    }
                }
                break;
            }
            case 'binary': {
                if (analysis.binaryPre || analysis.binary || analysis.conditional) {
                    convertedAnalysis.binary = {};
                    if (analysis.binaryPre) {
                        convertedAnalysis.binary.pre = (iid, op, left, right) => {
                            if (op != '||' && op != '&&') {
                                analysis.binaryPre(iid, op, left, right);
                            }
                        }
                    }
                    if (analysis.binary || analysis.conditional) {
                        convertedAnalysis.binary.post = (iid, op, left, right, result) => {
                            if (op == '||' || op == '&&') {
                                if (analysis.conditional) {
                                    analysis.conditional(iid, result);
                                }
                            } else if (analysis.binary) {
                                analysis.binary(iid, op, left, right, result);
                            }
                        }
                    }
                }
                break;
            }
            case 'var_read': {
                if (analysis.read) {
                    convertedAnalysis.var_read = {};
                    convertedAnalysis.var_read.post = (iid, name, value) => {
                        analysis.read(iid, name, value, false);
                    }
                }
                break;
            }
            case 'var_write': {
                if (analysis.write) {
                    convertedAnalysis.var_write = {};
                    convertedAnalysis.var_write.post = (iid, name, value) => {
                        analysis.write(iid, name, value, undefined, false);
                    }
                }
                break;
            }
            case 'property_read': {
                if (analysis.read || analysis.getField || analysis.getFieldPre) {
                    convertedAnalysis.property_read = {};
                    if (analysis.getFieldPre) {
                        convertedAnalysis.property_read.pre = (iid, receiver, name) => {
                            if (receiver != GLOBAL) {
                                analysis.getFieldPre(iid, receiver, name, false);
                            }
                        };
                    }
                    if (analysis.getField || analysis.read) {
                        convertedAnalysis.property_read.post = (iid, receiver, name, value) => {
                            if (receiver == GLOBAL) {
                                if (analysis.read) {
                                    analysis.read(iid, name, value, true);
                                }
                            } else {
                                if (analysis.getField) {
                                    analysis.getField(iid, receiver, name, value, false);
                                }
                            }
                        }
                    }
                }
                break;
            }
            case 'property_write': {
                if (analysis.write || analysis.putField || analysis.putFieldPre) {
                    convertedAnalysis.property_write = {};
                    if (analysis.putFieldPre) {
                        convertedAnalysis.property_write.pre = (iid, receiver, name, val) => {
                            if (receiver != GLOBAL) {
                                analysis.putFieldPre(iid, receiver, name, val, false);
                            }
                        };
                    }
                    if (analysis.putField || analysis.write) {
                        convertedAnalysis.property_write.post = (iid, receiver, name, value) => {
                            if (receiver == GLOBAL) {
                                if (analysis.write) {
                                    analysis.write(iid, name, value, true);
                                }
                            } else {
                                if (analysis.putField) {
                                    analysis.putField(iid, receiver, name, value, false);
                                }
                            }
                        }
                    }
                }
                break;
            }
            case 'element_read': {
                if (analysis.getField || analysis.getFieldPre) {
                    convertedAnalysis.element_read = {};
                    if (analysis.getFieldPre) {
                        convertedAnalysis.element_read.pre = (iid, receiver, name) => {
                            analysis.getFieldPre(iid, receiver, name, true);
                        };
                    }
                    if (analysis.getField) {
                        convertedAnalysis.element_read.post = (iid, receiver, name, value) => {
                            analysis.getField(iid, receiver, name, value, true);
                        }
                    }
                }
                break;
            }
            case 'element_write': {
                if (analysis.putField || analysis.putFieldPre) {
                    convertedAnalysis.element_write= {};
                    if (analysis.putFieldPre) {
                        convertedAnalysis.element_write.pre = (iid, receiver, name, val) => {
                            analysis.putFieldPre(iid, receiver, name, val, true);
                        };
                    }
                    if (analysis.putField) {
                        convertedAnalysis.element_write.post = (iid, receiver, name, value) => {
                            analysis.putField(iid, receiver, name, value, true);
                        }
                    }
                }
                break;
            }
            case 'new': 
            case 'invoke': {
                if (analysis.invokeFunPre || analysis.invokeFun) {
                    convertedAnalysis.invoke = {};
                    convertedAnalysis.new = {};
                    if (analysis.invokeFunPre) {
                        convertedAnalysis.new.pre = convertedAnalysis.invoke.pre = (iid, func, receiver, isNew, isInvoke, numArgs, ...args) => {
                            let jalangiArgs = args;
                            if (numArgs != args.length) {
                                if (isNew)
                                    [, ...jalangiArgs] = args[0];
                                else
                                    [, , ...jalangiArgs] = args[0];
                            }
                            analysis.invokeFunPre(iid, func, receiver, jalangiArgs, isNew, isInvoke);
                        }
                    }
                    if (analysis.invokeFun) {
                        convertedAnalysis.new.post = convertedAnalysis.invoke.post = (iid, func, receiver, result, isNew, isInvoke, numArgs, ...args) => {
                            let jalangiArgs = args;
                            if (numArgs != args.length) {
                                if (isNew)
                                    [, ...jalangiArgs] = args[0];
                                else
                                    [, , ...jalangiArgs] = args[0];
                            }
                            // assert (jalangiArgs.length == numArgs)
                            analysis.invokeFun(iid, func, receiver, jalangiArgs, result, isNew, isInvoke);
                        }
                    }
                }
                break;
            }
            case 'literal': {
                if (analysis.literal) {
                    let set = undefined;
                    if (analysis.literal.types) {
                        set = new Set();
                        analysis.literal.types.forEach(set.add, set);
                    }
                    convertedAnalysis.literal = {};
                    convertedAnalysis.literal.post = (iid, type, val) => {
                        if (!set || set.has(type)) {
                            analysis.literal(iid, val, undefined, type);
                        }
                    };
                }
                break;
            }
            case 'declare': {
                if (analysis.declarePre || analysis.declare) {
                    convertedAnalysis.declare = {};
                    if (analysis.declarePre) {
                        convertedAnalysis.declare.pre = (iid, name, type, kind) => {
                            analysis.declarePre(iid,name,type,kind?"FunctionDeclaration":undefined);
                        }
                    }
                    if (analysis.declare) {
                        convertedAnalysis.declare.post = (iid, name, type, kind) => {
                            analysis.declare(iid,name,type,kind?"FunctionDeclaration":undefined);
                        }
                    }
                }
                break;
            }
            case 'root': {
                if (analysis.functionEnter || analysis.functionExit) {
                    convertedAnalysis.root = {};
                    if (analysis.functionEnter) {
                        convertedAnalysis.root.pre = (iid, func, receiver, numArgs, ...args) => {
                            let jalangiArgs = args;
                            if (numArgs != args.length) {
                                [, , ...jalangiArgs] = args[0];
                            }
                            analysis.functionEnter(iid, func, receiver, jalangiArgs);
                        }
                    }
                    if (analysis.functionExit) {
                        convertedAnalysis.root.post = (iid, func, receiver, result, numArgs, ...args) => {
                            analysis.functionExit(iid, result);
                        }
                        convertedAnalysis.root.exceptional = (iid, wrappedException) => {
                            analysis.functionExit(iid, undefined, wrappedException);
                        }
                    }
                }
                break;
            }
            case 'expression': {
                if (analysis.startExpression || analysis.endExpression) {
                    convertedAnalysis.expression = {};
                    if (analysis.startExpression) {
                        convertedAnalysis.expression.pre = (iid, type) => {
                            analysis.startExpression(iid, type);
                        }
                    }
                    if (analysis.endExpression) {
                        convertedAnalysis.expression.post = (iid, type) => {
                            analysis.endExpression(iid, type);
                        }
                    }
                }
                break;
            }
            case 'return': {
                if (analysis._return) {
                    convertedAnalysis.return = {};
                    convertedAnalysis.return.pre= (iid, val) => {
                        analysis._return(iid, val);
                    }
                }
                break;
            }
            case 'builtin': {
                if (analysis.builtinEnter || analysis.builtinExit) {
                    convertedAnalysis.builtin = {};
                    if (analysis.builtinEnter) {
                        convertedAnalysis.builtin.pre = (name, func, receiver, numArgs, ...args) => {
                            let jalangiArgs = args;
                            if (numArgs != args.length) {
                                [, , ...jalangiArgs] = args[0];
                            }
                            analysis.builtinEnter(name, func, receiver, jalangiArgs);
                        }
                    }
                    if (analysis.builtinExit) {
                        convertedAnalysis.builtin.post = (name, func, receiver, ret, numArgs, ...args) => {
                            let jalangiArgs = args;
                            if (numArgs != args.length) {
                                [, , ...jalangiArgs] = args[0];
                            }
                            analysis.builtinExit(name, func, receiver, jalangiArgs, ret);
                        }
                        convertedAnalysis.builtin.exceptional = (name, exception) => {
                            // TODO
                            analysis.builtinExit(name, undefined, undefined, undefined, undefined, exception);
                        }
                    }
                }
            }
                // default:
                // console.log('todo event', event);
        }
    }

    // TODO, get back the config support
    nodeprofAdapter.addAnalysis(convertedAnalysis, config);
    // console.log(convertedAnalysis);
}

J$.getAstHelper = function() {
    const assert = require('assert');
    const util = require('util');
    const { esprima, estraverse } = require('./bundle.js');

    const helperObject = {
        logObjectLiteral(iid) {
            console.error('parsed ObjectLiteral:',
                util.inspect(
                    esprima.parseScript(`(${J$.iidToCode(iid)})`),
                    false, // showHidden
                    8 // depth
                ));
        },
        parseObjectLiteral(iid) {
            // assumed to be ObjectLiteral, parse as expression wrapped in `(...)`
            const ast = esprima.parseScript(`(${J$.iidToCode(iid)})`);

            let gs = false;
            let f = [];

            estraverse.traverse(ast, {
                enter: function(node) {
                    if (node.type === 'Property') {
                        if (node.computed) {
                            f.push('computed');
                        } else {
                            let prefix = '';
                            if (node.kind === 'get' || node.kind === 'set') {
                                gs = true;
                                prefix = node.kind + 'ter';
                            } else {
                                assert(node.kind === 'init');
                            }
                            assert(node.key.type === 'Literal' || node.key.type == 'Identifier');
                            const name = node.key.type === 'Literal' ? node.key.value : node.key.name;
                            f.push(`${prefix}-${name}`);
                        }
                        // don't parse any child nodes below this
                        this.skip();
                    }
                }
            });
            return { hasGetterSetter: gs, fields: f};
        }
    }

    return helperObject;
}

// read args
J$.initParams = {};

/**
 * @Deprecated J$ fields from Jalangi
 * Should try to avoid using them
 *
 */
(function (sandbox) {
    /* Constant.js */
    var Constants = sandbox.Constants = {};
    Constants.isBrowser = !(typeof exports !== 'undefined' && this.exports !== exports);
    var APPLY = Constants.APPLY = Function.prototype.apply;
    var CALL = Constants.CALL = Function.prototype.call;
    APPLY.apply = APPLY;
    APPLY.call = CALL;
    CALL.apply = APPLY;
    CALL.call = CALL;
    var HAS_OWN_PROPERTY = Constants.HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;
    Constants.HAS_OWN_PROPERTY_CALL = Object.prototype.hasOwnProperty.call;
    var PREFIX1 = Constants.JALANGI_VAR = "J$";
    Constants.SPECIAL_PROP = "*" + PREFIX1 + "*";
    Constants.SPECIAL_PROP2 = "*" + PREFIX1 + "I*";
    Constants.SPECIAL_PROP3 = "*" + PREFIX1 + "C*";
    Constants.SPECIAL_PROP4 = "*" + PREFIX1 + "W*";
    Constants.SPECIAL_PROP_SID = "*" + PREFIX1 + "SID*";
    Constants.SPECIAL_PROP_IID = "*" + PREFIX1 + "IID*";
    Constants.UNKNOWN = -1;
    var HOP = Constants.HOP = function (obj, prop) {
        return (prop + "" === '__proto__') || CALL.call(HAS_OWN_PROPERTY, obj, prop); //Constants.HAS_OWN_PROPERTY_CALL.apply(Constants.HAS_OWN_PROPERTY, [obj, prop]);
    };
    Constants.hasGetterSetter = function (obj, prop, isGetter) {
        if (typeof Object.getOwnPropertyDescriptor !== 'function') {
            return true;
        }
        while (obj !== null) {
            if (typeof obj !== 'object' && typeof obj !== 'function') {
                return false;
            }
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if (desc !== undefined) {
                if (isGetter && typeof desc.get === 'function') {
                    return true;
                }
                if (!isGetter && typeof desc.set === 'function') {
                    return true;
                }
            } else if (HOP(obj, prop)) {
                return false;
            }
            obj = obj.__proto__;
        }
        return false;
    };
    Constants.debugPrint = function (s) {
        if (sandbox.Config.DEBUG) {
            console.log("***" + s);
        }
    };
    Constants.warnPrint = function (iid, s) {
        if (sandbox.Config.WARN && iid !== 0) {
            console.log("        at " + iid + " " + s);
        }
    };
    Constants.seriousWarnPrint = function (iid, s) {
        if (sandbox.Config.SERIOUS_WARN && iid !== 0) {
            console.log("        at " + iid + " Serious " + s);
        }
    };

    var Config = sandbox.Config = {};

    /* Config.js */
    Config.DEBUG = false;
    Config.WARN = false;
    Config.SERIOUS_WARN = false;
    Config.MAX_BUF_SIZE = 64000;
    Config.LOG_ALL_READS_AND_BRANCHES = false;
    Config.ENABLE_SAMPLING = false;

})(J$);
