// Mock do chalk para testes (ESM puro com #imports, incompatível com babel-jest)
const fn = (str) => str;
fn.blueBright = fn;
fn.greenBright = fn;
fn.redBright = fn;
fn.yellowBright = fn;
fn.cyanBright = fn;

module.exports = fn;
module.exports.default = fn;
