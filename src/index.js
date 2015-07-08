import Hogan from 'hogan.js';
import loaderUtils from 'loader-utils';

const isPath = /\//;
const isDefinite = /^\w/;

function hgn(source) {
  let { root } = loaderUtils.parseQuery(this.query);
  this.cacheable();

  const { text, partials } = Hogan.compile(source);

  let partialNames = {};

  // using object map to eliminate duplicates
  for (let p in partials) {
    let name = partials[p].name;

    // skip if not a path
    if (!isPath.test(name)) { continue; }

    // skip if it's not a request
    if (!loaderUtils.isUrlRequest(name, root)) { continue; }

    // definite names (no prefixed metadata) are prefixed
    partialNames[name] = isDefinite.test(name) ?
      `${hgn.prefix || ''}${name}` :
      name;

    if (!isDefinite.test(partialNames[name])) {
      partialNames[name] = loaderUtils.urlToRequest(name, root);
    }
  }

  const loaders = this.loaders.slice(this.loaderIndex).map(obj => obj.request);

  const toLoad = Object.keys(partialNames).map(name => `"${name}": require("-!${loaders.join('!')}!${partialNames[name]}").template`);

  return `var Hogan = require("hogan.js"),
  preloads = {${toLoad.join(',')}},
  template = new Hogan.Template(${Hogan.compile(source, { asString: true })}, ${JSON.stringify(text)}, Hogan);
  function extend(target, source) { return Object.keys(source).reduce(function(t, p) { t[p] = source[p]; return t; }, Object.create(target)); }
  template.ri = function(context, partials, indent) {
    return this.r(context, extend(preloads, partials), indent);
  };
  module.exports = template.render.bind(template);
  module.exports.template = template;`;
}

export default hgn;
