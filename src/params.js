// @flow

import mongoose, { Schema } from 'mongoose';

const ParamsSchema = new Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Object },
});

mongoose.model('Params', ParamsSchema);

export const ParamsModel = mongoose.model('Params');

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
