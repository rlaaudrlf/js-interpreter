var fs = require("fs");
var esprima = require("esprima");

const UNDEFINED = Symbol("undefined");
const MAX_CALL_STACK = 100;
const VAR = "var";
const LET = "let";
const CONST = "const";

const Variable = (function() {
  function Variable(name, kind, value = UNDEFINED) {
    this.name = name;
    this.kind = kind;
    this.value = value;
  }

  return Variable;
})();

const Environment = (function() {
  function Environment() {
    this.variableEnvironment = {};
    this.blockEnvironment = [];
    this.currentIndex = 0;
  }

  function findValueFromSubEnvironment(environmentList, name) {
    for (let index = environmentList.length - 1; index >= 0; index--) {
      let environment = environmentList[index];
      let value = environment[name];

      if (!value) {
        return undefined;
      }

      if (value.kind == LET && value.value == UNDEFINED) {
        throw `${name} is not defined`;
      }

      if (value.value == UNDEFINED) {
        return undefined;
      }

      return value.value;
    }
  }

  Environment.prototype.pushBlockEnvironment = function() {
    this.currentIndex++;
    this.blockEnvironment.push({});
  };

  Environment.prototype.popBlockEnvironment = function() {
    if (this.blockEnvironment.length == 0) {
      return;
    }

    this.currentIndex--;
    this.blockEnvironment.pop();
  };

  let checkBlockEnvironmentLengthAndDo = function(func, obj) {
    if (obj.blockEnvironment.length == 0) {
      return undefined;
    }

    return func.call(obj);
  };

  Environment.prototype.currentBlockEnvironment = function() {
    return checkBlockEnvironmentLengthAndDo(() => {
      return this.blockEnvironment[this.blockEnvironment.length - 1];
    }, this);
  };

  Environment.prototype.setDeclaration = function(
    key,
    kind,
    value = UNDEFINED
  ) {
    if (value != UNDEFINED) {
      if (this.currentBlockEnvironment()) {
        this.currentBlockEnvironment()[key] = new Variable(key, kind, value);
      } else {
        this.variableEnvironment[key] = new Variable(key, kind, value);
      }

      return;
    }
    if (kind == VAR) {
      this.variableEnvironment[key] = new Variable(key, kind, value);
    } else {
      if (this.currentBlockEnvironment()) {
        this.currentBlockEnvironment()[key] = new Variable(key, kind, value);
      } else {
        this.variableEnvironment[key] = new Variable(key, kind, value);
      }
    }
  };

  Environment.prototype.setValue = function(key, value, kind) {
    if (kind == VAR) {
      this.variableEnvironment[key] = new Variable(key, kind, value);
    } else {
      if (this.currentBlockEnvironment()) {
        this.currentBlockEnvironment()[key] = new Variable(key, kind, value);
      } else {
        this.variableEnvironment[key] = new Variable(key, kind, value);
      }
    }
  };

  Environment.prototype.findValue = function(key, kind) {
    if (kind == VAR) {
      return findValueFromSubEnvironment(this.variableEnvironment, key);
    }

    return findValueFromSubEnvironment(
      [this.variableEnvironment, ...this.blockEnvironment],
      key
    );
  };

  return Environment;
})();

const EnviromentManager = (function() {
  function EnviromentManager() {
    this.environments = [];
    this.environments.push(new Environment());
    this.currentIndex = 0;
  }

  EnviromentManager.prototype.pushEnviroment = function(
    isBlockStatement = false
  ) {
    if (isBlockStatement) {
      this.getCurrentEnviroment().pushBlockEnvironment();
    } else {
      if (this.currentIndex + 1 >= MAX_CALL_STACK) {
        throw "Maximum call stack size exceeded";
      }
      this.currentIndex++;
      this.environments.push(new Environment());
    }
  };
  EnviromentManager.prototype.popEnviroment = function() {
    if (this.currentIndex == 0) {
      return;
    }
    this.currentIndex--;
    this.environments.pop();
  };
  EnviromentManager.prototype.getCurrentEnviroment = function() {
    return this.environments[this.currentIndex];
  };
  EnviromentManager.prototype.addValue = function(key, value, kind) {
    this.environments[this.currentIndex].setValue(key, value, kind);
  };

  EnviromentManager.prototype.setDeclaration = function(key, value, kind) {
    this.environments[this.currentIndex].setDeclaration(key, kind, value);
  };

  EnviromentManager.prototype.pushBlockEnvironment = function() {
    let currentEnvironment = this.environments[this.currentIndex];
    currentEnvironment.pushBlockEnvironment();
  };

  EnviromentManager.prototype.popBlockEnvironment = function() {
    let currentEnvironment = this.environments[this.currentIndex];
    currentEnvironment.popBlockEnvironment();
  };
 
  EnviromentManager.prototype.findValue = function(name, kind) {
    for (let index = this.environments.length - 1; index >= 0; index--) {
      let environment = this.environments[index];
      let result = environment.findValue(name, kind);
      if (result != undefined) {
        return result;
      }
    }
    return undefined;
  };

  return EnviromentManager;
})();

const Executer = (function() {
  let Executer = function() {
    this.enviromentManager = new EnviromentManager();
    this.init();
  };
  Executer.prototype.init = function() {
    this.enviromentManager.addValue(
      "console",
      {
        log: function(args) {
          console.log(...args);
        }
      },
      VAR
    );
  };
  Executer.prototype.functionCall = function(callee, arguments) {
    if (callee.object) {
      let obj = this.enviromentManager.findValue(callee.object.name);
      let args = [];
      for (const arg of arguments) {
        args.push(this.enviromentManager.findValue(arg.name));
      }
      if (obj[callee.property.name]) {
        obj[callee.property.name](args);
      } else {
        throw `obj not has function ${callee.property.name} `;
      }
    } else {
      let func = this.enviromentManager.findValue(callee.name);
      if (func == undefined) {
        throw "no declared function";
      }
      this.enviromentManager.pushEnviroment();

      if (func["type"] == "BlockStatement") {
        this.enviromentManager.pushBlockEnvironment();
        this.parse(func);
        this.enviromentManager.popBlockEnvironment();
      }
      this.enviromentManager.popEnviroment();
    }
  };

  Executer.prototype.initDeclaration = function(value) {
    for (const iterator in value.body) {
      let node = value.body[iterator];
      switch (node.type) {
        case "VariableDeclaration":
          for (let dec of node.declarations) {
            this.enviromentManager.setDeclaration(
              dec.id.name,
              UNDEFINED,
              node.kind
            );
          }
          break;
        case "FunctionDeclaration":
          this.enviromentManager.setDeclaration(node.id.name, node.body, VAR);
          break;
        case "BlockStatement":
          this.initDeclaration(node);
          break;
        default:
          break;
      }
    }
  };

  Executer.prototype.parse = function(ast) {
    this.initDeclaration(ast);
    for (const iterator in ast.body) {
      let node = ast.body[iterator];

      switch (node.type) {
        case "ExpressionStatement":
          if (node.expression.type == "CallExpression") {
            this.functionCall(
              node.expression.callee,
              node.expression.arguments
            );
          }
          break;
        case "VariableDeclaration":
          for (let dec of node.declarations) {
            if (dec.init) {
              this.enviromentManager.addValue(
                dec.id.name,
                dec.init.value,
                node.kind
              );
            }
          }
          break;
        case "FunctionDeclaration":
          this.enviromentManager.addValue(node.id.name, node.body, LET);
          break;
        case "BlockStatement":
          this.enviromentManager.pushBlockEnvironment();
          this.parse(node, true);
          this.enviromentManager.popBlockEnvironment();
          break;
        default:
          break;
      }
    }
  };

  return Executer;
})();

var program = fs.readFileSync("./test.js").toString();
let ast = esprima.parseScript(program.toString());
new Executer().parse(ast);
