// @flow

import _ from 'lodash';
import mongoose, { Schema } from 'mongoose';
import randtoken from 'rand-token';
import nodemailer from 'nodemailer';
import uuid from 'uuid/v4';

type ConfirmationResult = 'confirmed' | 'already_confirmed' | 'not_found';

const hostUrl = process.env.HOST_URL || (process.env.NODE_ENV === 'development' && 'http://localhost:3005');
if (!hostUrl) throw new Error('HOST_URL not defined');
const emailAddress = process.env.EMAIL_ADDRESS;
if (!emailAddress) throw new Error('EMAIL_ADDRESS not defined');
const emailPassword = process.env.EMAIL_PASSWORD;
if (!emailPassword) throw new Error('EMAIL_PASSWORD not defined');

const confirmationTokenLenght = 48;
const kodiDeviceTokenLength = 12;

mongoose.model('Users', new Schema({
  username: { type: String },
  password: { type: String },
  createdAt: { type: Date },
  activated: { type: Boolean },
  confirmationToken: { type: String },
  devices: [new Schema({
    id: { type: String },
    name: { type: String },
    secret: { type: String },
  })],
}));

const UsersModel = mongoose.model('Users');

const mailSender = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailAddress,
    pass: emailPassword,
  },
});

function sendConfirmationEmail(username: string, confirmationToken: string) {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: 'kodi.connect.server@gmail.com',
      to: username,
      subject: 'Confirm account', // Subject line
      html: `<p>Click <a href="${hostUrl}/confirm/${confirmationToken}">here</a></p>`,
    };

    mailSender.sendMail(mailOptions, (error, info) => {
      if (error) reject(error);
      else resolve(info);
    });
  });
}

export function getUser(username: string, password: string) {
  return UsersModel.findOne({ username, password, activated: true }).lean();
}

export async function createUser(username: string, password: string) {
  const confirmationToken = randtoken.generate(confirmationTokenLenght);

  const newUser = new UsersModel({
    username,
    password,
    createdAt: new Date(),
    activated: false,
    confirmationToken,
  });

  await newUser.save();

  await sendConfirmationEmail(username, confirmationToken);
}

export async function confirmUserRegistration(confirmationToken: string): Promise<ConfirmationResult> {
  const ret = await UsersModel.updateOne({ confirmationToken }, { $set: { activated: true } }).lean();

  if (ret.n > 0) {
    if (ret.nModified > 0) {
      return 'confirmed';
    }
    return 'already_confirmed';
  }
  return 'not_found';
}

export async function getDevices(username: string) {
  const user = await UsersModel.findOne({ username, activated: true }).lean();
  return _.get(user, 'devices');
}

export async function getDevice(username: string, secret: string) {
  const devices = await getDevices(username);
  if (!devices) return null;

  const device = devices.find(d => d.secret === secret);

  return device && device.id;
}

export async function addDevice(username: string, name: string): Promise<{ error?: string, devices?: Object[] }> {
  const user = await UsersModel.findOne({ username, activated: true });

  if (user.devices.find(d => d.name === name)) return { error: 'name_duplicity' };

  const id = uuid();
  const secret = randtoken.generate(kodiDeviceTokenLength);
  const updatedDevices = [...user.devices, { id, name, secret }];
  user.devices = updatedDevices;

  await user.save();

  return { devices: updatedDevices };
}

export async function removeDevice(username: string, id: string) {
  const user = await UsersModel.findOne({ username, activated: true });
  const updatedDevices = user.devices.filter(d => d.id !== id);
  user.devices = updatedDevices;
  await user.save();
  return updatedDevices;
}

export async function isUsersDevice(username: string, id: string) {
  const devices = await getDevices(username);
  if (!devices) return false;

  const device = devices.find(d => d.id === id);

  return !!device;
}
