// @flow

import mongoose, { Schema } from 'mongoose';

const ParamsSchema = new Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Object },
});

mongoose.model('Params', ParamsSchema);

export const ParamsModel = mongoose.model('Params');

// async function getParam<T>(name: string, defaultValue: ?T): Promise<?T> {
//   const param = await ParamsModel.findOne({ name }).lean();
//   return (param && param.value) || defaultValue || undefined;
// }
//
// async function setParam<T>(name: string, value: T): Promise<void> {
//   await ParamsModel.findOneAndUpdate({ name }, { name, value }, { upsert: true });
// }

// function createParam<T>(name: string) {
//   return {
//     getValue: (defaultValue: ?T) => getParam(name, defaultValue),
//     setValue: (value: T) => setParam(name, value),
//   };
// }

class Param<T> {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  async getValue(defaultValue: T): Promise<T> {
    const param = await ParamsModel.findOne({ name: this.name }).lean();
    return (param && param.value) || defaultValue;
  }

  async setValue(value: T): Promise<void> {
    await ParamsModel.findOneAndUpdate({ name: this.name }, { name: this.name, value }, { upsert: true });
  }
}

export const AmazonCredentials: Param<?Object> = new Param('AmazonCredentials');
export const AlexaSkills: Param<Array<string>> = new Param('AlexaSkills');

// export const AmazonCredentials = createParam<Object>('AmazonCredentials');
// export const AlexaSkills = createParam('AlexaSkills');
