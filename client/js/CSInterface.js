/*
 * Minimal CSInterface for OGRID.
 * Only the CEP surface used by this panel, so there is no build step.
 */
function CSInterface() {}

CSInterface.prototype.getHostEnvironment = function () {
  try {
    return JSON.parse(window.__adobe_cep__.getHostEnvironment());
  } catch (e) {
    return null;
  }
};

CSInterface.prototype.evalScript = function (script, callback) {
  if (typeof callback !== "function") callback = function () {};
  try {
    window.__adobe_cep__.evalScript(script, callback);
  } catch (e) {
    callback("EvalScript error.");
  }
};

CSInterface.prototype.addEventListener = function (type, listener, obj) {
  try {
    window.__adobe_cep__.addEventListener(type, listener, obj);
  } catch (e) {}
};

CSInterface.prototype.removeEventListener = function (type, listener, obj) {
  try {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
  } catch (e) {}
};

CSInterface.prototype.getSystemPath = function (pathType) {
  try {
    return window.__adobe_cep__.getSystemPath(pathType);
  } catch (e) {
    return "";
  }
};

CSInterface.prototype.getExtensionID = function () {
  try {
    return window.__adobe_cep__.getExtensionId();
  } catch (e) {
    return "";
  }
};

CSInterface.prototype.requestOpenExtension = function (id, params) {
  try {
    window.__adobe_cep__.requestOpenExtension(id, params);
  } catch (e) {}
};
