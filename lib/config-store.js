'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function defaultConfigPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Preferences', 'proost-nodejs', 'config.json');
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'proost-nodejs', 'config.json');
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'proost-nodejs', 'config.json');
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

class ConfigStore {
  constructor({ filePath = defaultConfigPath(), defaults = {} } = {}) {
    this.filePath = filePath;
    this.defaults = { ...defaults };
  }

  _readRaw() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!plainObject(parsed)) {
        throw new Error('configuration root must be an object');
      }
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw new Error(`Unable to read CLI configuration: ${error.message}`);
    }
  }

  _write(data) {
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600
      });
      fs.renameSync(temporary, this.filePath);
      if (process.platform !== 'win32') fs.chmodSync(this.filePath, 0o600);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  get store() {
    return { ...this.defaults, ...this._readRaw() };
  }

  get(key) {
    if (!key) return this.store;
    let value = this.store;
    for (const segment of key.split('.')) {
      if (!plainObject(value) || !Object.prototype.hasOwnProperty.call(value, segment)) {
        return undefined;
      }
      value = value[segment];
    }
    return value;
  }

  set(key, value) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new TypeError('Configuration key is required');
    }
    const segments = key.split('.');
    const data = this._readRaw();
    let target = data;
    for (const segment of segments.slice(0, -1)) {
      if (!plainObject(target[segment])) target[segment] = {};
      target = target[segment];
    }
    target[segments.at(-1)] = value;
    this._write(data);
  }

  delete(key) {
    const segments = String(key).split('.');
    const data = this._readRaw();
    let target = data;
    for (const segment of segments.slice(0, -1)) {
      if (!plainObject(target[segment])) return;
      target = target[segment];
    }
    if (Object.prototype.hasOwnProperty.call(target, segments.at(-1))) {
      delete target[segments.at(-1)];
      this._write(data);
    }
  }
}

module.exports = { ConfigStore, defaultConfigPath };

