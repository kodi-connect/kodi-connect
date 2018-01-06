// @flow

import _ from 'lodash';
import mongoose, { Schema } from 'mongoose';

mongoose.model('Users', new Schema({
  username: { type: String },
  password: { type: String },
  devices: [new Schema({
    id: { type: String },
    name: { type: String },
    secret: { type: String },
  })],
}));

const UsersModel = mongoose.model('Users');

export function getUser(username: string, password: string) {
  return UsersModel.findOne({ username, password }).lean();
}

export async function getDevices(username: string) {
  const user = await UsersModel.findOne({ username }).lean();
  return _.get(user, 'devices');
}

export async function getDevice(username: string, secret: string) {
  const devices = await getDevices(username);
  if (!devices) return null;

  const device = devices.find(d => d.secret === secret);

  return device && device.id;
}

export async function isUsersDevice(username: string, id: string) {
  const devices = await getDevices(username);
  if (!devices) return false;

  const device = devices.find(d => d.id === id);

  return !!device;
}
