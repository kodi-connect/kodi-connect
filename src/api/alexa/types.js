// @flow

export type AlexaRequest = {
    context: Object,
    event: Object,
};

export type AlexaHandlerRequest = AlexaRequest & {
    username: string,
    meta: {
        region?: string,
    },
};
