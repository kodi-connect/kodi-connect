// @flow

import mongoose, { Schema } from 'mongoose';

const ParamsSchema = new Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Object },
});

mongoose.model('Params', ParamsSchema);

export const ParamsModel = mongoose.model('Params');

async function getParam(name: string, defaultValue: ?any): Promise<?any> {
  const param = await ParamsModel.findOne({ name }).lean();
  return (param && param.value) || defaultValue;
}

async function setParam(name: string, value: any): Promise<void> {
  await ParamsModel.findOneAndUpdate({ name }, { name, value }, { upsert: true });
}

function createParam(name: string) {
  return {
    getValue: (defaultValue: ?any) => getParam(name, defaultValue),
    setValue: (value: any) => setParam(name, value),
  };
}

export const AmazonCredentials = createParam('AmazonCredentials');
export const AlexaSkills = createParam('AlexaSkills');
