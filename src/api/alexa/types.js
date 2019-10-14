// @flow

export type AmazonAlexaRequest = {
    context: Object,
    event: Object,
};

export type AlexaRequest = AmazonAlexaRequest & {
    username: string,
    meta: {
        region?: string,
    },
};
