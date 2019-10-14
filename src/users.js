// @flow

import _ from 'lodash';
import mongoose, { Schema } from 'mongoose';
import randtoken from 'rand-token';
import nodemailer from 'nodemailer';
import uuid from 'uuid/v4';
import bcrypt from 'bcryptjs';

import config from './config';
import createLogger from './logging';

import type { AmazonTokens } from './types';

const logger = createLogger('users');

type RegistrationResult = 'created' | 'email_duplicity';
type ConfirmationResult = 'confirmed' | 'already_confirmed' | 'not_found';

if (!config.hostUrl) throw new Error('HOST_URL not defined');

if (process.env.NODE_ENV !== 'development') {
  if (!config.emailAddress) throw new Error('EMAIL_ADDRESS not defined');
  if (!config.emailPassword) throw new Error('EMAIL_PASSWORD not defined');
}

const confirmationTokenLenght = 48;
const kodiDeviceTokenLength = 12;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date },
  activated: { type: Boolean },
  confirmationToken: { type: String },
  admin: { type: Boolean },
  devices: [{
    id: { type: String },
    name: { type: String },
    secret: { type: String },
  }],
  alexaSkillMessagingCredentials: {
    clientId: String,
    clientSecret: String,
  },
  amazonTokens: {
    access_token: String,
    token_type: String,
    refresh_token: String,
    expires_at: Number,
    region: String,
  },
});

UserSchema.index({ username: 1, 'devices.name': 1 }, { unique: true });

mongoose.model('Users', UserSchema);

export const UsersModel = mongoose.model('Users');

const mailSender = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.emailAddress,
    pass: config.emailPassword,
  },
});

function sendConfirmationEmail(username: string, confirmationToken: string) {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('***** CONFIRMATION EMAIL *****');
    logger.debug(`${config.hostUrl}/confirm/${confirmationToken}`);
    logger.debug('******************************');

    return new Promise(resolve => resolve());
  }

  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: 'kodi.connect.server@gmail.com',
      to: username,
      subject: 'Kodi Connect - Confirm account', // Subject line
      html: `<p>To confirm Kodi Connect registration, click <a href='${config.hostUrl}/confirm/${confirmationToken}'>here</a></p>`,
    };

    mailSender.sendMail(mailOptions, (error, info) => {
      if (error) reject(error);
      else resolve(info);
    });
  });
}

export async function getUser(username: string, password: string) {
  const user = await UsersModel.findOne({ username, activated: true }).lean();
  if (!user) return null;
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  return isPasswordCorrect && user;
}

export async function createUser(
  username: string,
  password: string,
): Promise<RegistrationResult> {
  const confirmationToken = randtoken.generate(confirmationTokenLenght);

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new UsersModel({
    username,
    password: hashedPassword,
    createdAt: new Date(),
    activated: false,
    confirmationToken,
  });

  try {
    await newUser.save();
  } catch (error) {
    logger.warn('Failed to create user', { error });
    if (error.code === 11000) {
      return 'email_duplicity';
    }

    throw error;
  }

  await sendConfirmationEmail(username, confirmationToken);

  return 'created';
}

export async function confirmUserRegistration(confirmationToken: string): Promise<ConfirmationResult> {
  const ret = await UsersModel.updateOne(
    { confirmationToken },
    { $set: { activated: true } },
  ).lean();

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
  return _.get(user, 'devices') || [];
}

export async function getDevice(username: string, secret: string) {
  const devices = await getDevices(username);
  if (!devices) return null;

  const device = devices.find(d => d.secret === secret);

  return device && device.id;
}

export async function addDevice(
  username: string,
  name: string,
): Promise<{ errorMessage?: string, devices?: Object[] }> {
  const user = await UsersModel.findOne({ username, activated: true });

  if (user.devices.find(d => d.name === name)) return { errorMessage: 'name_duplicity' };

  const id = uuid();
  const secret = randtoken.generate(kodiDeviceTokenLength, 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789');
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

export async function storeAlexaSkillMessagingCredentials(
  username: string,
  alexaSkillMessagingCredentials: { clientId: string, clientSecret: string },
) {
  await UsersModel.updateOne({ username }, { alexaSkillMessagingCredentials });
}

export async function getAlexaSkillMessagingCredentials(
  username: string,
): Promise<{ clientId: string, clientSecret: string}> {
  const user = await UsersModel.findOne({ username }).lean();
  return _.get(user, 'alexaSkillMessagingCredentials', {});
}

export async function storeAmazonTokens(
  username: string,
  amazonTokens: AmazonTokens,
) {
  await UsersModel.updateOne({ username }, { amazonTokens });
}

export async function getAmazonTokens(username: string): Promise<?AmazonTokens> {
  const user = await UsersModel.findOne({ username }, { amazonTokens: 1 });
  return user.amazonTokens;
}
