// @flow

import uuid from 'uuid/v4';
import AWS from 'aws-sdk';

type AwsCredentials = {
  AccessKeyId: string,
  SecretAccessKey: string,
  SessionToken: string,
  Expiration: Date,
}

export function getTemporaryAwsCredentials(accessToken: string): Promise<AwsCredentials> {
  const sts = new AWS.STS({
    apiVersion: '2011-06-15',
    region: 'us-east-1',
  });

  return new Promise((resolve, reject) => {
    sts.assumeRoleWithWebIdentity({
      RoleArn: 'arn:aws:iam::248582078972:role/kodiconnect-lambda',
      RoleSessionName: 'appl',
      ProviderId: 'www.amazon.com',
      DurationSeconds: 3600,
      WebIdentityToken: accessToken,
    }, (error, data) => {
      if (error) return reject(error);
      return resolve((data && data.Credentials) || {});
    });
  });
}

function createLambda(awsCredentials: AwsCredentials) {
  return new AWS.Lambda({
    apiVersion: '2015-03-31',
    credentials: {
      accessKeyId: awsCredentials.AccessKeyId,
      secretAccessKey: awsCredentials.SecretAccessKey,
      sessionToken: awsCredentials.SessionToken,
      expiration: awsCredentials.Expiration,
    },
    region: 'us-east-1',
  });
}

export function addLambdaPermission(awsCredentials: AwsCredentials, functionName: string, skillId: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    const lambda = createLambda(awsCredentials);
    lambda.addPermission({
      FunctionName: functionName,
      StatementId: uuid(),
      Action: 'lambda:InvokeFunction',
      Principal: 'alexa-connectedhome.amazon.com',
      EventSourceToken: skillId,
    }, (error, data) => {
      if (error) return reject(error);
      return resolve(data);
    });
  });
}

export function getLambdaConfiguration(awsCredentials: AwsCredentials) {
  return new Promise((resolve, reject) => {
    const lambda = createLambda(awsCredentials);
    lambda.getFunctionConfiguration({
      FunctionName: 'arn:aws:lambda:us-east-1:248582078972:function:test',
    }, (error, data) => {
      if (error) return reject(error);
      return resolve(data);
    });
  });
}
